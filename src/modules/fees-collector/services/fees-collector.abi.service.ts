import { Inject, Injectable } from '@nestjs/common';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Interaction, SmartContract, TokenIdentifierValue, U32Value } from '@elrondnetwork/erdjs/out';
import {
    WeeklyRewardsSplittingAbiService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { Mixin } from 'ts-mixer';
import BigNumber from 'bignumber.js';
import { WeekTimekeepingAbiService } from '../../../submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { EsdtTokenPayment, EsdtTokenType } from "../../../models/esdtTokenPayment.model";

@Injectable()
export class FeesCollectorAbiService extends Mixin(GenericAbiService, WeeklyRewardsSplittingAbiService, WeekTimekeepingAbiService) {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
        this.getContractHandler = this.getContract
    }

    async getContract(_: string): Promise<SmartContract> {
        const contract = await this.elrondProxy.getFeesCollectorContract()
        return contract
    }

    async accumulatedFees(scAddress: string, week: number, token: string): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getAccumulatedFees(
            [
                new U32Value(new BigNumber(week)),
                new TokenIdentifierValue(token),
            ],
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async accumulatedLockedFees(scAddress: string, week: number, token: string): Promise<EsdtTokenPayment[]> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getAccumulatedLockedFees(
            [
                new U32Value(new BigNumber(week)),
                new TokenIdentifierValue(token),
            ],
        );
        const response = await this.getGenericData(interaction);
        const rewardsRaw = response.firstValue.valueOf()
        const rewards: EsdtTokenPayment[] = []
        for (const rewardRaw of rewardsRaw) {
            console.log(rewardRaw);
            rewards.push(new EsdtTokenPayment({
                tokenType: EsdtTokenType.getEnum().getVariantByName(
                    rewardRaw.token_type.name,
                ).discriminant,
                tokenID: rewardRaw.token_identifier.toString(),
                nonce: new BigNumber(
                    rewardRaw.token_nonce,
                ).toNumber(),
                amount: new BigNumber(
                    rewardRaw.amount,
                ).toFixed(),
            }));
        }
        return rewards;
    }

    async allTokens(scAddress: string): Promise<string[]> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getAllTokens();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
