import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { ESDTTransferTransaction } from './entities/esdtTransfer.transaction';
import { SwapAnalytics } from './models/swap.analytics.dto';

@Injectable()
export class TransactionMappingService {
    constructor(private readonly pairGetterService: PairGetterService) {}

    async handleSwap(
        transaction: ESDTTransferTransaction,
    ): Promise<SwapAnalytics> {
        const pairAddress = transaction.receiver;
        const tokenInID = transaction.getDataESDTIdentifier();
        const tokenInAmount = transaction.getDataESDTAmount();
        const tokenOutID = Buffer.from(
            transaction.getDataEndpointArgs()[0],
            'hex',
        ).toString();
        const tokenOutAmount = new BigNumber(
            `0x${transaction.getDataEndpointArgs()[1]}`,
        );

        const [
            firstToken,
            secondToken,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            totalFeePercent,
        ] = await Promise.all([
            this.pairGetterService.getFirstToken(pairAddress),
            this.pairGetterService.getSecondToken(pairAddress),
            this.pairGetterService.getFirstTokenPriceUSD(pairAddress),
            this.pairGetterService.getSecondTokenPriceUSD(pairAddress),
            this.pairGetterService.getTotalFeePercent(pairAddress),
        ]);
        const [tokenIn, tokenOut, tokenInPriceUSD, tokenOutPriceUSD] =
            tokenInID === firstToken.identifier
                ? [
                      firstToken,
                      secondToken,
                      firstTokenPriceUSD,
                      secondTokenPriceUSD,
                  ]
                : [
                      secondToken,
                      firstToken,
                      secondTokenPriceUSD,
                      firstTokenPriceUSD,
                  ];
        const tokenInAmountDenom = tokenInAmount.multipliedBy(
            new BigNumber(`1e-${tokenIn.decimals}`),
        );
        const tokenOutAmountDenom = tokenOutAmount.multipliedBy(
            new BigNumber(`1e-${tokenOut.decimals}`),
        );

        const tokenInAmountUSD = new BigNumber(tokenInPriceUSD).times(
            tokenInAmountDenom,
        );
        const tokenOutAmountUSD = new BigNumber(tokenOutPriceUSD).times(
            tokenOutAmountDenom,
        );
        const amountTotalUSD = tokenInAmountUSD
            .plus(tokenOutAmountUSD)
            .div(new BigNumber(2));
        const feesUSD = tokenInAmountUSD.times(totalFeePercent);
        return {
            pairAddress: pairAddress,
            volumeUSD: amountTotalUSD,
            feesUSD: feesUSD,
            tokenInID: tokenInID,
            tokenInVolume: tokenInAmount,
            tokenInVolumeUSD: tokenInAmountUSD,
            tokenOutID: tokenOutID,
            tokenOutVolume: tokenOutAmount,
            tokenOutVolumeUSD: tokenOutAmountUSD,
        };
    }
}
