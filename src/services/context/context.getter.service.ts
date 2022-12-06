import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute, oneMonth } from 'src/helpers/helpers';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { GenericGetterService } from '../generics/generic.getter.service';

@Injectable()
export class ContextGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly apiService: ElrondApiService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'context';
    }

    async getCurrentEpoch(): Promise<number> {
        const cacheKey = this.getCacheKey('currentEpoch');
        return await this.getData(
            cacheKey,
            async () => (await this.apiService.getStats()).epoch,
            oneMinute(),
        );
    }

    async getBlocksCountInEpoch(epoch: number): Promise<number> {
        const cacheKey = this.getCacheKey('blocksCountInEpoch', epoch);
        let ttl = oneMonth()
        const currentEpoch = await this.getCurrentEpoch();
        if (currentEpoch === epoch) {
           ttl = oneMinute();
        }
        return await this.getData(
            cacheKey,
            async () => await this.apiService.getBlockCountInEpoch(epoch),
            ttl,
        );
    }

    async getShardCurrentBlockNonce(shardID: number): Promise<number> {
        const cacheKey = this.getCacheKey('shardBlockNonce', shardID);
        return await this.getData(
            cacheKey,
            () => this.apiService.getCurrentBlockNonce(shardID),
            oneMinute(),
        );
    }
}
