import { UseGuards } from '@nestjs/common';
import { Query, Args, Resolver } from '@nestjs/graphql';
import { OutdatedContract, UserNftToken, UserToken } from './models/user.model';
import { UserNftTokens } from './models/nfttokens.union';
import { UserMetaEsdtService } from './services/user.metaEsdt.service';
import { PaginationArgs } from '../dex.model';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';
import { EsdtTokenInput } from '../tokens/models/esdtTokenInput.model';
import { ApolloError } from 'apollo-server-express';
import { Address } from '@elrondnetwork/erdjs/out';
import { NftTokenInput } from '../tokens/models/nftTokenInput.model';
import { UserEsdtService } from './services/user.esdt.service';
import { UserEnergyService } from './services/userEnergy/user.energy.service';
import { TransactionModel } from '../../models/transaction.model';

@Resolver()
export class UserResolver {
    constructor(
        private readonly userEsdt: UserEsdtService,
        private readonly userMetaEsdt: UserMetaEsdtService,
        private readonly userEnergy: UserEnergyService,
    ) {}

    @UseGuards(GqlAuthGuard)
    @Query(() => [UserToken])
    async userTokens(
        @User() user: any,
        @Args() pagination: PaginationArgs,
    ): Promise<UserToken[]> {
        return await this.userEsdt.getAllEsdtTokens(user.publicKey, pagination);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [UserNftTokens])
    async nfts(
        @Args() pagination: PaginationArgs,
        @User() user: any,
    ): Promise<Array<typeof UserNftTokens>> {
        return await this.userMetaEsdt.getAllNftTokens(
            user.publicKey,
            pagination,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [OutdatedContract])
    async userOutdatedContracts(
        @User() user: any,
    ): Promise<OutdatedContract[]> {
        return await this.userEnergy.getUserOutdatedContracts(user.publicKey);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel, { nullable: true })
    async updateEnergy(
        @User() user: any,
        @Args('includeAllContracts', { nullable: true }) includeAllContracts: boolean,
    ): Promise<TransactionModel | null> {
        return await this.userEnergy.updateFarmsEnergyForUser(user.publicKey, includeAllContracts);
    }

    @Query(() => [UserToken])
    async userCustomTokens(
        @Args() pagination: PaginationArgs,
        @Args('tokens', { type: () => [EsdtTokenInput] })
        tokens: EsdtTokenInput[],
    ): Promise<UserToken[]> {
        try {
            return await this.userEsdt.getAllEsdtTokens(
                Address.Zero().bech32(),
                pagination,
                tokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [UserNftTokens])
    async userCustomNftTokens(
        @Args() pagination: PaginationArgs,
        @Args('nfts', { type: () => [NftTokenInput] }) nfts: NftTokenInput[],
    ): Promise<UserNftToken[]> {
        try {
            return await this.userMetaEsdt.getAllNftTokens(
                Address.Zero().bech32(),
                pagination,
                nfts,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
