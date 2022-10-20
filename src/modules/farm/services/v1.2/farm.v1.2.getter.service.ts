import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { Logger } from 'winston';
import { FarmMigrationConfig } from '../../models/farm.model';
import { FarmGetterService } from '../farm.getter.service';
import { FarmV12AbiService } from './farm.v1.2.abi.service';
import { FarmV12ComputeService } from './farm.v1.2.compute.service';

@Injectable()
export class FarmV12GetterService extends FarmGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly abiService: FarmV12AbiService,
        @Inject(forwardRef(() => FarmV12ComputeService))
        protected readonly computeService: FarmV12ComputeService,
        protected readonly tokenGetter: TokenGetterService,
        protected readonly apiService: ElrondApiService,
    ) {
        super(
            cachingService,
            logger,
            abiService,
            computeService,
            tokenGetter,
            apiService,
        );
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'farmingTokenReserve'),
            () => this.abiService.getFarmingTokenReserve(farmAddress),
            oneMinute(),
        );
    }

    async getUndistributedFees(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'undistributedFees'),
            () => this.abiService.getUndistributedFees(farmAddress),
            oneMinute(),
        );
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'currentBlockFee'),
            () => this.abiService.getCurrentBlockFee(farmAddress),
            oneMinute(),
        );
    }

    async getLockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        return this.getData(
            this.getCacheKey(farmAddress, 'aprMultiplier'),
            () => this.abiService.getLockedRewardAprMuliplier(farmAddress),
            oneMinute(),
        );
    }

    async getLockedFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'lockedFarmingTokenReserve'),
            () =>
                this.computeService.computeLockedFarmingTokenReserve(
                    farmAddress,
                ),
            oneMinute(),
        );
    }

    async getUnlockedFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'unlockedFarmingTokenReserve'),
            () =>
                this.computeService.computeUnlockedFarmingTokenReserve(
                    farmAddress,
                ),
            oneMinute(),
        );
    }

    async getLockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'lockedFarmingTokenReserveUSD'),
            () =>
                this.computeService.computeLockedFarmingTokenReserveUSD(
                    farmAddress,
                ),
            oneMinute(),
        );
    }

    async getUnlockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'unlockedFarmingTokenReserveUSD'),
            () =>
                this.computeService.computeUnlockedFarmingTokenReserveUSD(
                    farmAddress,
                ),
            oneMinute(),
        );
    }

    async getUnlockedRewardsAPR(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'unlockedRewardsAPR'),
            () => this.computeService.computeUnlockedRewardsAPR(farmAddress),
            oneMinute(),
        );
    }

    async getLockedRewardsAPR(farmAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(farmAddress, 'lockedRewardsAPR'),
            () => this.computeService.computeLockedRewardsAPR(farmAddress),
            oneMinute(),
        );
    }

    async getFarmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig> {
        return this.getData(
            this.getCacheKey(farmAddress, 'migrationConfig'),
            () => this.abiService.getFarmMigrationConfiguration(farmAddress),
            oneHour(),
        );
    }
}
