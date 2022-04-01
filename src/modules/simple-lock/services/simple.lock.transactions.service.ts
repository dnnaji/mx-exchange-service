import {
    Address,
    BigUIntValue,
    BytesValue,
    GasLimit,
    TypedValue,
    U32Value,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { SimpleLockGetterService } from './simple.lock.getter.service';
import { SimpleLockService } from './simple.lock.service';

@Injectable()
export class SimpleLockTransactionService {
    constructor(
        private readonly simpleLockService: SimpleLockService,
        private readonly simpleLockGetter: SimpleLockGetterService,
        private readonly pairService: PairService,
        private readonly wrapService: WrapService,
        private readonly wrapTransaction: TransactionsWrapService,
        private readonly contextTransactions: ContextTransactionsService,
        private readonly elrondProxy: ElrondProxyService,
    ) {}

    async unlockTokens(
        sender: string,
        inputTokens: InputTokenModel,
    ): Promise<TransactionModel> {
        await this.validateInputUnlockTokens(inputTokens);

        const contract = await this.elrondProxy.getSimpleLockSmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(inputTokens.tokenID),
            new U32Value(inputTokens.nonce),
            new BigUIntValue(new BigNumber(inputTokens.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('unlockTokens'),
        ];

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.simpleLock.unlockTokens),
        );

        transaction.receiver = sender;

        return transaction;
    }

    async addLiquidityLockedTokenBatch(
        sender: string,
        inputTokens: InputTokenModel[],
        tolerance: number,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];
        const [wrappedTokenID] = await this.wrapService.getWrappedEgldTokenID();

        if (inputTokens.length !== 2) {
            throw new Error('Invalid input tokens length');
        }

        let [firstTokenInput, secondTokenInput] = inputTokens;

        switch (wrappedTokenID) {
            case firstTokenInput.tokenID:
                firstTokenInput = new InputTokenModel({
                    ...firstTokenInput,
                    tokenID: wrappedTokenID,
                });
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        firstTokenInput.amount,
                    ),
                );
                break;
            case secondTokenInput.tokenID:
                secondTokenInput = new InputTokenModel({
                    ...secondTokenInput,
                    tokenID: wrappedTokenID,
                });
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        secondTokenInput.amount,
                    ),
                );
            default:
                break;
        }

        transactions.push(
            await this.addLiquidityLockedToken(
                sender,
                [firstTokenInput, secondTokenInput],
                tolerance,
            ),
        );
        return transactions;
    }

    async addLiquidityLockedToken(
        sender: string,
        inputTokens: InputTokenModel[],
        tolerance: number,
    ): Promise<TransactionModel> {
        await this.validateInputAddLiquidityLockedToken(inputTokens);

        const [firstTokenInput, secondTokenInput] = inputTokens;
        const amount0 = new BigNumber(firstTokenInput.amount);
        const amount1 = new BigNumber(secondTokenInput.amount);

        const amount0Min = amount0.multipliedBy(1 - tolerance).integerValue();
        const amount1Min = amount1.multipliedBy(1 - tolerance).integerValue();

        const contract = await this.elrondProxy.getSimpleLockSmartContract();

        const endpointArgs: TypedValue[] = [
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            [firstTokenInput, secondTokenInput],
            this.addLiquidityLockedToken.name,
            endpointArgs,
            new GasLimit(gasConfig.simpleLock.addLiquidityLockedToken),
        );
    }

    async removeLiquidityLockedToken(
        sender: string,
        inputTokens: InputTokenModel,
        attributes: string,
        tolerance: number,
    ): Promise<TransactionModel[]> {
        await this.validateInputRemoveLiquidityLockedToken(inputTokens);

        const transactions = [];
        const [wrappedTokenID, contract] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.elrondProxy.getSimpleLockSmartContract(),
        ]);

        const LpProxyTokenAttributes = this.simpleLockService.decodeLpProxyTokenAttributes(
            {
                attributes: attributes,
                identifier: inputTokens.tokenID,
            },
        );

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            LpProxyTokenAttributes.lpTokenID,
        );
        const liquidityPosition = await this.pairService.getLiquidityPosition(
            pairAddress,
            inputTokens.amount,
        );

        const amount0Min = new BigNumber(
            liquidityPosition.firstTokenAmount.toString(),
        )
            .multipliedBy(1 - tolerance)
            .integerValue();
        const amount1Min = new BigNumber(
            liquidityPosition.secondTokenAmount.toString(),
        )
            .multipliedBy(1 - tolerance)
            .integerValue();

        const transactionArgs = [
            BytesValue.fromUTF8(inputTokens.tokenID),
            new U32Value(inputTokens.nonce),
            new BigUIntValue(new BigNumber(inputTokens.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8(this.removeLiquidityLockedToken.name),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.simpleLock.removeLiquidityLockedToken),
        );
        transaction.receiver = sender;
        transactions.push(transaction);

        switch (wrappedTokenID) {
            case LpProxyTokenAttributes.firstTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amount0Min.toFixed(),
                    ),
                );
                break;
            case LpProxyTokenAttributes.secondTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amount1Min.toFixed(),
                    ),
                );
        }

        return transactions;
    }

    private async validateInputUnlockTokens(
        inputTokens: InputTokenModel,
    ): Promise<void> {
        const lockedTokenID = await this.simpleLockGetter.getLockedTokenID();

        if (inputTokens.tokenID !== lockedTokenID || inputTokens.nonce === 0) {
            throw new Error('Invalid input token!');
        }
    }

    private async validateInputAddLiquidityLockedToken(
        inputTokens: InputTokenModel[],
    ): Promise<void> {
        const lockedTokenID = await this.simpleLockGetter.getLockedTokenID();

        if (inputTokens.length !== 2) {
            throw new Error('Invalid number of tokens');
        }

        const [firstToken, secondToken] = inputTokens;

        if (
            firstToken.tokenID !== lockedTokenID ||
            secondToken.tokenID !== lockedTokenID
        ) {
            throw new Error('Invalid tokens to send');
        }
    }

    private async validateInputRemoveLiquidityLockedToken(
        inputTokens: InputTokenModel,
    ): Promise<void> {
        const lockedLpTokenID = await this.simpleLockGetter.getLpProxyTokenID();

        if (
            inputTokens.tokenID !== lockedLpTokenID ||
            inputTokens.nonce === 0
        ) {
            throw new Error('Invalid input token!');
        }
    }
}
