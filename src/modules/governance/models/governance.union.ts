import { createUnionType } from '@nestjs/graphql';
import { GovernanceEnergyContract, GovernanceTokenSnapshotContract } from './governance.contract.model';
import { Description_v0, Description_v1 } from './governance.proposal.model';

export const GovernanceUnion = createUnionType({
    name: 'GovernanceTypes',
    types: () =>
        [
            GovernanceTokenSnapshotContract,
            GovernanceEnergyContract,
        ] as const,
    resolveType(governance) {
        switch (governance.constructor.name) {
            case GovernanceTokenSnapshotContract.name:
                return GovernanceTokenSnapshotContract;
            case GovernanceEnergyContract.name:
                return GovernanceEnergyContract;
        }
    },
});

export const GovernanceDescriptionUnion = createUnionType({
    name: 'GovernanceDescriptionVersions',
    types: () =>
        [
            Description_v0,
            Description_v1,
        ] as const,
    resolveType(description) {
        switch (description.constructor.name) {
            case Description_v0.name:
                return Description_v0;
            case Description_v1.name:
                return Description_v1;
        }
    },
});
