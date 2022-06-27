import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { AbiRouterService } from './abi.router.service';
import { PairMetadata } from '../models/pair.metadata.model';
import { RouterComputeService } from './router.compute.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';

@Injectable()
export class RouterGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiRouterService,
        @Inject(forwardRef(() => RouterComputeService))
        private readonly routerComputeService: RouterComputeService,
    ) {
        super(cachingService, logger);
    }

    async getAllPairsAddress(): Promise<string[]> {
        return this.getData(
            this.getRouterCacheKey('pairsAddress'),
            () => this.abiService.getAllPairsAddress(),
            oneMinute(),
        );
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        return this.getData(
            this.getRouterCacheKey('pairsMetadata'),
            () => this.abiService.getPairsMetadata(),
            oneMinute(),
        );
    }

    async getTotalLockedValueUSD(): Promise<string> {
        return this.getData(
            this.getRouterCacheKey('totalLockedValueUSD'),
            () => this.routerComputeService.computeTotalLockedValueUSD(),
            oneMinute(),
        );
    }

    async getTotalVolumeUSD(time: string): Promise<string> {
        return this.getData(
            this.getRouterCacheKey(`totalVolumeUSD.${time}`),
            () => this.routerComputeService.computeTotalVolumeUSD(time),
            oneMinute(),
        );
    }

    async getTotalFeesUSD(time: string): Promise<string> {
        return this.getData(
            this.getRouterCacheKey(`totalFeesUSD.${time}`),
            () => this.routerComputeService.computeTotalFeesUSD(time),
            oneMinute(),
        );
    }

    private getRouterCacheKey(...args: any) {
        return generateCacheKeyFromParams('router', ...args);
    }
}
