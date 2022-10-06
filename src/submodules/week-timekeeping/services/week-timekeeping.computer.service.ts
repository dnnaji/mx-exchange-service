import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ApiConfigService } from "../../../helpers/api.config.service";
import { WeekTimekeepingGetterService } from "./week-timekeeping.getter.service";


@Injectable()
export abstract class WeekTimekeepingComputerService {
    firstWeekStartEpoch: number;
    epochsInWeek: number;
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly configService: ApiConfigService,
        private readonly weekTimekeepingGetterService: WeekTimekeepingGetterService,
    ) {
        this.epochsInWeek = this.configService.getEpochsInWeek();
    }

    async computeWeekForEpoch(scAddress: string, epoch: number): Promise<number> {
        await this.checkAndSetFirstWeekStartEpoch(scAddress);
        if (epoch < this.firstWeekStartEpoch) {
            return -1;
        }

        return (epoch - this.firstWeekStartEpoch) / this.epochsInWeek + 1;
    }

    async computeStartEpochForWeek(scAddress: string, week: number): Promise<number> {
        await this.checkAndSetFirstWeekStartEpoch(scAddress);
        if (week == 0) {
            return -1;
        }

        return this.firstWeekStartEpoch + (week - 1) * this.epochsInWeek
    }

    async computeEndEpochForWeek(scAddress: string, week: number): Promise<number> {
        if (week == 0) {
            return -1;
        }

        const startEpochForWeek = await this.computeStartEpochForWeek(scAddress, week)
        return startEpochForWeek + this.epochsInWeek - 1;
    }

    private async setFirstWeekStartEpoch(scAddress: string) {
        this.firstWeekStartEpoch = await this.weekTimekeepingGetterService.getFirstWeekStartEpoch(scAddress);
    }

    private async checkAndSetFirstWeekStartEpoch(scAddress: string) {
        if (this.firstWeekStartEpoch !== undefined) {
            return
        }
        await this.setFirstWeekStartEpoch(scAddress);
    }
}
