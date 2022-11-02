import { forwardRef, Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { AbiProxyService } from './services/proxy-abi.service';
import { ProxyFarmModule } from './services/proxy-farm/proxy-farm.module';
import { ProxyPairModule } from './services/proxy-pair/proxy-pair.module';
import { ProxyService } from './services/proxy.service';
import { CachingModule } from '../../services/caching/cache.module';
import { ProxyGetterService } from './services/proxy.getter.service';
import { LockedAssetModule } from '../locked-asset-factory/locked-asset.module';
import { WrappedLpTokenResolver } from './wrappedLpToken.resolver';
import { WrappedFarmTokenResolver } from './wrappedFarmToken.resolver';
import { TokenModule } from '../tokens/token.module';
import { FarmModule } from '../farm/farm.module';
import { ProxyModuleV1 } from './v1/proxy.v1.module';
import { ProxyModuleV2 } from './v2/proxy.v2.module';
import { ProxyTransactionResolver } from './proxy.transaction.resolver';
import { ProxyQueryResolver } from './proxy.query.resolver';
import { ProxyResolver } from './proxy.resolver';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        LockedAssetModule,
        TokenModule,
        forwardRef(() => ProxyPairModule),
        forwardRef(() => ProxyFarmModule),
        forwardRef(() => ProxyModuleV1),
        forwardRef(() => ProxyModuleV2),
        FarmModule,
    ],
    providers: [
        AbiProxyService,
        ProxyService,
        ProxyGetterService,
        ProxyResolver,
        ProxyQueryResolver,
        ProxyTransactionResolver,
        WrappedLpTokenResolver,
        WrappedFarmTokenResolver,
    ],
    exports: [ProxyService, AbiProxyService, ProxyGetterService],
})
export class ProxyModule {}
