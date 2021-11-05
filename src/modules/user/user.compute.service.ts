import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { scAddress } from '../../config';
import { LockedAssetToken } from '../../models/tokens/lockedAssetToken.model';
import { LockedFarmToken } from '../../models/tokens/lockedFarmToken.model';
import { LockedLpToken } from '../../models/tokens/lockedLpToken.model';
import { NftToken } from '../../models/tokens/nftToken.model';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { FarmGetterService } from '../farm/services/farm.getter.service';
import { FarmService } from '../farm/services/farm.service';
import { LockedAssetService } from '../locked-asset-factory/locked-asset.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ProxyService } from '../proxy/proxy.service';
import {
    UserFarmToken,
    UserLockedAssetToken,
    UserLockedFarmToken,
    UserLockedLPToken,
} from './models/user.model';
import { UserNftTokens } from './nfttokens.union';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { computeValueUSD } from '../../utils/token.converters';

@Injectable()
export class UserComputeService {
    constructor(
        private apiService: ElrondApiService,
        private farmService: FarmService,
        private farmGetterService: FarmGetterService,
        private pairService: PairService,
        private pairGetterService: PairGetterService,
        private lockedAssetService: LockedAssetService,
        private proxyService: ProxyService,
    ) {}

    async farmTokenUSD(
        nftToken: NftToken,
        farmAddress: string,
    ): Promise<typeof UserNftTokens> {
        const decodedFarmAttributes = this.farmService.decodeFarmTokenAttributes(
            nftToken.identifier,
            nftToken.attributes,
        );

        const tokenPriceUSD = await this.farmGetterService.getFarmTokenPriceUSD(
            farmAddress,
        );

        return new UserFarmToken({
            ...nftToken,
            valueUSD: computeValueUSD(
                new BigNumber(nftToken.balance)
                    .dividedBy(decodedFarmAttributes.aprMultiplier)
                    .toFixed(),
                nftToken.decimals,
                tokenPriceUSD,
            ).toFixed(),
            decodedAttributes: decodedFarmAttributes,
        });
    }

    async lockedAssetTokenUSD(
        nftToken: LockedAssetToken,
    ): Promise<typeof UserNftTokens> {
        // TODO: uncomment for Maiar Exchange release
        // const [assetToken, decodedAttributes] = await Promise.all([
        //     this.proxyService.getAssetToken(),
        //     this.lockedAssetService.decodeLockedAssetAttributes({
        //         batchAttributes: [
        //             {
        //                 identifier: nftToken.identifier,
        //                 attributes: nftToken.attributes,
        //             },
        //         ],
        //     }),
        // ]);
        // const tokenPriceUSD = await this.pairGetterService.getSecondTokenPriceUSD(
        //     scAddress.get(assetToken.identifier),
        // );
        const decodedAttributes = await this.lockedAssetService.decodeLockedAssetAttributes(
            {
                batchAttributes: [
                    {
                        identifier: nftToken.identifier,
                        attributes: nftToken.attributes,
                    },
                ],
            },
        );
        return new UserLockedAssetToken({
            ...nftToken,
            valueUSD: '0',
            decodedAttributes: decodedAttributes[0],
        });
    }

    async lockedLpTokenUSD(
        nftToken: LockedLpToken,
    ): Promise<typeof UserNftTokens> {
        const decodedWLPTAttributes = this.proxyService.getWrappedLpTokenAttributes(
            {
                batchAttributes: [
                    {
                        identifier: nftToken.identifier,
                        attributes: nftToken.attributes,
                    },
                ],
            },
        );
        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            decodedWLPTAttributes[0].lpTokenID,
        );
        if (pairAddress) {
            const tokenPriceUSD = await this.pairGetterService.getLpTokenPriceUSD(
                pairAddress,
            );

            return new UserLockedLPToken({
                ...nftToken,
                valueUSD: computeValueUSD(
                    nftToken.balance,
                    nftToken.decimals,
                    tokenPriceUSD,
                ).toFixed(),
                decodedAttributes: decodedWLPTAttributes[0],
            });
        }
    }

    async lockedFarmTokenUSD(
        nftToken: LockedFarmToken,
    ): Promise<typeof UserNftTokens> {
        const decodedWFMTAttributes = await this.proxyService.getWrappedFarmTokenAttributes(
            {
                batchAttributes: [
                    {
                        identifier: nftToken.identifier,
                        attributes: nftToken.attributes,
                    },
                ],
            },
        );
        const [farmAddress, farmToken] = await Promise.all([
            this.farmService.getFarmAddressByFarmTokenID(
                decodedWFMTAttributes[0].farmTokenID,
            ),
            this.apiService.getNftByTokenIdentifier(
                scAddress.proxyDexAddress,
                decodedWFMTAttributes[0].farmTokenIdentifier,
            ),
        ]);
        const userFarmToken = await this.farmTokenUSD(farmToken, farmAddress);
        return new UserLockedFarmToken({
            ...nftToken,
            valueUSD: userFarmToken.valueUSD,
            decodedAttributes: decodedWFMTAttributes[0],
        });
    }
}
