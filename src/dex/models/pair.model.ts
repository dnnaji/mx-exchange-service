import { ObjectType, Field, ArgsType } from '@nestjs/graphql';
import { PaginationArgs } from '../dex.model';
import { PairInfoModel } from './pair-info.model';

@ArgsType()
export class GetPairsArgs extends PaginationArgs {}

@ObjectType()
export class LiquidityPosition {
    @Field()
    firstTokenAmount: string;

    @Field()
    secondTokenAmount: string;
}

@ObjectType()
export class TokenModel {
    @Field()
    token: string;

    @Field()
    name: string;

    @Field()
    decimals: number;
}

@ObjectType()
export class PairModel {
    @Field()
    address: string;

    @Field()
    firstToken: TokenModel;

    @Field()
    secondToken: TokenModel;

    @Field()
    firstTokenPrice: string;

    @Field()
    firstTokenPriceUSD: string;

    @Field()
    secondTokenPrice: string;

    @Field()
    secondTokenPriceUSD: string;

    @Field()
    liquidityPoolToken: TokenModel;

    @Field()
    info: PairInfoModel;

    @Field()
    state: string;
}
