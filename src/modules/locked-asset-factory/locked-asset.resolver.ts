import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { LockedAssetService } from './services/locked-asset.service';
import {
    LockedAssetAttributes,
    LockedAssetModel,
    UnlockMileStoneModel,
} from './models/locked-asset.model';
import { UnlockAssetsArs } from './models/locked-asset.args';
import { TransactionsLockedAssetService } from './services/transaction-locked-asset.service';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import { ApolloError } from 'apollo-server-express';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';

@Resolver(() => LockedAssetModel)
export class LockedAssetResolver {
    constructor(
        private readonly lockedAssetService: LockedAssetService,
        private readonly transactionsService: TransactionsLockedAssetService,
    ) {}

    @ResolveField()
    async lockedToken(): Promise<NftCollection> {
        try {
            return await this.lockedAssetService.getLockedToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async unlockMilestones(): Promise<UnlockMileStoneModel[]> {
        try {
            return await this.lockedAssetService.getDefaultUnlockPeriod();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => LockedAssetModel)
    async lockedAssetFactory(): Promise<LockedAssetModel> {
        return await this.lockedAssetService.getLockedAssetInfo();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unlockAssets(
        @Args() args: UnlockAssetsArs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsService.unlockAssets(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeLockedAssetTokens(
        @Args('tokens', { type: () => [InputTokenModel] })
        tokens: InputTokenModel[],
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.transactionsService.mergeLockedAssetTokens(
                user.publicKey,
                tokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [LockedAssetAttributes])
    async decodeLockedAssetAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<LockedAssetAttributes[]> {
        return this.lockedAssetService.decodeLockedAssetAttributes(args);
    }
}
