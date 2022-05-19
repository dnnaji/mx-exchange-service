import {
    Address,
    Balance,
    BigUIntValue,
    BytesValue,
    GasLimit,
    Interaction,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { constantsConfig, elrondConfig, gasConfig } from '../../../config';
import { TransactionModel } from '../../../models/transaction.model';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { MultiSwapTokensArgs } from '../models/multi-swap-tokens.args';
import { RouterGetterService } from './router.getter.service';

@Injectable()
export class TransactionRouterService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly routerGetterService: RouterGetterService,
        private readonly pairGetterService: PairGetterService,
        private readonly contextTransactionsService: ContextTransactionsService,
        private readonly transactionsWrapService: TransactionsWrapService,
    ) {}

    async createPair(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const checkPairExists = await this.checkPairExists(
            firstTokenID,
            secondTokenID,
        );

        if (checkPairExists) {
            throw new Error('Pair already exists');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();

        const createPairInteraction: Interaction = contract.methods.createPair([
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
            BytesValue.fromHex(Address.Zero().hex()),
        ]);

        const transaction = createPairInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.router.createPair));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async issueLpToken(
        pairAddress: string,
        lpTokenName: string,
        lpTokenTicker: string,
    ): Promise<TransactionModel> {
        const lpTokeID = await this.pairGetterService.getLpTokenID(pairAddress);
        if (lpTokeID !== 'undefined') {
            throw new Error('LP Token already issued');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();
        const issueLPTokenInteraction: Interaction = contract.methods.issueLpToken(
            [
                BytesValue.fromHex(new Address(pairAddress).hex()),
                BytesValue.fromUTF8(lpTokenName),
                BytesValue.fromUTF8(lpTokenTicker),
            ],
        );

        const transaction = issueLPTokenInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.router.issueToken));
        transaction.setValue(Balance.egld(constantsConfig.ISSUE_LP_TOKEN_COST));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setLocalRoles(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const setLocalRolesInteraction: Interaction = contract.methods.setLocalRoles(
            [BytesValue.fromHex(new Address(pairAddress).hex())],
        );

        const transaction = setLocalRolesInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.router.setLocalRoles));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setState(
        address: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [BytesValue.fromHex(new Address(address).hex())];

        const stateInteraction: Interaction = enable
            ? contract.methods.resume(args)
            : contract.methods.pause(args);

        const transaction = stateInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.router.setState));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setFee(
        pairAddress: string,
        feeToAddress: string,
        feeTokenID: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [
            BytesValue.fromHex(new Address(pairAddress).hex()),
            BytesValue.fromHex(new Address(feeToAddress).hex()),
            BytesValue.fromUTF8(feeTokenID),
        ];

        const setFeeInteraction: Interaction = enable
            ? contract.methods.setFeeOn([args])
            : contract.methods.setFeeOff([args]);

        const transaction = setFeeInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.router.setFee));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    private async checkPairExists(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<boolean> {
        const pairsMetadata = await this.routerGetterService.getPairsMetadata();
        for (const pair of pairsMetadata) {
            if (
                (pair.firstTokenID === firstTokenID &&
                    pair.secondTokenID === secondTokenID) ||
                (pair.firstTokenID === secondTokenID &&
                    pair.secondTokenID === firstTokenID)
            ) {
                return true;
            }
        }
        return false;
    }

    async multiPairSwap(
        sender: string,
        args: MultiSwapTokensArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        const contract = await this.elrondProxy.getRouterSmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenRoute[0]),
            new BigUIntValue(new BigNumber(args.intermediaryAmounts[0])),
            BytesValue.fromUTF8('multiPairSwap'),
        ];

        if (args.tokenInID === elrondConfig.EGLDIdentifier) {
            transactions.push(
                await this.transactionsWrapService.wrapEgld(
                    sender,
                    args.intermediaryAmounts[0],
                ),
            );
        }

        for (const [index, address] of args.addressRoute.entries()) {
            const amountOutMin = new BigNumber(1)
                .dividedBy(new BigNumber(1).plus(args.tolerance))
                .multipliedBy(args.intermediaryAmounts[index + 1])
                .integerValue();
            transactionArgs.push(
                ...[
                    BytesValue.fromHex(Address.fromString(address).hex()),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(args.tokenRoute[index + 1]),
                    new BigUIntValue(amountOutMin),
                ],
            );
        }

        transactions.push(
            this.contextTransactionsService.esdtTransfer(
                contract,
                transactionArgs,
                new GasLimit(
                    args.addressRoute.length *
                        gasConfig.router.multiPairSwapMultiplier,
                ),
            ),
        );

        if (args.tokenOutID === elrondConfig.EGLDIdentifier) {
            transactions.push(
                await this.transactionsWrapService.unwrapEgld(
                    sender,
                    args.intermediaryAmounts[
                        args.intermediaryAmounts.length - 1
                    ],
                ),
            );
        }

        return transactions;
    }
}
