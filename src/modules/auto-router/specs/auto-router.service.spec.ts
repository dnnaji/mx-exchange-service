import { Test, TestingModule } from '@nestjs/testing';
import { AutoRouterService } from '../services/auto-router.service';
import { PairGetterServiceStub } from 'src/modules/pair/mocks/pair-getter-service-stub.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { AutoRouterComputeService } from '../services/auto-router.compute.service';
import { AutoRouterTransactionService } from '../services/auto-router.transactions.service';
import { PairTransactionService } from 'src/modules/pair/services/pair.transactions.service';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { MXProxyServiceMock } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterTransactionService } from 'src/modules/router/services/router.transactions.service';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { RouterService } from 'src/modules/router/services/router.service';
import { AutoRouteModel } from '../models/auto-route.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { Address } from '@multiversx/sdk-core';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { RemoteConfigGetterServiceMock } from 'src/modules/remote-config/mocks/remote-config.getter.mock';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { encodeTransactionData } from 'src/helpers/helpers';
import { gasConfig } from 'src/config';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WrapService } from 'src/modules/wrapping/services/wrap.service';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';

describe('AutoRouterService', () => {
    let service: AutoRouterService;

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
    };

    const MXProxyServiceProvider = {
        provide: MXProxyService,
        useClass: MXProxyServiceMock,
    };

    const RemoteConfigGetterServiceProvider = {
        provide: RemoteConfigGetterService,
        useClass: RemoteConfigGetterServiceMock,
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
                CommonAppModule,
                CachingModule,
            ],
            providers: [
                RouterService,
                RouterAbiServiceProvider,
                ContextGetterServiceProvider,
                MXProxyServiceProvider,
                TokenGetterServiceProvider,
                PairGetterServiceProvider,
                PairService,
                PairTransactionService,
                WrapAbiServiceProvider,
                WrapService,
                WrapTransactionsService,
                RouterTransactionService,
                RemoteConfigGetterServiceProvider,
                AutoRouterService,
                AutoRouterComputeService,
                AutoRouterTransactionService,
            ],
            exports: [],
        }).compile();

        service = module.get<AutoRouterService>(AutoRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get swap data for simple swap with default inputs', async () => {
        const swap = await service.swap({
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK1-1111',
            tolerance: 0.01,
        });

        expect(swap).toEqual(
            new AutoRouteModel({
                swapType: 0,
                tokenInID: 'USDC-1111',
                tokenOutID: 'TOK1-1111',
                tokenInExchangeRate: '1246248446862',
                tokenOutExchangeRate: '802408221665557136369171',
                tokenInExchangeRateDenom: '0.000001246248446862',
                tokenOutExchangeRateDenom: '802408.221665557136369171',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '200',
                amountIn: '1000000000000000000',
                amountOut: '1246248446862',
                intermediaryAmounts: ['1000000000000000000', '1246248446862'],
                tokenRoute: ['USDC-1111', 'TOK1-1111'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                        firstToken: Tokens('TOK1-1111'),
                        secondToken: Tokens('USDC-1111'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000',
                            reserves1: '800000000000000000000000',
                            totalSupply: '1000000000000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                ],
                tolerance: 0.01,
                maxPriceDeviationPercent: 1,
                tokensPriceDeviationPercent: undefined,
            }),
        );
    });

    it('should get swap data for simple swap with amountIn', async () => {
        const swap = await service.swap({
            amountIn: '2000000000000000000',
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK1-1111',
            tolerance: 0.01,
        });
        expect(swap).toEqual(
            new AutoRouteModel({
                swapType: 0,
                tokenInID: 'USDC-1111',
                tokenOutID: 'TOK1-1111',
                tokenInExchangeRate: '1246246893729',
                tokenOutExchangeRate: '802409221665070560617502',
                tokenInExchangeRateDenom: '0.000001246246893729',
                tokenOutExchangeRateDenom: '802409.221665070560617502',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '200',
                amountIn: '2000000000000000000',
                amountOut: '2492493787459',
                intermediaryAmounts: ['2000000000000000000', '2492493787459'],
                tokenRoute: ['USDC-1111', 'TOK1-1111'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                        firstToken: Tokens('TOK1-1111'),
                        secondToken: Tokens('USDC-1111'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000',
                            reserves1: '800000000000000000000000',
                            totalSupply: '1000000000000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                ],
                tolerance: 0.01,
                maxPriceDeviationPercent: 1,
                tokensPriceDeviationPercent: undefined,
            }),
        );
    });

    it('should get swap data for multi swap with amountOut', async () => {
        const swap = await service.swap({
            amountOut: '500000000000000000',
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK2-2222',
            tolerance: 0.01,
        });

        expect(swap).toEqual(
            new AutoRouteModel({
                swapType: 1,
                tokenInID: 'USDC-1111',
                tokenOutID: 'TOK2-2222',
                tokenInExchangeRate: '1240641874999',
                tokenOutExchangeRate: '806034376358608727601852',
                tokenInExchangeRateDenom: '0.000001240641874999',
                tokenOutExchangeRateDenom: '806034.376358608727601852',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '100',
                amountIn: '407047360061097407438935',
                amountOut: '500000000000000000',
                intermediaryAmounts: [
                    '403017188179304363800926',
                    '334336342360414578',
                    '500000000000000000',
                ],
                tokenRoute: ['USDC-1111', 'TOK1-1111', 'TOK2-2222'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                        firstToken: Tokens('TOK1-1111'),
                        secondToken: Tokens('USDC-1111'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000',
                            reserves1: '800000000000000000000000',
                            totalSupply: '1000000000000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                        firstToken: Tokens('TOK1-1111'),
                        secondToken: Tokens('TOK2-2222'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000',
                            reserves1: '2000000000000000000',
                            totalSupply: '1000000000000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                ],
                tolerance: 0.01,
                maxPriceDeviationPercent: 1,
                tokensPriceDeviationPercent: undefined,
            }),
        );
    });

    it('should get a wrap tx + a fixed input simple swap tx', async () => {
        const transactions = await service.getTransactions(
            Address.Zero().bech32(),
            new AutoRouteModel({
                swapType: 0,
                tokenInID: 'EGLD',
                tokenOutID: 'TOK1-1111',
                tokenInExchangeRate: '4960273038901078',
                tokenOutExchangeRate: '201601805416248751341',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '200',
                amountIn: '1000000000000000000',
                amountOut: '4960273038901078',
                intermediaryAmounts: [
                    '1000000000000000000',
                    '4960273038901078',
                ],
                tokenRoute: ['USDC-1111', 'TOK1-1111'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                    }),
                ],
                tolerance: 0.01,
            }),
        );
        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '1000000000000000000',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.wrapeGLD,
                data: encodeTransactionData('wrapEgld'),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.pairs.swapTokensFixedInput.default,
                data: encodeTransactionData(
                    'ESDTTransfer@TOK1-1111@01000000000000000000@swapTokensFixedInput@TOK1-1111@4911161424654532',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
        ]);
    });

    it('should get a fixed output multi swap tx + unwrap tx', async () => {
        const transactions = await service.getTransactions(
            Address.Zero().bech32(),
            new AutoRouteModel({
                swapType: 1,
                tokenInID: 'USDC-1111',
                tokenOutID: 'EGLD',
                tokenInExchangeRate: '4962567499999999',
                tokenOutExchangeRate: '201508594089652181902',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '100',
                amountIn: '101761840015274351860',
                amountOut: '500000000000000000',
                intermediaryAmounts: [
                    '503014183917413680',
                    '626881033727',
                    '500000000000000000',
                ],
                tokenRoute: ['USDC-1111', 'TOK1-1111', 'TOK2-2222'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                    }),
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                    }),
                ],
                tolerance: 0.01,
            }),
        );
        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: 2 * gasConfig.router.multiPairSwapMultiplier,
                data: encodeTransactionData(
                    'ESDTTransfer@USDC-1111@508044325756587816@multiPairSwap@erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx@swapTokensFixedOutput@TOK1-1111@630015438895@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u@swapTokensFixedOutput@TOK2-2222@500000000000000000',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.wrapeGLD,
                data: encodeTransactionData(
                    'ESDTTransfer@TOK1-1111@500000000000000000@unwrapEgld',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
        ]);
    });
});
