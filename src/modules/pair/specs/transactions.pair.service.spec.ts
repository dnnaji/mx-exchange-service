import { Test, TestingModule } from '@nestjs/testing';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { PairTransactionService } from '../services/pair.transactions.service';
import { PairService } from '../services/pair.service';
import { PairGetterService } from '../services/pair.getter.service';
import { PairGetterServiceStub } from '../mocks/pair-getter-service-stub.service';
import { MXProxyServiceMock } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigService } from '@nestjs/config';
import { Address } from '@multiversx/sdk-core';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { CachingModule } from 'src/services/caching/cache.module';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WrapService } from 'src/modules/wrapping/services/wrap.service';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';

describe('TransactionPairService', () => {
    let service: PairTransactionService;

    const MXProxyServiceProvider = {
        provide: MXProxyService,
        useClass: MXProxyServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
    };

    const logTransports: Transport[] = [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                nestWinstonModuleUtilities.format.nestLike(),
            ),
        }),
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                CachingModule,
            ],
            providers: [
                ConfigService,
                ApiConfigService,
                MXProxyServiceProvider,
                PairService,
                PairGetterServiceProvider,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                WrapService,
                WrapTransactionsService,
                TokenGetterServiceProvider,
                PairTransactionService,
            ],
        }).compile();

        service = module.get<PairTransactionService>(PairTransactionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get add liquidity batch transaction EGLD first token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';
        const pairAddress =
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u';
        const liquidityBatchTransactions = await service.addLiquidityBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress,
                tokens: [
                    {
                        tokenID: 'EGLD',
                        nonce: 0,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'TOK2-2222',
                        nonce: 0,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            },
        );

        const [wrapEgldTransaction, addLiquidity] = liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(firstTokenAmount);
        expect(addLiquidity.data).toEqual(
            Buffer.from(
                `MultiESDTNFTTransfer@${Address.fromString(
                    pairAddress,
                ).hex()}@02@544f4b312d31313131@@0a@544f4b322d32323232@@09@6164644c6971756964697479@09@08`,
            ).toString('base64'),
        );
    });

    it('should get add liquidity batch transaction EGLD second token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';
        const pairAddress =
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u';
        const liquidityBatchTransactions = await service.addLiquidityBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress,
                tokens: [
                    {
                        tokenID: 'TOK2-2222',
                        nonce: 0,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'EGLD',
                        nonce: 0,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            },
        );

        const [wrapEgldTransaction, addLiquidity] = liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(secondTokenAmount);
        expect(addLiquidity.data).toEqual(
            Buffer.from(
                `MultiESDTNFTTransfer@${Address.fromString(
                    pairAddress,
                ).hex()}@02@544f4b312d31313131@@09@544f4b322d32323232@@0a@6164644c6971756964697479@08@09`,
            ).toString('base64'),
        );
    });
});
