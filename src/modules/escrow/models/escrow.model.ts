import { Field, ObjectType } from '@nestjs/graphql';
import { EsdtTokenPaymentModel } from 'src/modules/tokens/models/esdt.token.payment.model';

@ObjectType()
export class EscrowModel {
    @Field()
    address: string;
    @Field()
    energyFactoryAddress: string;
    @Field()
    lockedTokenID: string;
    @Field()
    minLockEpochs: number;
    @Field()
    epochsCooldownDuration: number;
}

@ObjectType()
export class LockedFundsModel {
    @Field(() => [EsdtTokenPaymentModel])
    funds: EsdtTokenPaymentModel[];
    @Field()
    lockedEpoch: number;

    constructor(init?: Partial<LockedFundsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class ScheduledTransferModel {
    @Field()
    sender: string;
    @Field(() => LockedFundsModel)
    lockedFunds: LockedFundsModel;

    constructor(init?: Partial<ScheduledTransferModel>) {
        Object.assign(this, init);
    }
}
