import { RouterService } from './services/router.service';
import {
    Resolver,
    Query,
    ResolveField,
    Args,
    Int,
    Float,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { GetPairsArgs, PairModel } from '../pair/models/pair.model';
import { EnableSwapByUserConfig, FactoryModel } from './models/factory.model';
import { RouterTransactionService } from './services/router.transactions.service';
import { constantsConfig } from 'src/config';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { RemoteConfigGetterService } from '../remote-config/remote-config.getter.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { GqlAdminGuard } from '../auth/gql.admin.guard';
import { SetLocalRoleOwnerArgs } from './models/router.args';
import { PairFilterArgs } from './models/filter.args';
import { RouterAbiService } from './services/router.abi.service';
import { RouterComputeService } from './services/router.compute.service';

@Resolver(() => FactoryModel)
export class RouterResolver {
    constructor(
        private readonly routerService: RouterService,
        private readonly routerabi: RouterAbiService,
        private readonly routerCompute: RouterComputeService,
        private readonly routerTransaction: RouterTransactionService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
    ) {}

    @Query(() => FactoryModel)
    async factory() {
        return this.routerService.getFactory();
    }

    @ResolveField()
    async commonTokensForUserPairs(): Promise<string[]> {
        return this.routerabi.commonTokensForUserPairs();
    }

    @ResolveField()
    async enableSwapByUserConfig(): Promise<EnableSwapByUserConfig> {
        return this.routerabi.enableSwapByUserConfig();
    }

    @ResolveField(() => Int)
    async pairCount() {
        return this.routerCompute.pairCount();
    }

    @ResolveField(() => Int)
    async totalTxCount() {
        return this.routerCompute.totalTxCount();
    }

    @ResolveField()
    async totalValueLockedUSD() {
        return this.routerCompute.totalLockedValueUSD();
    }

    @ResolveField()
    async totalVolumeUSD24h() {
        return this.routerCompute.totalVolumeUSD('24h');
    }

    @ResolveField()
    async totalFeesUSD24h() {
        return this.routerCompute.totalFeesUSD('24h');
    }

    @ResolveField()
    async maintenance() {
        return this.remoteConfigGetterService.getMaintenanceFlagValue();
    }

    @ResolveField()
    async multiSwapStatus(): Promise<boolean> {
        return this.remoteConfigGetterService.getMultiSwapStatus();
    }

    @ResolveField(() => Boolean)
    async pairCreationEnabled(): Promise<boolean> {
        return this.routerabi.pairCreationEnabled();
    }

    @ResolveField(() => Boolean)
    async state(): Promise<boolean> {
        return this.routerabi.state();
    }

    @ResolveField(() => String)
    async owner(): Promise<string> {
        return this.routerabi.owner();
    }

    @ResolveField(() => String)
    async pairTemplateAddress(): Promise<string> {
        return this.routerabi.pairTemplateAddress();
    }

    @ResolveField(() => String)
    async temporaryOwnerPeriod(): Promise<string> {
        return this.routerabi.temporaryOwnerPeriod();
    }

    @ResolveField(() => Float)
    async defaultSlippage(): Promise<number> {
        return constantsConfig.slippage.DEFAULT_SLIPPAGE;
    }

    @ResolveField(() => [Float])
    async slippageValues(): Promise<number[]> {
        return constantsConfig.slippage.SLIPPAGE_VALUES;
    }

    @ResolveField(() => Float)
    async minSlippage(): Promise<number> {
        return constantsConfig.slippage.SLIPPAGE_VALUES[0];
    }

    @ResolveField(() => Float)
    async maxSlippage(): Promise<number> {
        return constantsConfig.slippage.MAX_SLIPPAGE;
    }

    @ResolveField(() => Float)
    async minSwapAmount(): Promise<number> {
        return constantsConfig.MIN_SWAP_AMOUNT;
    }

    @ResolveField(() => String)
    async lastErrorMessage(): Promise<string> {
        return this.routerabi.lastErrorMessage();
    }

    @Query(() => [String])
    async pairAddresses(): Promise<string[]> {
        return this.routerabi.pairsAddress();
    }

    @Query(() => [PairModel])
    async pairs(
        @Args() page: GetPairsArgs,
        @Args() filter: PairFilterArgs,
    ): Promise<PairModel[]> {
        return this.routerService.getAllPairs(page.offset, page.limit, filter);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async createPair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.routerTransaction.createPair(
            user.address,
            firstTokenID,
            secondTokenID,
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async upgradePair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @Args('fees', { type: () => [Float] }) fees: number[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.upgradePair(
            firstTokenID,
            secondTokenID,
            fees,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async issueLPToken(
        @Args('address') address: string,
        @Args('lpTokenName') lpTokenName: string,
        @Args('lpTokenTicker') lpTokenTicker: string,
    ): Promise<TransactionModel> {
        return this.routerTransaction.issueLpToken(
            address,
            lpTokenName,
            lpTokenTicker,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async setLocalRoles(
        @Args('address') address: string,
    ): Promise<TransactionModel> {
        return this.routerTransaction.setLocalRoles(address);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setState(
        @Args('address') address: string,
        @Args('enable') enable: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setState(address, enable);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setFee(
        @Args('pairAddress') pairAddress: string,
        @Args('feeToAddress') feeToAddress: string,
        @Args('feeTokenID') feeTokenID: string,
        @Args('enable') enable: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setFee(
            pairAddress,
            feeToAddress,
            feeTokenID,
            enable,
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPairCreationEnabled(
        @Args('enabled') enabled: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setPairCreationEnabled(enabled);
    }

    @Query(() => String)
    async getLastErrorMessage(): Promise<string> {
        return await this.routerabi.lastErrorMessage();
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async clearPairTemporaryOwnerStorage(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.clearPairTemporaryOwnerStorage();
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setTemporaryOwnerPeriod(
        @Args('periodBlocks') periodBlocks: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setTemporaryOwnerPeriod(periodBlocks);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPairTemplateAddress(
        @Args('address') address: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setPairTemplateAddress(address);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setLocalRolesOwner(
        @Args({ name: 'args', type: () => SetLocalRoleOwnerArgs })
        args: SetLocalRoleOwnerArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setLocalRolesOwner(args);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async removePair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.removePair(firstTokenID, secondTokenID);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async setSwapEnabledByUser(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.routerTransaction.setSwapEnabledByUser(
            user.address,
            inputTokens,
        );
    }
}
