import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class AddLiquidityArgs {
    @Field()
    pairAddress: string;
    @Field()
    amount0: string;
    @Field()
    amount1: string;
    @Field()
    tolerance: number;
}

@ArgsType()
export class AddLiquidityBatchArgs {
    @Field()
    pairAddress: string;
    @Field()
    sender: string;
    @Field()
    firstTokenID: string;
    @Field()
    firstTokenAmount: string;
    @Field()
    secondTokenID: string;
    @Field()
    secondTokenAmount: string;
    @Field()
    tolerance: number;
}

@ArgsType()
export class RemoveLiquidityArgs {
    @Field()
    pairAddress: string;
    @Field()
    sender: string;
    @Field()
    liquidity: string;
    @Field()
    liquidityTokenID: string;
    @Field()
    tolerance: number;
}

@ArgsType()
export class SwapTokensFixedInputArgs {
    @Field()
    pairAddress: string;
    @Field()
    sender: string;
    @Field()
    tokenInID: string;
    @Field()
    amountIn: string;
    @Field()
    tokenOutID: string;
    @Field()
    amountOut: string;
    @Field()
    tolerance: number;
}

@ArgsType()
export class SwapTokensFixedOutputArgs {
    @Field()
    pairAddress: string;
    @Field()
    sender: string;
    @Field()
    tokenInID: string;
    @Field()
    amountIn: string;
    @Field()
    tokenOutID: string;
    @Field()
    amountOut: string;
    @Field()
    tolerance: number;
}

@ArgsType()
export class ESDTTransferArgs {
    @Field()
    pairAddress: string;
    @Field()
    token: string;
    @Field()
    amount: string;
}
