import BigNumber from 'bignumber.js';

export const denominateAmount = (
    tokenAmount: string,
    decimals: number,
): BigNumber => new BigNumber(tokenAmount).multipliedBy(`1e-${decimals}`);

export const computeValueUSD = (
    amount: string,
    decimals: number,
    priceUSD: string,
): BigNumber => denominateAmount(amount, decimals).times(priceUSD);
