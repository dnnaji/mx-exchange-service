import { Inject } from '@nestjs/common';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';

export interface ICachingOptions {
    baseKey: string;
    remoteTtl: number;
    localTtl?: number;
}

export function GetOrSetCache(cachingOptions: ICachingOptions) {
    const cachingServiceInjector = Inject(CachingService);

    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        cachingServiceInjector(target, 'cachingService');
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const cacheKey = generateCacheKeyFromParams(
                cachingOptions.baseKey,
                propertyKey,
                ...args,
            );

            const cachingService: CachingService = this.cachingService;

            return await cachingService.getOrSet(
                cacheKey,
                () => originalMethod.apply(this, args),
                cachingOptions.remoteTtl,
                cachingOptions.localTtl,
            );
        };
        return descriptor;
    };
}
