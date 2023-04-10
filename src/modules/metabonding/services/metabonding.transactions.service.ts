import { Address, BigUIntValue, TokenPayment } from '@multiversx/sdk-core';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { mxConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { MetabondingAbiService } from './metabonding.abi.service';

@Injectable()
export class MetabondingTransactionService {
    constructor(
        private readonly metabondingAbi: MetabondingAbiService,
        private readonly mxProxy: MXProxyService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async stakeLockedAsset(
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        try {
            await this.validateInputToken(inputToken);
        } catch (error) {
            const logMessage = generateLogMessage(
                MetabondingTransactionService.name,
                this.stakeLockedAsset.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const [contract, userEntry] = await Promise.all([
            this.mxProxy.getMetabondingStakingSmartContract(),
            this.metabondingAbi.userEntry(sender),
        ]);

        const gasLimit =
            userEntry.tokenNonce > 0
                ? gasConfig.metabonding.stakeLockedAsset.withTokenMerge
                : gasConfig.metabonding.stakeLockedAsset.default;

        return contract.methodsExplicit
            .stakeLockedAsset()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    inputToken.tokenID,
                    inputToken.nonce,
                    new BigNumber(inputToken.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unstake(unstakeAmount: string): Promise<TransactionModel> {
        const contract =
            await this.mxProxy.getMetabondingStakingSmartContract();
        return contract.methodsExplicit
            .unstake([new BigUIntValue(new BigNumber(unstakeAmount))])
            .withGasLimit(gasConfig.metabonding.unstake)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unbond(sender: string): Promise<TransactionModel> {
        const contract =
            await this.mxProxy.getMetabondingStakingSmartContract();
        await this.pubSub.publish('deleteCacheKeys', [`${sender}.userEntry`]);
        return contract.methodsExplicit
            .unbond([])
            .withGasLimit(gasConfig.metabonding.unbond)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    private async validateInputToken(
        inputToken: InputTokenModel,
    ): Promise<void> {
        const lockedAssetTokenID =
            await this.metabondingAbi.lockedAssetTokenID();

        if (
            lockedAssetTokenID !== inputToken.tokenID ||
            inputToken.nonce === 0
        ) {
            throw new Error('invalid input tokens');
        }
    }
}
