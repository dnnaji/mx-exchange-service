import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { BoostedYieldsFactors, FarmModelV2 } from '../models/farm.v2.model';
import { FarmGetterServiceV2 } from './services/farm.v2.getter.service';
import { FarmResolver } from '../base-module/farm.resolver';
import { FarmServiceV2 } from './services/farm.v2.service';
import { GlobalInfoByWeekModel } from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeekTimekeepingModel } from '../../../submodules/week-timekeeping/models/week-timekeeping.model';
import { FarmComputeServiceV2 } from './services/farm.v2.compute.service';
import { constantsConfig } from '../../../config';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';

@Resolver(() => FarmModelV2)
export class FarmResolverV2 extends FarmResolver {
    constructor(
        protected readonly farmGetter: FarmGetterServiceV2,
        protected readonly farmService: FarmServiceV2,
        protected readonly farmCompute: FarmComputeServiceV2,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
    ) {
        super(farmGetter);
    }

    @ResolveField()
    async accumulatedRewards(@Parent() parent: FarmModelV2): Promise<string> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        return await this.genericFieldResolver(() =>
            this.farmGetter.getAccumulatedRewardsForWeek(
                parent.address,
                currentWeek,
            ),
        );
    }

    @ResolveField()
    async optimalEnergyPerLp(@Parent() parent: FarmModelV2): Promise<string> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        return await this.genericFieldResolver(() =>
            this.farmGetter.getOptimalEnergyPerLp(parent.address, currentWeek),
        );
    }

    @ResolveField()
    async baseApr(@Parent() parent: FarmModelV2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmCompute.computeFarmBaseAPR(parent.address),
        );
    }

    @ResolveField()
    async boosterRewards(
        @Parent() parent: FarmModelV2,
    ): Promise<GlobalInfoByWeekModel[]> {
        const modelsList = [];
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        for (
            let week = currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS;
            week <= currentWeek;
            week++
        ) {
            if (week < 1) {
                continue;
            }
            modelsList.push(
                new GlobalInfoByWeekModel({
                    scAddress: parent.address,
                    week: week,
                }),
            );
        }
        return modelsList;
    }

    @ResolveField()
    async time(@Parent() parent: FarmModelV2): Promise<WeekTimekeepingModel> {
        return await this.genericFieldResolver(async () => {
            const currentWeek = await this.weekTimekeepingAbi.currentWeek(
                parent.address,
            );
            return new WeekTimekeepingModel({
                scAddress: parent.address,
                currentWeek: currentWeek,
            });
        });
    }

    @ResolveField()
    async boostedYieldsRewardsPercenatage(
        @Parent() parent: FarmModelV2,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getBoostedYieldsRewardsPercenatage(parent.address),
        );
    }

    @ResolveField()
    async boostedYieldsFactors(
        @Parent() parent: FarmModelV2,
    ): Promise<BoostedYieldsFactors> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getBoostedYieldsFactors(parent.address),
        );
    }

    @ResolveField()
    async lockingScAddress(@Parent() parent: FarmModelV2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getLockingScAddress(parent.address),
        );
    }

    @ResolveField()
    async lockEpochs(@Parent() parent: FarmModelV2): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getLockEpochs(parent.address),
        );
    }

    @ResolveField()
    async undistributedBoostedRewards(
        @Parent() parent: FarmModelV2,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getUndistributedBoostedRewards(parent.address),
        );
    }

    @ResolveField()
    async lastGlobalUpdateWeek(@Parent() parent: FarmModelV2): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.lastGlobalUpdateWeek(parent.address),
        );
    }

    @ResolveField()
    async energyFactoryAddress(@Parent() parent: FarmModelV2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getEnergyFactoryAddress(parent.address),
        );
    }
}
