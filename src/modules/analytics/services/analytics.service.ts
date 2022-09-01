import { Inject, Injectable } from '@nestjs/common';
import { awsConfig } from '../../../config';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../../utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CachingService } from '../../../services/caching/cache.service';
import { oneMinute } from '../../../helpers/helpers';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { HistoricDataModel } from '../models/analytics.model';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';

@Injectable()
export class AnalyticsAWSGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
    ) {
        super(cachingService, logger);
    }

    async getHistoricData(
        series: string,
        metric: string,
        time: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'historicData',
            series,
            metric,
            time,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                    time,
                }),
            oneMinute() * 5,
        );
    }

    async getClosingValue(
        series: string,
        metric: string,
        time: string,
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'closingValue',
            series,
            metric,
            time,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getClosingValue({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                    time,
                }),
            oneMinute() * 5,
        );
    }

    async getCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'completeValues',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getLatestCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestCompleteValues',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getLatestCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getSumCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'sumCompleteValues',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getSumCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getLatestValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestValues',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getLatestValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getMarketValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'marketValues',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getMarketValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getMarketCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'marketCompleteValues',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getMarketCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getValues24hSum(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'values24hSum',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getValues24hSum({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getValues24h(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('values24h', series, metric);
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getValues24h({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getLatestHistoricData(
        time: string,
        series: string,
        metric: string,
        start: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestHistoricData',
            time,
            series,
            metric,
            start,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getLatestHistoricData({
                    table: awsConfig.timestream.tableName,
                    time,
                    series,
                    metric,
                    start,
                }),
            oneMinute() * 5,
        );
    }

    async getLatestBinnedHistoricData(
        time: string,
        series: string,
        metric: string,
        bin: string,
        start: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestBinnedHistoricData',
            time,
            series,
            metric,
            bin,
            start,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getLatestBinnedHistoricData({
                    table: awsConfig.timestream.tableName,
                    time,
                    series,
                    metric,
                    bin,
                    start,
                }),
            oneMinute() * 5,
        );
    }

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
