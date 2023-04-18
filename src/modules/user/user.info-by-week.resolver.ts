import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UserInfoByWeekModel } from '../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { GenericResolver } from '../../services/generics/generic.resolver';
import { EnergyModel } from '../energy/models/energy.model';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import { FarmGetterFactory } from '../farm/farm.getter.factory';
import { FeesCollectorGetterService } from '../fees-collector/services/fees-collector.getter.service';
import { scAddress } from '../../config';
import { FarmGetterServiceV2 } from '../farm/v2/services/farm.v2.getter.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';

@Resolver(() => UserInfoByWeekModel)
export class UserInfoByWeekResolver extends GenericResolver {
    constructor(
        private readonly farmGetter: FarmGetterFactory,
        private readonly feesCollectorGetter: FeesCollectorGetterService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {
        super();
    }

    @ResolveField(() => EnergyModel)
    async energyForWeek(
        @Parent() parent: UserInfoByWeekModel,
    ): Promise<EnergyModel> {
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                parent.scAddress,
                parent.userAddress,
                parent.week,
            ),
        );
    }

    @ResolveField()
    async apr(@Parent() parent: UserInfoByWeekModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.getGetter(parent.scAddress).getUserApr(
                parent.scAddress,
                parent.userAddress,
                parent.week,
            ),
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async rewardsForWeek(
        @Parent() parent: UserInfoByWeekModel,
    ): Promise<EsdtTokenPayment[]> {
        return await this.genericFieldResolver(() =>
            this.getGetter(parent.scAddress).userRewardsForWeek(
                parent.scAddress,
                parent.userAddress,
                parent.week,
                undefined,
                parent.positionAmount,
            ),
        );
    }

    @ResolveField(() => [String])
    async rewardsDistributionForWeek(
        @Parent() parent: UserInfoByWeekModel,
    ): Promise<string[]> {
        return await this.genericFieldResolver(() =>
            this.getGetter(parent.scAddress).userRewardsDistributionForWeek(
                parent.scAddress,
                parent.userAddress,
                parent.week,
            ),
        );
    }

    private getGetter(address: string) {
        if (address === scAddress.feesCollector) {
            return this.feesCollectorGetter;
        }
        return this.farmGetter.useGetter(address) as FarmGetterServiceV2;
    }
}
