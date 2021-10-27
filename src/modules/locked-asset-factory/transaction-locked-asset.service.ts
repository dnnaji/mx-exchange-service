import { Inject, Injectable } from '@nestjs/common';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { constantsConfig, gasConfig } from '../../config';
import {
    BigUIntValue,
    BytesValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { TransactionModel } from '../../models/transaction.model';
import { BigNumber } from 'bignumber.js';
import { UnlockAssetsArs } from './models/locked-asset.args';
import { ContextService } from '../../services/context/context.service';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { LockedAssetService } from './locked-asset.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateLogMessage } from 'src/utils/generate-log-message';

@Injectable()
export class TransactionsLockedAssetService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly context: ContextService,
        private readonly lockedAssetService: LockedAssetService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async unlockAssets(
        sender: string,
        args: UnlockAssetsArs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.lockedTokenID),
            new U32Value(args.lockedTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('unlockAssets'),
        ];

        const transaction = this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.unlockAssets),
        );

        transaction.receiver = sender;

        return transaction;
    }

    async mergeLockedAssetTokens(
        sender: string,
        tokens: InputTokenModel[],
    ): Promise<TransactionModel> {
        if (
            gasConfig.defaultMergeLockedAsset * tokens.length >
            constantsConfig.MAX_GAS_LIMIT
        ) {
            throw new Error('Number of merge tokens exeeds maximum gas limit!');
        }
        try {
            await this.validateInputTokens(tokens);
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsLockedAssetService.name,
                this.mergeLockedAssetTokens.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();

        return this.context.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            tokens,
            'mergeLockedAssetTokens',
            [],
            new GasLimit(gasConfig.addLiquidity),
        );
    }

    async validateInputTokens(tokens: InputTokenModel[]): Promise<void> {
        const lockedAssetTokenID = await this.lockedAssetService.getLockedTokenID();

        for (const lockedAssetToken of tokens) {
            if (
                lockedAssetToken.tokenID !== lockedAssetTokenID ||
                lockedAssetToken.nonce < 1
            ) {
                throw new Error('Invalid locked asset to merge!');
            }
        }
    }
}
