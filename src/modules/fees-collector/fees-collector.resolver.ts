import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
    FeesCollectorModel,
    FeesCollectorTransactionModel,
    UserEntryFeesCollectorModel,
} from './models/fees-collector.model';
import { FeesCollectorService } from './services/fees-collector.service';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { scAddress } from '../../config';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from '../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { TransactionModel } from '../../models/transaction.model';
import { FeesCollectorAbiService } from './services/fees-collector.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { FeesCollectorTransactionService } from './services/fees-collector.transaction.service';

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver {
    constructor(
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly feesCollectorService: FeesCollectorService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {}

    @ResolveField()
    async lastGlobalUpdateWeek(
        @Parent() parent: FeesCollectorModel,
    ): Promise<number> {
        return this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeek(
            parent.address,
        );
    }

    @ResolveField(() => [GlobalInfoByWeekModel])
    async undistributedRewards(
        @Parent() parent: FeesCollectorModel,
    ): Promise<GlobalInfoByWeekModel[]> {
        return this.feesCollectorService.getWeeklyRewardsSplit(
            parent.address,
            parent.startWeek,
            parent.endWeek,
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedFees(
        @Parent() parent: FeesCollectorModel,
    ): Promise<EsdtTokenPayment[]> {
        return this.feesCollectorService.getAccumulatedFees(
            parent.address,
            parent.time.currentWeek,
            parent.allTokens,
        );
    }

    @ResolveField()
    async lockedTokenId(): Promise<string> {
        return this.feesCollectorAbi.lockedTokenID();
    }

    @ResolveField()
    async lockedTokensPerBlock(): Promise<string> {
        return this.feesCollectorAbi.lockedTokensPerBlock();
    }

    @Query(() => FeesCollectorModel)
    async feesCollector(): Promise<FeesCollectorModel> {
        return this.feesCollectorService.feesCollector(scAddress.feesCollector);
    }
}

@Resolver(() => UserEntryFeesCollectorModel)
export class UserEntryFeesCollectorResolver {
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorTransaction: FeesCollectorTransactionService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {}

    @ResolveField(() => [UserInfoByWeekModel])
    async undistributedRewards(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<UserInfoByWeekModel[]> {
        return this.feesCollectorService.getUserWeeklyRewardsSplit(
            parent.address,
            parent.userAddress,
            parent.startWeek,
            parent.endWeek,
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedRewards(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<EsdtTokenPayment[]> {
        return this.feesCollectorService.getUserAccumulatedRewards(
            parent.address,
            parent.userAddress,
            parent.time.currentWeek,
        );
    }

    @ResolveField()
    async lastActiveWeekForUser(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<number> {
        return this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
            parent.address,
            parent.userAddress,
        );
    }

    @ResolveField(() => ClaimProgress)
    async claimProgress(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<ClaimProgress> {
        return this.weeklyRewardsSplittingAbi.currentClaimProgress(
            parent.address,
            parent.userAddress,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => UserEntryFeesCollectorModel)
    async userFeesCollector(
        @AuthUser() user: UserAuthResult,
    ): Promise<UserEntryFeesCollectorModel> {
        return this.feesCollectorService.userFeesCollector(
            scAddress.feesCollector,
            user.address,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => FeesCollectorTransactionModel)
    async claimFeesRewards(
        @AuthUser() user: UserAuthResult,
    ): Promise<FeesCollectorTransactionModel> {
        return this.feesCollectorTransaction.claimRewardsBatch(
            scAddress.feesCollector,
            user.address,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async updateEnergyForUser(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.feesCollectorTransaction.updateEnergyForUser(user.address);
    }
}
