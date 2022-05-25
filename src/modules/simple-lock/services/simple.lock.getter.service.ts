import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { SimpleLockAbiService } from './simple.lock.abi.service';

@Injectable()
export class SimpleLockGetterService {
    constructor(
        private readonly abiService: SimpleLockAbiService,
        private readonly cachingService: CachingService,
        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getSimpleLockCacheKey(key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                SimpleLockGetterService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getLockedTokenID(): Promise<string> {
        return await this.getData(
            'lockedTokenID',
            () => this.abiService.getLockedTokenID(),
            oneHour(),
        );
    }

    async getLpProxyTokenID(): Promise<string> {
        return await this.getData(
            'lpProxyTokenID',
            () => this.abiService.getLpProxyTokenID(),
            oneHour(),
        );
    }

    async getFarmProxyTokenID(): Promise<string> {
        return await this.getData(
            'farmProxyTokenID',
            () => this.abiService.getFarmProxyTokenID(),
            oneHour(),
        );
    }

    async getLockedToken(): Promise<NftCollection> {
        const tokenID = await this.getLockedTokenID();
        return await this.contextGetter.getNftCollectionMetadata(tokenID);
    }

    async getLpProxyToken(): Promise<NftCollection> {
        const tokenID = await this.getLpProxyTokenID();
        return await this.contextGetter.getNftCollectionMetadata(tokenID);
    }

    async getFarmProxyToken(): Promise<NftCollection> {
        const tokenID = await this.getFarmProxyTokenID();
        return await this.contextGetter.getNftCollectionMetadata(tokenID);
    }

    async getIntermediatedPairs(): Promise<string[]> {
        return await this.getData(
            'intermediatedPairs',
            () => this.abiService.getKnownLiquidityPools(),
            oneMinute(),
        );
    }

    async getIntermediatedFarms(): Promise<string[]> {
        return await this.getData(
            'intermediatedFarms',
            () => this.abiService.getKnownFarms(),
            oneMinute(),
        );
    }

    private getSimpleLockCacheKey(...args: any) {
        return generateCacheKeyFromParams('simpleLock', ...args);
    }
}
