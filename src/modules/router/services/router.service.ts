import { FactoryModel } from '../models/factory.model';
import { Inject, Injectable } from '@nestjs/common';
import { scAddress } from '../../../config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { PairModel } from '../../pair/models/pair.model';
import { RouterGetterService } from '../services/router.getter.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairFilterArgs } from '../models/filter.args';
import { PairMetadata } from '../models/pair.metadata.model';

@Injectable()
export class RouterService {
    constructor(
        private readonly routerGetterService: RouterGetterService,
        private readonly pairGetterService: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getFactory(): Promise<FactoryModel> {
        return new FactoryModel({
            address: scAddress.routerAddress,
        });
    }

    async getAllPairs(
        offset: number,
        limit: number,
        pairFilter: PairFilterArgs,
    ): Promise<PairModel[]> {
        let pairsMetadata = await this.routerGetterService.getPairsMetadata();
        pairsMetadata = this.filterPairsByAddress(pairFilter, pairsMetadata);
        pairsMetadata = this.filterPairsByTokens(pairFilter, pairsMetadata);
        pairsMetadata = await this.filterPairsByIssuedLpToken(
            pairFilter,
            pairsMetadata,
        );
        pairsMetadata = await this.filterPairsByState(
            pairFilter,
            pairsMetadata,
        );

        return pairsMetadata
            .map(
                pairMetadata =>
                    new PairModel({
                        address: pairMetadata.address,
                    }),
            )
            .slice(offset, limit);
    }

    private filterPairsByAddress(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): PairMetadata[] {
        if (pairFilter.address) {
            pairsMetadata = pairsMetadata.filter(
                pair => pairFilter.address === pair.address,
            );
        }
        return pairsMetadata;
    }

    private filterPairsByTokens(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): PairMetadata[] {
        if (pairFilter.firstTokenID) {
            if (pairFilter.secondTokenID) {
                pairsMetadata = pairsMetadata.filter(
                    pair =>
                        (pairFilter.firstTokenID === pair.firstTokenID &&
                            pairFilter.secondTokenID === pair.secondTokenID) ||
                        (pairFilter.firstTokenID === pair.secondTokenID &&
                            pairFilter.secondTokenID === pair.firstTokenID),
                );
            } else {
                pairsMetadata = pairsMetadata.filter(
                    pair => pairFilter.firstTokenID === pair.firstTokenID,
                );
            }
        } else if (pairFilter.secondTokenID) {
            pairsMetadata = pairsMetadata.filter(
                pair => pairFilter.secondTokenID === pair.secondTokenID,
            );
        }
        return pairsMetadata;
    }

    private async filterPairsByIssuedLpToken(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.issuedLpToken) {
            return pairsMetadata;
        }

        const promises = pairsMetadata.map(pairMetadata =>
            this.pairGetterService.getLpTokenID(pairMetadata.address),
        );
        const lpTokensIDs = await Promise.all(promises);

        const filteredPairsMetadata = [];
        for (let index = 0; index < lpTokensIDs.length; index++) {
            if (
                lpTokensIDs[index] === undefined ||
                lpTokensIDs[index] === 'undefined'
            ) {
                continue;
            }
            filteredPairsMetadata.push(pairsMetadata[index]);
        }

        return filteredPairsMetadata;
    }

    private async filterPairsByState(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.state) {
            return pairsMetadata;
        }

        const promises = pairsMetadata.map(pairMetadata =>
            this.pairGetterService.getState(pairMetadata.address),
        );
        const pairsStates = await Promise.all(promises);

        const filteredPairsMetadata = [];
        for (let index = 0; index < pairsStates.length; index++) {
            if (pairsStates[index] === pairFilter.state) {
                filteredPairsMetadata.push(pairsMetadata[index]);
            }
        }

        return filteredPairsMetadata;
    }

    private getRouterCacheKey(...args: any) {
        return generateCacheKeyFromParams('router', ...args);
    }
}
