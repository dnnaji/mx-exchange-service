import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
    constantsConfig,
    mxConfig,
    scAddress,
    tokenProviderUSD,
} from 'src/config';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { ITokenComputeService } from '../interfaces';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { ElasticQuery, QueryType } from '@multiversx/sdk-nestjs-elastic';
import { ElasticService } from 'src/helpers/elastic.service';
import moment from 'moment';
import { ESLogsService } from 'src/services/elastic-search/services/es.logs.service';

@Injectable()
export class TokenComputeService implements ITokenComputeService {
    constructor(
        private readonly pairAbi: PairAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairCompute: PairComputeService,
        @Inject(forwardRef(() => PairService))
        private readonly pairService: PairService,
        private readonly routerAbi: RouterAbiService,
        private readonly dataApi: MXDataApiService,
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly elasticService: ElasticService,
        private readonly logsElasticService: ESLogsService,
    ) {}

    async getEgldPriceInUSD(): Promise<string> {
        return await this.pairCompute.firstTokenPrice(scAddress.WEGLD_USDC);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async tokenPriceDerivedEGLD(tokenID: string): Promise<string> {
        return await this.computeTokenPriceDerivedEGLD(tokenID, []);
    }

    async computeTokenPriceDerivedEGLD(
        tokenID: string,
        pairsNotToVisit: PairMetadata[],
    ): Promise<string> {
        if (tokenID === tokenProviderUSD) {
            return new BigNumber('1').toFixed();
        }

        const pairsMetadata = await this.routerAbi.pairsMetadata();
        let tokenPairs: PairMetadata[] = [];
        for (const pair of pairsMetadata) {
            if (
                pair.firstTokenID === tokenID ||
                pair.secondTokenID === tokenID
            ) {
                tokenPairs.push(pair);
            }
        }

        if (tokenPairs.length > 1) {
            const states = await Promise.all(
                tokenPairs.map((pair) => this.pairAbi.state(pair.address)),
            );
            if (states.find((state) => state === 'Active')) {
                tokenPairs = tokenPairs.filter((pair, index) => {
                    return states[index] === 'Active';
                });
            }
        }

        tokenPairs = tokenPairs.filter(
            (pair) =>
                pairsNotToVisit.find(
                    (pairNotToVisit) => pairNotToVisit.address === pair.address,
                ) === undefined,
        );

        pairsNotToVisit.push(...tokenPairs);

        let largestLiquidityEGLD = new BigNumber(0);
        let priceSoFar = '0';

        if (tokenID === constantsConfig.USDC_TOKEN_ID) {
            const eglpPriceUSD = await this.getEgldPriceInUSD();
            priceSoFar = new BigNumber(1).dividedBy(eglpPriceUSD).toFixed();
        } else {
            for (const pair of tokenPairs) {
                const liquidity = await this.pairAbi.totalSupply(pair.address);
                if (new BigNumber(liquidity).isGreaterThan(0)) {
                    if (pair.firstTokenID === tokenID) {
                        const [
                            secondTokenDerivedEGLD,
                            secondTokenReserves,
                            firstTokenPrice,
                            secondToken,
                        ] = await Promise.all([
                            this.computeTokenPriceDerivedEGLD(
                                pair.secondTokenID,
                                pairsNotToVisit,
                            ),
                            this.pairAbi.secondTokenReserve(pair.address),
                            this.pairCompute.firstTokenPrice(pair.address),
                            this.pairService.getSecondToken(pair.address),
                        ]);
                        const egldLocked = new BigNumber(secondTokenReserves)
                            .times(`1e-${secondToken.decimals}`)
                            .times(secondTokenDerivedEGLD)
                            .times(`1e${mxConfig.EGLDDecimals}`)
                            .integerValue();

                        if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                            largestLiquidityEGLD = egldLocked;
                            priceSoFar = new BigNumber(firstTokenPrice)
                                .times(secondTokenDerivedEGLD)
                                .toFixed();
                        }
                    }
                    if (pair.secondTokenID === tokenID) {
                        const [
                            firstTokenDerivedEGLD,
                            firstTokenReserves,
                            secondTokenPrice,
                            firstToken,
                        ] = await Promise.all([
                            this.computeTokenPriceDerivedEGLD(
                                pair.firstTokenID,
                                pairsNotToVisit,
                            ),
                            this.pairAbi.firstTokenReserve(pair.address),
                            this.pairCompute.secondTokenPrice(pair.address),
                            this.pairService.getFirstToken(pair.address),
                        ]);
                        const egldLocked = new BigNumber(firstTokenReserves)
                            .times(`1e-${firstToken.decimals}`)
                            .times(firstTokenDerivedEGLD)
                            .times(`1e${mxConfig.EGLDDecimals}`)
                            .integerValue();
                        if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                            largestLiquidityEGLD = egldLocked;
                            priceSoFar = new BigNumber(secondTokenPrice)
                                .times(firstTokenDerivedEGLD)
                                .toFixed();
                        }
                    }
                }
            }
        }
        return priceSoFar;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async tokenPriceDerivedUSD(tokenID: string): Promise<string> {
        return await this.computeTokenPriceDerivedUSD(tokenID);
    }

