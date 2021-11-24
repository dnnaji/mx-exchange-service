import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { ContextService } from 'src/services/context/context.service';
import { HistoricDataModel, PairDayDataModel } from '../models/analytics.model';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsPairService {
    constructor(
        private readonly pairGetterService: PairGetterService,
        private readonly analyticsService: AnalyticsService,
        private readonly context: ContextService,
    ) {}

    async getClosingLockedValueUSD(
        pairAddress: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getLatestCompleteValues(
            pairAddress,
            'lockedValueUSD',
        );
    }

    async getDailyVolumesUSD(
        pairAddress: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getSumCompleteValues(
            pairAddress,
            'volumeUSD',
        );
    }

    async getClosingPriceUSD(tokenID: string): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getLatestCompleteValues(
            tokenID,
            'priceUSD',
        );
    }

    async getPairDayDatas(pairAddress: string): Promise<PairDayDataModel[]> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);
        const [
            lockedValuesUSD,
            volumesUSD,
            firstTokenPricesUSD,
            secondTokenPricesUSD,
        ] = await Promise.all([
            this.getClosingLockedValueUSD(pairAddress),
            this.getDailyVolumesUSD(pairAddress),
            this.getClosingPriceUSD(firstTokenID),
            this.getClosingPriceUSD(secondTokenID),
        ]);
        const pairDayDatas: PairDayDataModel[] = [];
        for (const lockedValueUSD of lockedValuesUSD) {
            const volumeUSD = volumesUSD.find(v => {
                return v.timestamp === lockedValueUSD.timestamp;
            });
            const firstTokenPriceUSD = firstTokenPricesUSD.find(
                price => price.timestamp === lockedValueUSD.timestamp,
            );
            const secondTokenPriceUSD = secondTokenPricesUSD.find(
                price => price.timestamp === lockedValueUSD.timestamp,
            );

            pairDayDatas.push(
                new PairDayDataModel({
                    timestamp: lockedValueUSD.timestamp,
                    address: pairAddress,
                    lockedValueUSD: new BigNumber(
                        lockedValueUSD.value,
                    ).toFixed(),
                    firstTokenPriceUSD:
                        firstTokenPriceUSD !== undefined
                            ? new BigNumber(firstTokenPriceUSD.value).toFixed()
                            : '0',
                    secondTokenPriceUSD:
                        secondTokenPriceUSD !== undefined
                            ? new BigNumber(secondTokenPriceUSD.value).toFixed()
                            : '0',
                    volumeUSD24h:
                        volumeUSD !== undefined
                            ? new BigNumber(volumeUSD.value).toFixed()
                            : '0',
                }),
            );
        }
        return pairDayDatas;
    }

    async getPairsDayDatas(): Promise<PairDayDataModel[]> {
        const pairAddresses = await this.context.getAllPairsAddress();
        const pairsDayDatas: PairDayDataModel[] = [];
        for (const pairAddress of pairAddresses) {
            const pairDayDatas = await this.getPairDayDatas(pairAddress);
            pairsDayDatas.push(...pairDayDatas);
        }

        return pairsDayDatas;
    }
}
