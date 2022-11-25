import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RabbitMQFarmHandlerService } from './rabbitmq.farm.handler.service';
import { RabbitMQProxyHandlerService } from './rabbitmq.proxy.handler.service';
import { CompetingRabbitConsumer } from './rabbitmq.consumers';
import { awsConfig, scAddress } from 'src/config';
import { RabbitMQEsdtTokenHandlerService } from './rabbitmq.esdtToken.handler.service';
import { farmsAddresses } from 'src/utils/farm.utils';
import { RabbitMQRouterHandlerService } from './rabbitmq.router.handler.service';
import { RabbitMQMetabondingHandlerService } from './rabbitmq.metabonding.handler.service';
import { PriceDiscoveryEventHandler } from './handlers/price.discovery.handler.service';
import {
    AddLiquidityEvent,
    AddLiquidityProxyEvent,
    ClaimRewardsProxyEvent,
    CompoundRewardsProxyEvent,
    CreatePairEvent,
    DepositEvent,
    EnterFarmProxyEvent,
    EsdtLocalBurnEvent,
    EsdtLocalMintEvent,
    ESDT_EVENTS,
    ExitFarmProxyEvent,
    FARM_EVENTS,
    MetabondingEvent,
    METABONDING_EVENTS,
    PairProxyEvent,
    PAIR_EVENTS,
    PRICE_DISCOVERY_EVENTS,
    PROXY_EVENTS,
    RemoveLiquidityEvent,
    ROUTER_EVENTS,
    SwapFixedInputEvent,
    SwapFixedOutputEvent,
    WithdrawEvent,
    SIMPLE_LOCK_ENERGY_EVENTS,
    EnergyEvent,
    RawEventType,
    FEES_COLLECTOR_EVENTS,
    DepositSwapFeesEvent,
    UpdateGlobalAmountsEvent,
    UpdateUserEnergyEvent,
    ClaimMultiEvent,
    CLAIM_REWARDS_EVENT_NAMES,
} from '@elrondnetwork/erdjs-dex';
import { RouterGetterService } from '../router/services/router.getter.service';
import { AWSTimestreamWriteService } from 'src/services/aws/aws.timestream.write';
import { LiquidityHandler } from './handlers/pair.liquidity.handler.service';
import { SwapEventHandler } from './handlers/pair.swap.handler.service';
import BigNumber from 'bignumber.js';
import { EnergyHandler } from './handlers/energy.handler.service';
import { FeesCollectorHandlerService } from './handlers/feesCollector.handler.service';
import { WeeklyRewardsSplittingHandlerService } from './handlers/weeklyRewardsSplitting.handler.service';
@Injectable()
export class RabbitMqConsumer {
    private filterAddresses: string[];
    private data: any[];

