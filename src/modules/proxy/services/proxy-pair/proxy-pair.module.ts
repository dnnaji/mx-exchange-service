import { forwardRef, Module } from '@nestjs/common';
import { PairModule } from 'src/modules/pair/pair.module';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { TransactionsProxyPairService } from './proxy-pair-transactions.service';
import { ProxyPairGetterService } from './proxy-pair.getter.service';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { WrappingModule } from 'src/modules/wrapping/wrap.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ProxyModule } from '../../proxy.module';
import { TokenModule } from 'src/modules/tokens/token.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        PairModule,
        WrappingModule,
        TokenModule,
        forwardRef(() => ProxyModule),
    ],
    providers: [
        AbiProxyPairService,
        ProxyPairGetterService,
        TransactionsProxyPairService,
    ],
    exports: [
        ProxyPairGetterService,
        AbiProxyPairService,
        TransactionsProxyPairService,
    ],
})
export class ProxyPairModule {}
