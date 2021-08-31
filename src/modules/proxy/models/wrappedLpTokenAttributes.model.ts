import {
    BigUIntType,
    StructFieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WrappedLpTokenAttributesModel {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field()
    lpTokenID: string;
    @Field()
    lpTokenTotalAmount: string;
    @Field()
    lockedAssetsInvested: string;
    @Field(type => Int)
    lockedAssetsNonce: number;

    constructor(init?: Partial<WrappedLpTokenAttributesModel>) {
        Object.assign(this, init);
    }

    toPlainObject() {
        return {
            lpTokenID: this.lpTokenID,
            lpTokenTotalAmount: this.lpTokenTotalAmount,
            lockedAssetsInvested: this.lockedAssetsInvested,
            lockedAssetsNonce: this.lockedAssetsNonce,
        };
    }

    static fromDecodedAttributes(
        decodedAttributes: any,
    ): WrappedLpTokenAttributesModel {
        return new WrappedLpTokenAttributesModel({
            lpTokenID: decodedAttributes.lpTokenID.toString(),
            lpTokenTotalAmount: decodedAttributes.lpTokenTotalAmount.toFixed(),
            lockedAssetsInvested: decodedAttributes.lockedAssetsInvested.toFixed(),
            lockedAssetsNonce: decodedAttributes.lockedAssetsNonce.toNumber(),
        });
    }

    static getStructure(): StructType {
        return new StructType('WrappedLpTokenAttributes', [
            new StructFieldDefinition(
                'lpTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition(
                'lpTokenTotalAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'lockedAssetsInvested',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition('lockedAssetsNonce', '', new U64Type()),
        ]);
    }
}
