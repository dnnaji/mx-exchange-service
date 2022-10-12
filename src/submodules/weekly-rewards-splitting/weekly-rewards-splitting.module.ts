import { DynamicModule, Module } from '@nestjs/common';
import { WeeklyRewardsSplittingGetterService } from './services/weekly-rewards-splitting.getter.service';
import { CachingModule } from '../../services/caching/cache.module';
import { WeeklyRewardsSplittingAbiService } from './services/weekly-rewards-splitting.abi.service';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { WeeklyRewardsSplittingService } from './services/weekly-rewards-splitting.service';
import { ApiConfigService } from '../../helpers/api.config.service';
import { WeeklyRewardsSplittingComputeService } from './services/weekly-rewards-splitting.compute.service';
import { WeekTimekeepingModule } from '../week-timekeeping/week-timekeeping.module';
import { ProgressComputeService } from './services/progress.compute.service';
import { GlobalInfoByWeekResolver, UserInfoByWeekResolver } from './weekly-rewards-splitting.resolver';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
    ],
})
export class WeeklyRewardsSplittingModule {
    static register(abiProvider: any): DynamicModule {
        return {
            module: WeeklyRewardsSplittingModule,
            imports: [
                WeekTimekeepingModule.register(abiProvider),
            ],
            providers: [
                ApiConfigService,
                ProgressComputeService,
                WeeklyRewardsSplittingService,
                {
                    provide: WeeklyRewardsSplittingAbiService,
                    useClass: abiProvider,
                },
                WeeklyRewardsSplittingGetterService,
                WeeklyRewardsSplittingComputeService,
                GlobalInfoByWeekResolver,
                UserInfoByWeekResolver,
            ],
            exports: [
                GlobalInfoByWeekResolver,
                UserInfoByWeekResolver,
                WeeklyRewardsSplittingService,
                WeeklyRewardsSplittingGetterService,
                WeeklyRewardsSplittingAbiService,
            ],

        }
    }
}
