import { Inject, Injectable } from '@nestjs/common';
import { cacheConfig, scAddress } from '../../config';
import {
    CommunityDistributionModel,
    DistributionModel,
} from './models/distribution.model';
import { AbiDistributionService } from './abi-distribution.service';
import { CachingService } from 'src/services/caching/cache.service';
import * as Redis from 'ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../utils/generate-log-message';

@Injectable()
export class DistributionService {
    private redisClient: Redis.Redis;
    constructor(
        private abiService: AbiDistributionService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.redisClient = this.cachingService.getClient();
    }

    async getDistributionInfo(): Promise<DistributionModel> {
        return new DistributionModel({
            address: scAddress.distributionAddress,
        });
    }

    async getCommunityDistribution(): Promise<CommunityDistributionModel> {
        const cacheKey = this.getDistributionCacheKey('communityDistribution');
        try {
            const getCommunityDistribution = () =>
                this.abiService.getCommunityDistribution();
            return this.cachingService.getOrSet(
                this.redisClient,
                cacheKey,
                getCommunityDistribution,
                cacheConfig.default,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                DistributionService.name,
                this.getCommunityDistribution.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getDistributedLockedAssets(userAddress: string): Promise<string> {
        const distributedLockedAssets = await this.abiService.getDistributedLockedAssets(
            userAddress,
        );
        return distributedLockedAssets.toFixed();
    }

    private getDistributionCacheKey(...args: any) {
        return generateCacheKeyFromParams('distribution', ...args);
    }
}
