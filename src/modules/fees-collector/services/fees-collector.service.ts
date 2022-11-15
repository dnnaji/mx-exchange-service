import { Injectable } from '@nestjs/common';
import {
    FeesCollectorModel,
    FeesCollectorTransactionModel,
    UserEntryFeesCollectorModel
} from '../models/fees-collector.model';
import { FeesCollectorGetterService } from './fees-collector.getter.service';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { WeekTimekeepingService } from '../../../submodules/week-timekeeping/services/week-timekeeping.service';
import {
    WeeklyRewardsSplittingService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.service';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { TransactionModel } from '../../../models/transaction.model';
import {
    WeekTimekeepingGetterService,
} from '../../../submodules/week-timekeeping/services/week-timekeeping.getter.service';
import {
    WeeklyRewardsSplittingGetterService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import { constantsConfig, elrondConfig, gasConfig } from '../../../config';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';


@Injectable()
export class FeesCollectorService {
    constructor(
        private readonly feesCollectorGetterService: FeesCollectorGetterService,
        private readonly elrondProxy: ElrondProxyService,
        private readonly weekTimekeepingService: WeekTimekeepingService,
        private readonly weeklyRewardsSplittingService: WeeklyRewardsSplittingService,
        private readonly weekTimekeepingGetter: WeekTimekeepingGetterService,
        private readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
    ) {
    }

    async claimRewardsBatch(
        scAddress: string,
        userAddress: string,
    ): Promise<FeesCollectorTransactionModel> {
        const currentWeek = await this.weekTimekeepingGetter.getCurrentWeek(scAddress);
        const lastActiveWeekForUser = await this.weeklyRewardsSplittingGetter.lastActiveWeekForUser(scAddress, userAddress);
        const transaction = await this.claimRewards(userAddress, gasConfig.feesCollector.claimRewards);
        const claimTransaction = new FeesCollectorTransactionModel(
            {
                transaction: transaction,
                count: 0
            }
        );
        if (lastActiveWeekForUser === 0) return claimTransaction;
        if (lastActiveWeekForUser >= currentWeek) return claimTransaction;

        claimTransaction.count = 1;
        return claimTransaction;
    }

    async claimRewards(
        sender: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getFeesCollectorContract();
        return contract.methodsExplicit
            .claimRewards()
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async getAccumulatedFees(scAddress: string, week: number, allTokens: string[]): Promise<EsdtTokenPayment[]> {
        const accumulatedFees: EsdtTokenPayment[] = []

        for (const token of allTokens) {
            accumulatedFees.push(new EsdtTokenPayment({
                tokenID: token,
                tokenType: 0,
                amount: await this.feesCollectorGetterService.getAccumulatedFees(scAddress, week, token),
                nonce: 0,
            }))
        }
        return accumulatedFees
    }

    async getAccumulatedLockedFees(scAddress: string, week: number, allTokens: string[]): Promise<EsdtTokenPayment[]> {
        const promisesList = [];
        for (const token of allTokens) {
            promisesList.push(this.feesCollectorGetterService.getAccumulatedLockedFees(scAddress, week, token));
        }

        const accumulatedFees = (await Promise.all(promisesList)).flat();
        return accumulatedFees
    }

    async feesCollector(
        scAddress: string
    ): Promise<FeesCollectorModel> {

        const [
            time,
            allToken,
            currentWeek
        ] = await Promise.all([
            this.weekTimekeepingService.getWeeklyTimekeeping(scAddress),
            this.feesCollectorGetterService.getAllTokens(scAddress),
            this.weekTimekeepingGetter.getCurrentWeek(scAddress),
        ])
        const lastWeek = currentWeek - 1;
        return new FeesCollectorModel({
            address: scAddress,
            time: time,
            startWeek: currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS,
            endWeek: lastWeek,
            allTokens: allToken,
        });
    }

    async userFeesCollector(
        scAddress: string,
        userAddress: string,
    ): Promise<UserEntryFeesCollectorModel> {
        const [
            time,
            lastActiveWeekForUser,
            currentWeek
        ] = await Promise.all([
            this.weekTimekeepingService.getWeeklyTimekeeping(scAddress),
            this.weeklyRewardsSplittingGetter.lastActiveWeekForUser(scAddress, userAddress),
            this.weekTimekeepingGetter.getCurrentWeek(scAddress),
            ]);
        const lastWeek = currentWeek - 1;
        return new UserEntryFeesCollectorModel({
            address: scAddress,
            userAddress: userAddress,
            startWeek: lastActiveWeekForUser === 0 ? currentWeek : Math.max(currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS, lastActiveWeekForUser),
            endWeek: lastWeek,
            time: time,
        });
    }

    async getUserCurrentClaimProgress(scAddress: string, userAddress: string): Promise<ClaimProgress> {
        return await this.weeklyRewardsSplittingGetter.currentClaimProgress(scAddress, userAddress);
    }

    getWeeklyRewardsSplit(scAddress: string, startWeek: number, endWeek: number): GlobalInfoByWeekModel[] {
        const modelsList = []
        for (let week = startWeek; week <= endWeek; week++) {
            modelsList.push(this.weeklyRewardsSplittingService.getGlobalInfoByWeek(scAddress, week))
        }
        return modelsList;
    }

    getUserWeeklyRewardsSplit(scAddress: string, userAddress: string, startWeek: number, endWeek: number): UserInfoByWeekModel[] {
        const modelsList = []
        for (let week = startWeek; week <= endWeek; week++) {
            modelsList.push(this.weeklyRewardsSplittingService.getUserInfoByWeek(scAddress, userAddress, week))
        }
        return modelsList;
    }
}
