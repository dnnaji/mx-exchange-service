import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { elrondConfig, abiConfig, scAddress } from '../../config';
import {
    AbiRegistry,
    TypedValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import {
    ProxyProvider,
    Address,
    SmartContract,
    GasLimit,
    ContractFunction,
} from '@elrondnetwork/erdjs';
import { TokenModel } from '../../models/esdtToken.model';
import { TransactionModel } from '../../models/transaction.model';
import { NFTTokenModel } from '../../models/nftToken.model';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';

interface PairMetadata {
    address: string;
    firstToken: string;
    secondToken: string;
}

@Injectable()
export class ContextService {
    private readonly proxy: ProxyProvider;

    constructor(
        private apiService: ElrondApiService,
        private cacheManagerService: CacheManagerService,
    ) {
        this.proxy = new ProxyProvider(
            elrondConfig.elrondApi,
            elrondConfig.proxyTimeout,
        );
    }

    private async getContract(): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.router],
        });
        const abi = new SmartContractAbi(abiRegistry, ['Router']);
        return new SmartContract({
            address: new Address(scAddress.routerAddress),
            abi: abi,
        });
    }

    async getAllPairsAddress(): Promise<string[]> {
        const cachedData = await this.cacheManagerService.getPairsAddress();
        if (!!cachedData) {
            return cachedData.pairsAddress;
        }
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getAllPairsAddresses(
            [],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);

        const pairsAddress = result.firstValue.valueOf().map(pairAddress => {
            return pairAddress.toString();
        });

        this.cacheManagerService.setPairsAddress({
            pairsAddress: pairsAddress,
        });

        return pairsAddress;
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        const cachedData = await this.cacheManagerService.getPairsMetadata();
        if (!!cachedData) {
            return cachedData.pairsMetadata;
        }

        const contract = await this.getContract();
        const getAllPairsInteraction: Interaction = contract.methods.getAllPairContractMetadata(
            [],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            getAllPairsInteraction.buildQuery(),
        );
        const result = getAllPairsInteraction.interpretQueryResponse(
            queryResponse,
        );

        const pairsMetadata = result.firstValue.valueOf().map(v => {
            return {
                firstToken: v.first_token_id.toString(),
                secondToken: v.second_token_id.toString(),
                address: v.address.toString(),
            };
        });
        this.cacheManagerService.setPairsMetadata({
            pairsMetadata: pairsMetadata,
        });

        return pairsMetadata;
    }

    async getPairMetadata(pairAddress: string): Promise<PairMetadata> {
        const pairs = await this.getPairsMetadata();
        const pair = pairs.find(pair => pair.address === pairAddress);

        return pair;
    }

    async getPairByTokens(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<PairMetadata> {
        const pairsMetadata = await this.getPairsMetadata();
        for (const pair of pairsMetadata) {
            if (
                (pair.firstToken === firstTokenID &&
                    pair.secondToken === secondTokenID) ||
                (pair.firstToken === secondTokenID &&
                    pair.secondToken === firstTokenID)
            ) {
                return pair;
            }
        }
        return;
    }

    async getPairsMap(): Promise<Map<string, string[]>> {
        const pairsMetadata = await this.getPairsMetadata();
        const pairsMap = new Map<string, string[]>();
        for (const pairMetadata of pairsMetadata) {
            pairsMap.set(pairMetadata.firstToken, []);
            pairsMap.set(pairMetadata.secondToken, []);
        }

        pairsMetadata.forEach(pair => {
            pairsMap.get(pair.firstToken).push(pair.secondToken);
            pairsMap.get(pair.secondToken).push(pair.firstToken);
        });

        return pairsMap;
    }

    async getPath(input: string, output: string): Promise<string[]> {
        const path = [input];
        const queue = [input];
        const visited = new Map<string, boolean>();

        const pairsMap = await this.getPairsMap();
        for (const key of pairsMap.keys()) {
            visited.set(key, false);
        }

        visited.set(input, true);
        while (queue.length > 0) {
            const node = queue.shift();
            for (const value of pairsMap.get(node)) {
                if (value === output) {
                    path.push(output);
                    return path;
                }

                if (!visited.get(value)) {
                    visited.set(value, true);
                    queue.push(value);
                    path.push(value);
                }
            }
        }

        return [];
    }

    async getTokenMetadata(tokenID: string): Promise<TokenModel> {
        const cachedData = await this.cacheManagerService.getToken(tokenID);
        if (!!cachedData) {
            return cachedData.token;
        }

        const tokenMetadata = await this.apiService
            .getService()
            .getESDTToken(tokenID);
        this.cacheManagerService.setToken(tokenID, { token: tokenMetadata });
        return tokenMetadata;
    }

    async getNFTTokenMetadata(tokenID: string): Promise<NFTTokenModel> {
        const nftTokenMetadata = await this.apiService
            .getService()
            .getNFTToken(tokenID);
        return nftTokenMetadata;
    }

    esdtTransfer(
        contract: SmartContract,
        args: TypedValue[],
        gasLimit: GasLimit,
    ): TransactionModel {
        return contract
            .call({
                func: new ContractFunction('ESDTTransfer'),
                args: args,
                gasLimit: gasLimit,
            })
            .toPlainObject();
    }

    nftTransfer(
        contract: SmartContract,
        args: TypedValue[],
        gasLimit: GasLimit,
    ): TransactionModel {
        const transaction = contract.call({
            func: new ContractFunction('ESDTNFTTransfer'),
            args: args,
            gasLimit: gasLimit,
        });

        return transaction.toPlainObject();
    }
}
