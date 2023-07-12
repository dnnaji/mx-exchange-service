import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { ProposalVotes } from '../models/proposal.votes.model';
import { Description, GovernanceProposal } from '../models/governance.proposal.model';
import { GovernanceAction } from '../models/governance.action.model';
import { EsdtTokenPaymentModel } from '../../tokens/models/esdt.token.payment.model';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';

@Injectable()
export class GovernanceAbiService
    extends GenericAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async minEnergyForPropose(scAddress: string): Promise<string> {
        return await this.minEnergyForProposeRaw(scAddress);
    }

    async minEnergyForProposeRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getMinEnergyForPropose();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toFixed();
    }
    
    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async minFeeForPropose(scAddress: string): Promise<string> {
        return await this.minFeeForProposeRaw(scAddress);
    }

    async minFeeForProposeRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getMinFeeForPropose();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async quorum(scAddress: string): Promise<string> {
        return await this.quorumRaw(scAddress);
    }

    async quorumRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getQuorum();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async votingDelayInBlocks(scAddress: string): Promise<number> {
        return await this.votingDelayInBlocksRaw(scAddress);
    }

    async votingDelayInBlocksRaw(scAddress: string): Promise<number> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getVotingDelayInBlocks();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async votingPeriodInBlocks(scAddress: string): Promise<number> {
        return await this.votingPeriodInBlocksRaw(scAddress);
    }

    async votingPeriodInBlocksRaw(scAddress: string): Promise<number> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getVotingPeriodInBlocks();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feeTokenId(scAddress: string): Promise<string> {
        return await this.feeTokenIdRaw(scAddress);
    }

    async feeTokenIdRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getFeeTokenId();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async withdrawPercentageDefeated(scAddress: string): Promise<number> {
        return await this.withdrawPercentageDefeatedRaw(scAddress);
    }

    async withdrawPercentageDefeatedRaw(scAddress: string): Promise<number> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getWithdrawPercentageDefeated();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposals(scAddress: string): Promise<GovernanceProposal[]> {
        return await this.proposalsRaw(scAddress);
    }

    async proposalsRaw(scAddress: string): Promise<GovernanceProposal[]> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methodsExplicit.getProposals();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().map((proposal: any) => {
            const actions = proposal.actions?.map((action: any) => {
                return new GovernanceAction({
                    arguments: action.arguments.toString().split(','),
                    destAddress: action.dest_address.toString(),
                    functionName: action.function_name.toString(),
                    gasLimit: action.gas_limit.toNumber(),
                });
            });
            return new GovernanceProposal({
                contractAddress: scAddress,
                proposalId: proposal.proposal_id.toNumber(),
                proposer: proposal.proposer.bech32(),
                actions,
                description: new Description(JSON.parse(proposal.description.toString())),
                feePayment:  new EsdtTokenPaymentModel(
                    EsdtTokenPayment.fromDecodedAttributes(proposal.fee_payment)
                ),
                proposalStartBlock: proposal.proposal_start_block.toNumber(),
                minimumQuorum: proposal.minimum_quorum.toNumber(),
                totalEnergy: proposal.total_energy.toFixed(),
                votingDelayInBlocks: proposal.voting_delay_in_blocks.toNumber(),
                votingPeriodInBlocks: proposal.voting_period_in_blocks.toNumber(),
                withdrawPercentageDefeated: proposal.withdraw_percentage_defeated.toNumber(),
            });
        });
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async userVotedProposals(scAddress: string, userAddress: string): Promise<GovernanceProposal[]> {
        return await this.userVotedProposalsRaw(scAddress, userAddress);
    }

    async userVotedProposalsRaw(scAddress: string, userAddress: string): Promise<GovernanceProposal[]> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getUserVotedProposals([userAddress]);
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().map((proposal: any) => {
            return new GovernanceProposal({

            });
        });
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposalVotes(scAddress: string, proposalId: number): Promise<ProposalVotes> {
        return await this.proposalVotesRaw(scAddress, proposalId);
    }

    async proposalVotesRaw(scAddress: string, proposalId: number): Promise<ProposalVotes> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getProposalVotes([proposalId]);
        const response = await this.getGenericData(interaction);

        if (!response.firstValue) {
            return ProposalVotes.default();
        }
        const votes = response.firstValue.valueOf();
        return new ProposalVotes({
            upVotes: votes.up_votes.toFixed(),
            downVotes: votes.down_votes.toFixed(),
            downVetoVotes: votes.down_veto_votes.toFixed(),
            abstainVotes: votes.abstain_votes.toFixed(),
            quorum: votes.quorum.toFixed()
        });
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposalStatus(scAddress: string, proposalId: number): Promise<string> {
        return await this.proposalStatusRaw(scAddress, proposalId);
    }

    async proposalStatusRaw(scAddress: string, proposalId: number): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getProposalStatus([proposalId]);
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().name;
    }

    // TODO: decide if remove or not
    // @ErrorLoggerAsync({className: GovernanceAbiService.name})
    // @GetOrSetCache({
    //     baseKey: 'governance',
    //     remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
    //     localTtl: CacheTtlInfo.ContractState.localTtl,
    // })
    // async currentQuorum(): Promise<string> {
    //     return await this.currentQuorumRaw();
    // }
    //
    // async currentQuorumRaw(): Promise<string> {
    //     const contract = await this.mxProxy.getGovernanceSmartContract();
    //     const interaction = contract.methods.getCurrentQuorum();
    //     const response = await this.getGenericData(interaction);
    //
    //     return response.firstValue.valueOf().toFixed();
    // }

    // @ErrorLoggerAsync({className: GovernanceAbiService.name})
    // @GetOrSetCache({
    //     baseKey: 'governance',
    //     remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
    //     localTtl: CacheTtlInfo.ContractState.localTtl,
    // })
    // async proposer(proposalId: number): Promise<string> {
    //     return await this.proposerRaw(proposalId);
    // }
    //
    // async proposerRaw(proposalId: number): Promise<string> {
    //     const contract = await this.mxProxy.getGovernanceSmartContract();
    //     const interaction = contract.methods.getProposer([proposalId]);
    //     const response = await this.getGenericData(interaction);
    //
    //     return response.firstValue.valueOf();
    // }

    // @ErrorLoggerAsync({className: GovernanceAbiService.name})
    // @GetOrSetCache({
    //     baseKey: 'governance',
    //     remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
    //     localTtl: CacheTtlInfo.ContractState.localTtl,
    // })
    // async proposalDescription(proposalId: number): Promise<string> {
    //     return await this.proposalDescriptionRaw(proposalId);
    // }
    //
    // async proposalDescriptionRaw(proposalId: number): Promise<string> {
    //     const contract = await this.mxProxy.getGovernanceSmartContract();
    //     const interaction = contract.methods.getProposalDescription([proposalId]);
    //     const response = await this.getGenericData(interaction);
    //
    //     return response.firstValue.valueOf();
    // }
    //
    // @ErrorLoggerAsync({className: GovernanceAbiService.name})
    // @GetOrSetCache({
    //     baseKey: 'governance',
    //     remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
    //     localTtl: CacheTtlInfo.ContractState.localTtl,
    // })
    // async proposalActions(proposalId: number): Promise<string[]> {
    //     return await this.proposalActionsRaw(proposalId);
    // }
    //
    // async proposalActionsRaw(proposalId: number): Promise<string[]> {
    //     const contract = await this.mxProxy.getGovernanceSmartContract();
    //     const interaction = contract.methods.getProposalActions([proposalId]);
    //     const response = await this.getGenericData(interaction);
    //
    //     return response.values.map((value) => value.valueOf());
    // }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feesCollectorAddress(scAddress: string): Promise<string> {
        return await this.feesCollectorAddressRaw(scAddress);
    }

    async feesCollectorAddressRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getFeesCollectorAddress();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async energyFactoryAddress(scAddress: string): Promise<string> {
        return await this.energyFactoryAddressRaw(scAddress);
    }

    async energyFactoryAddressRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getEnergyFactoryAddress();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().bech32();
    }
}
