import { Module } from '@nestjs/common';
import { ProxyModule } from '../proxy/proxy.module';
import { LockedAssetResolver } from './locked-asset.resolver';
import { LockedAssetService } from './services/locked-asset.service';
import { AbiLockedAssetService } from './services/abi-locked-asset.service';
import { TransactionsLockedAssetService } from './services/transaction-locked-asset.service';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        ProxyModule,
    ],
    providers: [
        AbiLockedAssetService,
        TransactionsLockedAssetService,
        LockedAssetService,
        LockedAssetResolver,
    ],
    exports: [LockedAssetService],
})
export class LockedAssetModule {}
