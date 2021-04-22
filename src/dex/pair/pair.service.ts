import { Injectable } from '@nestjs/common';
import { AbiRegistry, BigUIntValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { BytesValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes";
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ProxyProvider, Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { elrondConfig, abiConfig } from '../../config';
import { PairInfoModel } from '../models/pair-info.model';
import { LiquidityPosition, TokenModel } from '../models/pair.model';
import { PairPriceModel } from '../models/pair-price.model';
import { TransactionModel } from '../models/transaction.model';
import { ContextService } from '../utils/context.service';
import BigNumber from '@elrondnetwork/erdjs/node_modules/bignumber.js';


@Injectable()
export class PairService {
    private readonly proxy: ProxyProvider;

    constructor(
        private cacheManagerService: CacheManagerService,
        private context: ContextService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
    }

    private async getContract(address: string): Promise<SmartContract> {
        let abiRegistry = await AbiRegistry.load({ files: [abiConfig.pair] });
        let abi = new SmartContractAbi(abiRegistry, ["Pair"]);
        let contract = new SmartContract({ address: new Address(address), abi: abi });

        return contract;
    }

    async getToken(tokenID: string): Promise<TokenModel> {

        return this.context.getTokenMetadata(tokenID);
    }

    async getLpToken(pairAddress: string): Promise<TokenModel> {
        const cachedData = await this.cacheManagerService.getLpToken(pairAddress);
        if (!!cachedData) {
            return cachedData.lpToken;
        }

        let contract = await this.getContract(pairAddress);
        let getLpTokenInteraction = <Interaction>contract.methods.getLpTokenIdentifier([]);
        let queryResponse = await contract.runQuery(this.proxy, getLpTokenInteraction.buildQuery());
        let result = getLpTokenInteraction.interpretQueryResponse(queryResponse);
        let token = await this.context.getTokenMetadata(result.firstValue.valueOf());

        this.cacheManagerService.setLpToken(pairAddress, { lpToken: token });
        return token;
    }

    async getPairInfo(address: string): Promise<PairInfoModel> {
        let contract = await this.getContract(address);
        let getAllPairsInteraction = <Interaction>contract.methods.getReservesAndTotalSupply([]);

        let queryResponse = await contract.runQuery(this.proxy, getAllPairsInteraction.buildQuery());
        let result = getAllPairsInteraction.interpretQueryResponse(queryResponse);


        let pairInfo = result.values.map(v => v.valueOf())
        return {
            reserves0: pairInfo[0],
            reserves1: pairInfo[1],
            totalSupply: pairInfo[2]
        };
    }

    async getPairPrice(address: string): Promise<PairPriceModel> {
        let pairsMetadata = await this.context.getPairsMetadata();
        let pair = pairsMetadata.find(pair => pair.address === address);
        let pairPrice = new PairPriceModel();

        pairPrice.firstToken = await (await this.getAmountOut(pair.address, pair.firstToken, '1')).toString();
        pairPrice.secondToken = await (await this.getAmountOut(pair.address, pair.secondToken, '1')).toString();

        return pairPrice;
    }

    async getPairState(pairAddress: string): Promise<boolean> {
        let contract = await this.getContract(pairAddress);

        let getStateInteraction = <Interaction>contract.methods.getState([
        ]);

        let queryResponse = await contract.runQuery(
            this.proxy,
            getStateInteraction.buildQuery()
        );

        let result = getStateInteraction.interpretQueryResponse(queryResponse);
        return result.firstValue.valueOf();
    }

    async getAmountOut(address: string, tokenInId: string, amount: string): Promise<string> {
        let token = await this.context.getTokenMetadata(tokenInId);
        let tokenAmount = amount + 'e' + token.decimals.toString();

        let contract = await this.getContract(address);

        let getAmountOut = <Interaction>contract.methods.getAmountOut([
            BytesValue.fromUTF8(tokenInId),
            new BigUIntValue(new BigNumber(tokenAmount))
        ]);

        let queryResponse = await contract.runQuery(
            this.proxy,
            getAmountOut.buildQuery()
        );

        let result = getAmountOut.interpretQueryResponse(queryResponse);
        return result.firstValue.valueOf();
    }

    async getAmountIn(address: string, tokenOutId: string, amount: string): Promise<string> {
        let token = await this.context.getTokenMetadata(tokenOutId);
        let tokenAmount = amount + 'e' + token.decimals.toString();

        let contract = await this.getContract(address);

        let getAmountInInteraction = <Interaction>contract.methods.getAmountIn([
            BytesValue.fromUTF8(tokenOutId),
            new BigUIntValue(new BigNumber(tokenAmount))
        ]);

        let queryResponse = await contract.runQuery(
            this.proxy,
            getAmountInInteraction.buildQuery()
        );

        let result = getAmountInInteraction.interpretQueryResponse(queryResponse);
        return result.firstValue.valueOf();
    }

    async getEquivalentForLiquidity(address: string, tokenInId: string, amount: string): Promise<string> {
        let token = await this.context.getTokenMetadata(tokenInId);
        let tokenAmount = amount + 'e' + token.decimals.toString();

        let contract = await this.getContract(address);

        let getEquivalentInteraction = <Interaction>contract.methods.getEquivalent([
            BytesValue.fromUTF8(tokenInId),
            new BigUIntValue(new BigNumber(tokenAmount))
        ]);

        let queryResponse = await contract.runQuery(
            this.proxy,
            getEquivalentInteraction.buildQuery()
        );

        let result = getEquivalentInteraction.interpretQueryResponse(queryResponse);
        return result.firstValue.valueOf();
    }

    async getTemporaryFunds(pairAddress: string, callerAddress: string, tokenID: string): Promise<string> {

        let contract = await this.getContract(pairAddress);

        let getTemporaryFundsInteraction = <Interaction>contract.methods.getTemporaryFunds([
            new Address(callerAddress),
            BytesValue.fromUTF8(tokenID)
        ]);

        let queryResponse = await contract.runQuery(
            this.proxy,
            getTemporaryFundsInteraction.buildQuery()
        );

        let result = getTemporaryFundsInteraction.interpretQueryResponse(queryResponse);
        return result.firstValue.valueOf();
    }

    async getLiquidityPosition(pairAddress: string, amount: string): Promise<LiquidityPosition> {
        let lpToken = await this.getLpToken(pairAddress);
        let tokenAmount = amount + 'e' + lpToken.decimals.toString();

        let contract = await this.getContract(pairAddress);

        let getLiquidityPositionInteraction = <Interaction>contract.methods.getTokensForGivenPosition([
            new BigUIntValue(new BigNumber(tokenAmount))
        ]);

        let queryResponse = await contract.runQuery(
            this.proxy,
            getLiquidityPositionInteraction.buildQuery()
        );

        let result = getLiquidityPositionInteraction.interpretQueryResponse(queryResponse);

        return {
            firstToken: result.values[0].valueOf().amount,
            secondToken: result.values[1].valueOf().amount
        };
    }

    async addLiquidity(pairAddress: string, amount0: string, amount1: string, tolerance: number): Promise<TransactionModel> {
        let contract = await this.getContract(pairAddress);
        let pairsMetadata = await this.context.getPairsMetadata();
        let pair = pairsMetadata.find(pair => pair.address === pairAddress);
        let token0 = await this.getToken(pair.firstToken);
        let token1 = await this.getToken(pair.secondToken);
        let amount0Denom = new BigNumber(amount0 + "e" + token0.decimals.toString());
        let amount1Denom = new BigNumber(amount1 + "e" + token1.decimals.toString());

        let amount0Min = amount0Denom.multipliedBy(1 - tolerance);
        let amount1Min = amount1Denom.multipliedBy(1 - tolerance);

        let addLiquidityInteraction = <Interaction>contract.methods.addLiquidity([
            new BigUIntValue(amount0Denom),
            new BigUIntValue(amount1Denom),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ]);

        let transaction = addLiquidityInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(1400000000));

        return transaction.toPlainObject();
    }

}
