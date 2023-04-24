import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RouterGetterService } from '../services/router.getter.service';
import { RouterGetterServiceStub } from '../mocks/router.getter.service.stub';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { RouterService } from '../services/router.service';
import { CachingModule } from 'src/services/caching/cache.module';
import { PairFilterArgs } from '../models/filter.args';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';

describe('RouterService', () => {
    let service: RouterService;

    const RouterGetterServiceProvider = {
        provide: RouterGetterService,
        useClass: RouterGetterServiceStub,
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
                ConfigModule,
                CachingModule,
            ],
            providers: [
                PairAbiServiceProvider,
                RouterGetterServiceProvider,
                RouterService,
            ],
        }).compile();

        service = module.get<RouterService>(RouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get all pairs', async () => {
        const allPairs = await service.getAllPairs(
            0,
            Number.MAX_VALUE,
            new PairFilterArgs(),
        );
        expect(allPairs).toEqual([
            new PairModel({
                address:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            }),
            new PairModel({
                address:
                    'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
            }),
            new PairModel({
                address:
                    'erd1a42xw92g8n78v6y4p3qj9ed2gjmr20kd9h2pkhuuuxf5tgn44q3sxy8unx',
            }),
        ]);
    });

    it('should get filtered pairs', async () => {
        const filteredPairs = await service.getAllPairs(0, Number.MAX_VALUE, {
            firstTokenID: 'TOK1-1111',
            issuedLpToken: true,
            address: null,
            secondTokenID: null,
            state: null,
        });
        expect(filteredPairs).toEqual([
            new PairModel({
                address:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            }),
            new PairModel({
                address:
                    'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
            }),
        ]);
    });
});
