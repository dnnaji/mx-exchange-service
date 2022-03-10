import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { StakedUserPosition } from '../models/metabonding.model';
import { MetabondingAbiService } from './metabonding.abi.service';

@Injectable()
export class MetabondingGetterService {
    constructor(
        private readonly abiService: MetabondingAbiService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getMetabondingCacheKey(key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                MetabondingGetterService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getLockedAssetTokenID(): Promise<string> {
        return this.getData(
            'lockedAssetTokenID',
            () => this.abiService.getLockedAssetTokenID(),
            oneHour(),
        );
    }

    async getTotalLockedAssetSupply(): Promise<string> {
        return this.getData(
            'lockedAssetTokenSupply',
            () => this.abiService.getTotalLockedAssetSupply(),
            oneMinute(),
        );
    }

    async getStakedAmountForUser(userAddress: string): Promise<string> {
        return this.getData(
            `${userAddress}.stakedAmount`,
            () => this.abiService.getStakedAmountForUser(userAddress),
            oneMinute(),
        );
    }

    async getUserStakedPosition(
        userAddress: string,
    ): Promise<StakedUserPosition> {
        return this.getData(
            `${userAddress}.stakedPosition`,
            () => this.abiService.getUserStakedPosition(userAddress),
            oneSecond(),
        );
    }

    private getMetabondingCacheKey(...args: any) {
        return generateCacheKeyFromParams('metabonding', ...args);
    }
}
