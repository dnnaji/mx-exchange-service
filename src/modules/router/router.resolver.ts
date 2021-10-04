import { RouterService } from './router.service';
import {
    Resolver,
    Query,
    ResolveField,
    Parent,
    Args,
    Int,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { GetPairsArgs, PairModel } from '../pair/models/pair.model';
import { FactoryModel } from './models/factory.model';
import { TransactionRouterService } from './transactions.router.service';
import { JwtAdminGuard } from '../../helpers/guards/jwt.admin.guard';
import { ApolloError } from 'apollo-server-express';
import { RouterGetterService } from './router.getter.service';

@Resolver(of => FactoryModel)
export class RouterResolver {
    constructor(
        private readonly routerService: RouterService,
        private readonly routerGetterService: RouterGetterService,
        private readonly transactionService: TransactionRouterService,
    ) {}

    @Query(returns => FactoryModel)
    async factory() {
        return this.routerService.getFactory();
    }

    @ResolveField(returns => Int!)
    async pairCount(@Parent() factoryModel: FactoryModel) {
        try {
            return this.routerService.getPairCount();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(returns => Int!)
    async totalTxCount(@Parent() factoryModel: FactoryModel) {
        try {
            return this.routerService.getTotalTxCount();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(returns => [String])
    async pairAddresses(): Promise<string[]> {
        try {
            return this.routerGetterService.getAllPairsAddress();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(returns => [PairModel])
    async pairs(@Args() page: GetPairsArgs): Promise<PairModel[]> {
        try {
            return this.routerService.getAllPairs(page.offset, page.limit);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtAdminGuard)
    @Query(returns => TransactionModel)
    async createPair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
    ): Promise<TransactionModel> {
        return this.transactionService.createPair(firstTokenID, secondTokenID);
    }

    @UseGuards(JwtAdminGuard)
    @Query(returns => TransactionModel)
    async issueLPToken(
        @Args('address') address: string,
        @Args('lpTokenName') lpTokenName: string,
        @Args('lpTokenTicker') lpTokenTicker: string,
    ): Promise<TransactionModel> {
        return this.transactionService.issueLpToken(
            address,
            lpTokenName,
            lpTokenTicker,
        );
    }

    @UseGuards(JwtAdminGuard)
    @Query(returns => TransactionModel)
    async setLocalRoles(
        @Args('address') address: string,
    ): Promise<TransactionModel> {
        return this.transactionService.setLocalRoles(address);
    }

    @UseGuards(JwtAdminGuard)
    @Query(returns => TransactionModel)
    async setState(
        @Args('address') address: string,
        @Args('enable') enable: boolean,
    ): Promise<TransactionModel> {
        return this.transactionService.setState(address, enable);
    }

    @UseGuards(JwtAdminGuard)
    @Query(returns => TransactionModel)
    async setFee(
        @Args('pairAddress') pairAddress: string,
        @Args('feeToAddress') feeToAddress: string,
        @Args('feeTokenID') feeTokenID: string,
        @Args('enable') enable: boolean,
    ): Promise<TransactionModel> {
        return this.transactionService.setFee(
            pairAddress,
            feeToAddress,
            feeTokenID,
            enable,
        );
    }
}