    constructor(
        private readonly routerGetter: RouterGetterService,
        private readonly liquidityHandler: LiquidityHandler,
        private readonly swapHandler: SwapEventHandler,
        private readonly wsFarmHandler: RabbitMQFarmHandlerService,
        private readonly wsProxyHandler: RabbitMQProxyHandlerService,
        private readonly wsRouterHandler: RabbitMQRouterHandlerService,
        private readonly wsEsdtTokenHandler: RabbitMQEsdtTokenHandlerService,
        private readonly wsMetabondingHandler: RabbitMQMetabondingHandlerService,
        private readonly priceDiscoveryHandler: PriceDiscoveryEventHandler,
        private readonly energyHandler: EnergyHandler,
        private readonly feesCollectorHandler: FeesCollectorHandlerService,
        private readonly weeklyRewardsSplittingHandler: WeeklyRewardsSplittingHandlerService,
        private readonly awsTimestreamWrite: AWSTimestreamWriteService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @CompetingRabbitConsumer({
        queueName: process.env.RABBITMQ_QUEUE,
        exchange: process.env.RABBITMQ_EXCHANGE,
    })
    async consumeEvents(rawEvents: any) {
        if (!rawEvents.events) {
            return;
        }
        const events: RawEventType[] = rawEvents?.events?.filter(
            (rawEvent: { address: string; identifier: string }) =>
                this.filterAddresses.find(
                    (filterAddress) =>
                        rawEvent.address === filterAddress ||
                        rawEvent.identifier === ESDT_EVENTS.ESDT_LOCAL_BURN ||
                        rawEvent.identifier === ESDT_EVENTS.ESDT_LOCAL_MINT,
                ) !== undefined,
        );

        this.data = [];
        let timestamp: number;

        for (const rawEvent of events) {
            if (
                rawEvent.data === '' &&
                rawEvent.identifier !== METABONDING_EVENTS.UNBOND &&
                rawEvent.identifier !== FEES_COLLECTOR_EVENTS.CLAIM_REWARDS
            ) {
                continue;
            }
            let eventData: any[];
            switch (rawEvent.identifier) {
                case PAIR_EVENTS.SWAP_FIXED_INPUT:
                    [eventData, timestamp] =
                        await this.swapHandler.handleSwapEvents(
                            new SwapFixedInputEvent(rawEvent),
                        );
                    this.updateIngestData(eventData);
                    break;
                case PAIR_EVENTS.SWAP_FIXED_OUTPUT:
                    [eventData, timestamp] =
                        await this.swapHandler.handleSwapEvents(
                            new SwapFixedOutputEvent(rawEvent),
                        );
                    this.updateIngestData(eventData);
                    break;
                case PAIR_EVENTS.ADD_LIQUIDITY:
                    [eventData, timestamp] =
                        await this.liquidityHandler.handleLiquidityEvent(
                            new AddLiquidityEvent(rawEvent),
                        );
                    this.updateIngestData(eventData);
                    break;
                case PAIR_EVENTS.REMOVE_LIQUIDITY:
                    [eventData, timestamp] =
                        await this.liquidityHandler.handleLiquidityEvent(
                            new RemoveLiquidityEvent(rawEvent),
                        );
                    this.updateIngestData(eventData);
                    break;
                case FARM_EVENTS.ENTER_FARM:
                    await this.wsFarmHandler.handleEnterFarmEvent(rawEvent);
                    break;
                case FARM_EVENTS.EXIT_FARM:
                    await this.wsFarmHandler.handleExitFarmEvent(rawEvent);
                    break;
                case FARM_EVENTS.CLAIM_REWARDS:
                case FEES_COLLECTOR_EVENTS.CLAIM_REWARDS:
                    const eventName = Buffer.from(rawEvent.topics[0], 'base64').toString();
                    switch (eventName) {
                        case CLAIM_REWARDS_EVENT_NAMES.UPDATE_GLOBAL_AMOUNTS:
                            await this.weeklyRewardsSplittingHandler.handleUpdateGlobalAmounts(
                                new UpdateGlobalAmountsEvent(rawEvent),
                            );
                            break;
                        case CLAIM_REWARDS_EVENT_NAMES.UPDATE_USER_ENERGY:
                            await this.weeklyRewardsSplittingHandler.handleUpdateUserEnergy(
                                new UpdateUserEnergyEvent(rawEvent),
                            );
                            break;
                        case CLAIM_REWARDS_EVENT_NAMES.CLAIM_MULTI:
                            await this.weeklyRewardsSplittingHandler.handleClaimMulti(
                                new ClaimMultiEvent(rawEvent),
                            );
                            break;
                        case CLAIM_REWARDS_EVENT_NAMES.CLAIM_REWARDS:
                            await this.wsFarmHandler.handleRewardsEvent(rawEvent);
                            break;
                    }
                    break;
                case FARM_EVENTS.COMPOUND_REWARDS:
                    await this.wsFarmHandler.handleRewardsEvent(rawEvent);
                    break;
                case PROXY_EVENTS.ADD_LIQUIDITY_PROXY:
                    await this.wsProxyHandler.handleLiquidityProxyEvent(
                        new AddLiquidityProxyEvent(rawEvent),
                    );
                    break;
                case PROXY_EVENTS.REMOVE_LIQUIDITY_PROXY:
                    await this.wsProxyHandler.handleLiquidityProxyEvent(
                        new PairProxyEvent(rawEvent),
                    );
                    break;
                case PROXY_EVENTS.ENTER_FARM_PROXY:
                    await this.wsProxyHandler.handleFarmProxyEvent(
                        new EnterFarmProxyEvent(rawEvent),
                    );
                    break;
                case PROXY_EVENTS.EXIT_FARM_PROXY:
                    await this.wsProxyHandler.handleFarmProxyEvent(
                        new ExitFarmProxyEvent(rawEvent),
                    );
                    break;
                case PROXY_EVENTS.CLAIM_REWARDS_PROXY:
                    await this.wsProxyHandler.handleRewardsProxyEvent(
                        new ClaimRewardsProxyEvent(rawEvent),
                    );
                    break;
                case PROXY_EVENTS.COMPOUND_REWARDS_PROXY:
                    await this.wsProxyHandler.handleRewardsProxyEvent(
                        new CompoundRewardsProxyEvent(rawEvent),
                    );
                    break;
                case ESDT_EVENTS.ESDT_LOCAL_MINT:
                    await this.wsEsdtTokenHandler.handleEsdtTokenEvent(
                        new EsdtLocalMintEvent(rawEvent),
                    );
                    break;
                case ESDT_EVENTS.ESDT_LOCAL_BURN:
                    await this.wsEsdtTokenHandler.handleEsdtTokenEvent(
                        new EsdtLocalBurnEvent(rawEvent),
                    );
                    break;
                case ROUTER_EVENTS.CREATE_PAIR:
                    await this.wsRouterHandler.handleCreatePairEvent(
                        new CreatePairEvent(rawEvent),
                    );
                    await this.getFilterAddresses();
                    break;
                case METABONDING_EVENTS.STAKE_LOCKED_ASSET:
                    await this.wsMetabondingHandler.handleMetabondingEvent(
                        new MetabondingEvent(rawEvent),
                    );
                    break;
                case METABONDING_EVENTS.UNSTAKE:
                    await this.wsMetabondingHandler.handleMetabondingEvent(
                        new MetabondingEvent(rawEvent),
                    );
                    break;
                case METABONDING_EVENTS.UNBOND:
                    await this.wsMetabondingHandler.handleMetabondingEvent(
                        new MetabondingEvent(rawEvent),
                    );
                    break;
                case PRICE_DISCOVERY_EVENTS.DEPOSIT:
                    [eventData, timestamp] =
                        await this.priceDiscoveryHandler.handleEvent(
                            new DepositEvent(rawEvent),
                        );
                    this.updateIngestData(eventData);
                    break;
                case PRICE_DISCOVERY_EVENTS.WITHDARW:
                    [eventData, timestamp] =
                        await this.priceDiscoveryHandler.handleEvent(
                            new WithdrawEvent(rawEvent),
                        );
                    this.updateIngestData(eventData);
                    break;
                case SIMPLE_LOCK_ENERGY_EVENTS.ENERGY_UPDATED:
                    await this.energyHandler.handleUpdateEnergy(
                        new EnergyEvent(rawEvent),
                    );
                    break;
                case FEES_COLLECTOR_EVENTS.DEPOSIT_SWAP_FEES:
                    await this.feesCollectorHandler.handleDepositSwapFeesEvent(
                        new DepositSwapFeesEvent(rawEvent),
                    );
                    break;
            }
        }

        if (Object.keys(this.data).length > 0) {
            await this.awsTimestreamWrite.ingest({
                TableName: awsConfig.timestream.tableName,
                data: this.data,
                Time: timestamp,
            });
        }
    }

    async getFilterAddresses(): Promise<void> {
        this.filterAddresses = [];
        this.filterAddresses = await this.routerGetter.getAllPairsAddress();
        this.filterAddresses.push(...farmsAddresses());
        this.filterAddresses.push(scAddress.routerAddress);
        this.filterAddresses.push(scAddress.metabondingStakingAddress);
        this.filterAddresses.push(...scAddress.priceDiscovery);
        this.filterAddresses.push(scAddress.simpleLockEnergy);
        this.filterAddresses.push(scAddress.feesCollector);
    }

    private async updateIngestData(eventData: any[]): Promise<void> {
        for (const series of Object.keys(eventData)) {
            if (this.data[series] === undefined) {
                this.data[series] = {};
            }
            for (const measure of Object.keys(eventData[series])) {
                if (
                    measure.toLowerCase().includes('volume') ||
                    measure.toLowerCase().includes('fees')
                ) {
                    this.data[series][measure] = this.data[series][measure]
                        ? new BigNumber(this.data[series][measure])
                              .plus(eventData[series][measure])
                              .toFixed()
                        : eventData[series][measure];
                } else {
                    this.data[series][measure] = eventData[series][measure];
                }
            }
        }
    }
}
