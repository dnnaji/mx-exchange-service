import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { convertToVoteType, GOVERNANCE_EVENTS, VoteEvent } from '../../governance/event-decoder/governance.event';
import { GovernanceSetterService } from '../../governance/services/governance.setter.service';
import { GovernanceTokenSnapshotAbiService } from '../../governance/services/governance.abi.service';
import BigNumber from 'bignumber.js';
import { ProposalVotes } from '../../governance/models/governance.proposal.votes.model';
import { GovernanceComputeService } from '../../governance/services/governance.compute.service';

@Injectable()
export class GovernanceHandlerService {
    private invalidatedKeys = [];

    constructor(
        private readonly governanceAbi: GovernanceTokenSnapshotAbiService,
        private readonly governanceCompute: GovernanceComputeService,
        private readonly governanceSetter: GovernanceSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleGovernanceVoteEvent(
        event: VoteEvent,
        voteType: GOVERNANCE_EVENTS,
    ): Promise<void> {
        const topics = event.getTopics();
        const userVotedProposals = await this.governanceAbi.userVotedProposals(event.address, topics.voter);
        userVotedProposals.push(topics.proposalId);

        let cacheKey = await this.governanceSetter.userVotedProposals(
            event.address,
            topics.voter,
            [...new Set(userVotedProposals)],
        );
        this.invalidatedKeys.push(cacheKey);

        const userVotedProposalsWithVoteType = await this.governanceCompute.userVotedProposalsWithVoteType(event.address, topics.voter);
        userVotedProposalsWithVoteType.push({
            proposalId: topics.proposalId,
            vote: convertToVoteType(voteType),
        });
        const uniqueUserVotedProposalsWithVoteType = userVotedProposalsWithVoteType.filter((v, i, a) =>
            a.findIndex(t => (t.proposalId === v.proposalId)) === i
        );
        cacheKey = await this.governanceSetter.userVotedProposalsWithVoteType(
            event.address,
            topics.voter,
            uniqueUserVotedProposalsWithVoteType,
        );
        this.invalidatedKeys.push(cacheKey);

        const proposalVotes = await this.increaseProposalVotes(event, voteType);
        cacheKey = await this.governanceSetter.proposalVotes(
            event.address,
            topics.proposalId,
            proposalVotes
        );
        this.invalidatedKeys.push(cacheKey);

        await this.deleteCacheKeys();
        await this.pubSub.publish(voteType, {
            voteEvent: event,
        });
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }

    async increaseProposalVotes(event: VoteEvent, voteType: GOVERNANCE_EVENTS): Promise<ProposalVotes> {
        const topics = event.getTopics();
        const proposalVotes = await this.governanceAbi.proposalVotes(event.address, topics.proposalId)

        proposalVotes.totalVotes = new BigNumber(proposalVotes.totalVotes).plus(topics.nrVotes).toFixed();
        proposalVotes.quorum = new BigNumber(proposalVotes.totalVotes).dividedBy(topics.quorumUsed).multipliedBy(100).toFixed();
        switch (voteType) {
            case GOVERNANCE_EVENTS.UP:
                proposalVotes.upVotes = new BigNumber(proposalVotes.upVotes).plus(topics.nrVotes).toFixed();
                proposalVotes.upPercentage = new BigNumber(proposalVotes.upVotes).dividedBy(proposalVotes.totalVotes).multipliedBy(100).toFixed(2);
                break;
            case GOVERNANCE_EVENTS.DOWN:
                proposalVotes.downVotes = new BigNumber(proposalVotes.downVotes).plus(topics.nrVotes).toFixed();
                proposalVotes.downPercentage = new BigNumber(proposalVotes.downVotes).dividedBy(proposalVotes.totalVotes).multipliedBy(100).toFixed(2);
                break;
            case GOVERNANCE_EVENTS.ABSTAIN:
                proposalVotes.abstainVotes = new BigNumber(proposalVotes.abstainVotes).plus(topics.nrVotes).toFixed();
                proposalVotes.abstainPercentage = new BigNumber(proposalVotes.abstainVotes).dividedBy(proposalVotes.totalVotes).multipliedBy(100).toFixed(2);
                break;
            case GOVERNANCE_EVENTS.DOWN_VETO:
                proposalVotes.downVotes = new BigNumber(proposalVotes.downVotes).plus(topics.nrVotes).toFixed();
                proposalVotes.downPercentage = new BigNumber(proposalVotes.downVotes).dividedBy(proposalVotes.totalVotes).multipliedBy(100).toFixed(2);
                break;
        }

        return proposalVotes;
    }
}