    async computeTokenPriceDerivedUSD(tokenID: string): Promise<string> {
        const [egldPriceUSD, derivedEGLD, usdcPrice] = await Promise.all([
            this.getEgldPriceInUSD(),
            this.computeTokenPriceDerivedEGLD(tokenID, []),
            this.dataApi.getTokenPrice('USDC'),
        ]);

        return new BigNumber(derivedEGLD)
            .times(egldPriceUSD)
            .times(usdcPrice)
            .toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async tokenPrevious24hPrice(tokenID: string): Promise<string> {
        return await this.computeTokenPrevious24hPrice(tokenID);
    }

    async computeTokenPrevious24hPrice(tokenID: string): Promise<string> {
        const values24h = await this.analyticsQuery.getValues24h({
            series: tokenID,
            metric: 'priceUSD',
        });

        return values24h[0]?.value ?? undefined;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenPrevious7dPrice(tokenID: string): Promise<string> {
        return await this.computeTokenPrevious7dPrice(tokenID);
    }

    async computeTokenPrevious7dPrice(tokenID: string): Promise<string> {
        const values7d = await this.analyticsQuery.getLatestCompleteValues({
            series: tokenID,
            metric: 'priceUSD',
            time: '7 days',
        });

        return values7d[0]?.value ?? undefined;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenPriceChange24h(tokenID: string): Promise<string> {
        return await this.computePriceChange24h(tokenID);
    }

    async computePriceChange24h(tokenID: string): Promise<string> {
        const [currentPrice, previous24hPrice] = await Promise.all([
            this.tokenPriceDerivedUSD(tokenID),
            this.tokenPrevious24hPrice(tokenID),
        ]);

        const currentPriceBN = new BigNumber(currentPrice);
        const previous24hPriceBN = new BigNumber(previous24hPrice);

        if (previous24hPriceBN.isZero()) {
            if (currentPriceBN.isZero()) {
                return '0';
            }

            return undefined;
        }

        const difference = currentPriceBN.minus(previous24hPriceBN);

        return difference
            .dividedBy(previous24hPriceBN)
            .multipliedBy(100)
            .toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenVolumeChange24h(tokenID: string): Promise<string> {
        return await this.computeVolumeChange24h(tokenID);
    }

    async computeVolumeChange24h(tokenID: string): Promise<string> {
        const [currentVolume, previous24hVolume] = await Promise.all([
            this.tokenVolumeUSD24h(tokenID),
            this.tokenPrevious24hVolumeUSD(tokenID),
        ]);

        const currentVolumeBN = new BigNumber(currentVolume);
        const previous24hVolumeBN = new BigNumber(previous24hVolume);

        if (previous24hVolumeBN.isZero()) {
            if (currentVolumeBN.isZero()) {
                return '0';
            }

            return undefined;
        }

        const difference = currentVolumeBN.minus(previous24hVolumeBN);

        return difference
            .dividedBy(previous24hVolumeBN)
            .multipliedBy(100)
            .toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenTradeChange24h(tokenID: string): Promise<string> {
        return await this.computeTradeChange24h(tokenID);
    }

    async computeTradeChange24h(tokenID: string): Promise<string> {
        const [currentSwaps, previous24hSwaps] = await Promise.all([
            this.tokenSwapCount(tokenID),
            this.tokenPrevious24hSwapCount(tokenID),
        ]);

        const currentSwapsBN = new BigNumber(currentSwaps);
        const previous24hSwapsBN = new BigNumber(previous24hSwaps);

        if (previous24hSwapsBN.isZero()) {
            if (currentSwapsBN.isZero()) {
                return '0';
            }

            return undefined;
        }

        const difference = currentSwapsBN.minus(previous24hSwapsBN);

        return difference
            .dividedBy(previous24hSwapsBN)
            .multipliedBy(100)
            .toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenVolumeUSD24h(tokenID: string): Promise<string> {
        return await this.computeTokenVolumeUSD24h(tokenID);
    }

    async computeTokenVolumeUSD24h(tokenID: string): Promise<string> {
        const valuesLast2Days = await this.tokenLast2DaysVolumeUSD(tokenID);
        return valuesLast2Days.current;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenPrevious24hVolumeUSD(tokenID: string): Promise<string> {
        return await this.computeTokenPrevious24hVolumeUSD(tokenID);
    }

    async computeTokenPrevious24hVolumeUSD(tokenID: string): Promise<string> {
        const valuesLast2Days = await this.tokenLast2DaysVolumeUSD(tokenID);
        return valuesLast2Days.previous;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenLast2DaysVolumeUSD(
        tokenID: string,
    ): Promise<{ previous: string; current: string }> {
        return await this.computeTokenLast2DaysVolumeUSD(tokenID);
    }

    async computeTokenLast2DaysVolumeUSD(
        tokenID: string,
    ): Promise<{ previous: string; current: string }> {
        const values48h = await this.analyticsQuery.getHourlySumValues({
            series: tokenID,
            metric: 'volumeUSD',
            time: '2 days',
        });

        if (!values48h || !Array.isArray(values48h)) {
            return {
                previous: '0',
                current: '0',
            };
        }

        const splitTime = moment().utc().subtract(1, 'day').startOf('hour');

        const previousDayValues = values48h.filter((item) =>
            moment.utc(item.timestamp).isSameOrBefore(splitTime),
        );

        const currentDayValues = values48h.filter((item) =>
            moment.utc(item.timestamp).isAfter(splitTime),
        );

        return {
            previous: previousDayValues
                .reduce(
                    (acc, item) => acc.plus(new BigNumber(item.value)),
                    new BigNumber(0),
                )
                .toFixed(),
            current: currentDayValues
                .reduce(
                    (acc, item) => acc.plus(new BigNumber(item.value)),
                    new BigNumber(0),
                )
                .toFixed(),
        };
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenLiquidityUSD(tokenID: string): Promise<string> {
        return await this.computeTokenLiquidityUSD(tokenID);
    }

    async computeTokenLiquidityUSD(tokenID: string): Promise<string> {
        const values24h = await this.analyticsQuery.getLatestCompleteValues({
            series: tokenID,
            metric: 'lockedValueUSD',
            time: '1 day',
        });

        if (!values24h || values24h.length === 0) {
            return undefined;
        }

        return values24h[values24h.length - 1]?.value ?? undefined;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenCreatedAt(tokenID: string): Promise<string> {
        return await this.computeTokenCreatedAtTimestamp(tokenID);
    }

    async computeTokenCreatedAtTimestamp(tokenID: string): Promise<string> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [QueryType.Match('_id', tokenID)];

        const tokens = await this.elasticService.getList(
            'tokens',
            '',
            elasticQueryAdapter,
        );

        if (tokens.length > 0) {
            const createdAtTimestamp = tokens[0]._source.timestamp;
            return createdAtTimestamp.toString();
        }

        return undefined;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenSwapCount(tokenID: string): Promise<number> {
        return await this.computeTokenSwapCount(tokenID);
    }

    async computeTokenSwapCount(tokenID: string): Promise<number> {
        const allSwapsCount = await this.allTokensSwapsCount();

        const currentTokenSwapCount = allSwapsCount.find(
            (elem) => elem.tokenID === tokenID,
        );

        return currentTokenSwapCount ? currentTokenSwapCount.swapsCount : 0;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenPrevious24hSwapCount(tokenID: string): Promise<number> {
        return await this.computeTokenPrevious24hSwapCount(tokenID);
    }

    async computeTokenPrevious24hSwapCount(tokenID: string): Promise<number> {
        const allSwapsCount = await this.allTokensSwapsCountPrevious24h();

        const currentTokenSwapCount = allSwapsCount.find(
            (elem) => elem.tokenID === tokenID,
        );

        return currentTokenSwapCount ? currentTokenSwapCount.swapsCount : 0;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async allTokensSwapsCount(): Promise<
        { tokenID: string; swapsCount: number }[]
    > {
        const end = moment.utc().unix();
        const start = moment.unix(end).subtract(1, 'day').unix();

        return await this.computeAllTokensSwapsCount(start, end);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async allTokensSwapsCountPrevious24h(): Promise<
        { tokenID: string; swapsCount: number }[]
    > {
        const end = moment.utc().subtract(1, 'day').unix();
        const start = moment.utc().subtract(2, 'days').unix();

        return await this.computeAllTokensSwapsCount(start, end);
    }

    async computeAllTokensSwapsCount(
        start: number,
        end: number,
    ): Promise<{ tokenID: string; swapsCount: number }[]> {
        const allSwapsCount = await this.logsElasticService.getTokenSwapsCount(
            start,
            end,
        );

        const result = [];

        for (const entry of allSwapsCount.entries()) {
            result.push({
                tokenID: entry[0],
                swapsCount: entry[1],
            });
        }

        return result;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenTrendingScore(tokenID: string): Promise<string> {
        return await this.computeTokenTrendingScore(tokenID);
    }

    async computeTokenTrendingScore(tokenID: string): Promise<string> {
        const [volumeChange, priceChange, tradeChange] = await Promise.all([
            this.tokenVolumeChange24h(tokenID),
            this.tokenPriceChange24h(tokenID),
            this.tokenTradeChange24h(tokenID),
        ]);

        const volumeScore = new BigNumber(0.4).multipliedBy(volumeChange);
        const priceScore = new BigNumber(0.3).multipliedBy(priceChange);
        const tradeScore = new BigNumber(0.3).multipliedBy(tradeChange);

        if (volumeScore.isNaN() || priceScore.isNaN() || tradeScore.isNaN()) {
            return new BigNumber('-Infinity').toFixed();
        }

        const trendingScore = volumeScore.plus(priceScore).plus(tradeScore);

        return trendingScore.toFixed();
    }
}
