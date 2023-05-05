import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';

export abstract class FarmSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'farm';
    }

    async setFarmTokenID(farmAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('farmTokenID', farmAddress),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setFarmingTokenID(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('farmingTokenID', farmAddress),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setFarmedTokenID(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('farmedTokenID', farmAddress),
            value,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async setFarmTokenSupply(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('farmTokenSupply', farmAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setFarmingTokenReserve(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('farmingTokenReserve', farmAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setRewardsPerBlock(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('rewardsPerBlock', farmAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setPenaltyPercent(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('penaltyPercent', farmAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setMinimumFarmingEpochs(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('minimumFarmingEpochs', farmAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setState(farmAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('state', farmAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setProduceRewardsEnabled(
        farmAddress: string,
        value: boolean,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('produceRewardsEnabled', farmAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setRewardPerShare(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('rewardPerShare', farmAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setRewardReserve(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('rewardReserve', farmAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setLastRewardBlockNonce(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('lastRewardBlocknonce', farmAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setUndistributedFees(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('undistributedFees', farmAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setCurrentBlockFee(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('currentBlockFee', farmAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setDivisionSafetyConstant(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('divisionSafetyConstant', farmAddress),
            value,
            oneHour(),
        );
    }

    async setLockedRewardAprMuliplier(
        farmAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('aprMultiplier', farmAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setFarmedTokenPriceUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('farmedTokenPriceUSD', farmAddress),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setFarmingTokenPriceUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('farmingTokenPriceUSD', farmAddress),
            value,
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async setTotalValueLockedUSD(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('totalValueLockedUSD', farmAddress),
            value,
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }

    async setUnlockedRewardsAPR(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('unlockedRewardsAPR', farmAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setLockedRewardsAPR(
        farmAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('lockedRewardsAPR', farmAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setFarmAPR(farmAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('farmAPR', farmAddress),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }
}
