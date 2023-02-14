import { Address, AddressValue, TokenPayment } from '@multiversx/sdk-core/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { gasConfig, mxConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';

@Injectable()
export class EscrowTransactionService {
    constructor(private readonly mxProxy: MXProxyService) {}

    async withdraw(senderAddress: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getEscrowContract();

        return contract.methodsExplicit
            .withdraw([new AddressValue(Address.fromString(senderAddress))])
            .withChainID(mxConfig.chainID)
            .withGasLimit(gasConfig.escrow.withdraw)
            .buildTransaction()
            .toPlainObject();
    }

    async cancelTransfer(
        senderAddress: string,
        receiverAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getEscrowContract();

        return contract.methodsExplicit
            .withdraw([
                new AddressValue(Address.fromString(senderAddress)),
                new AddressValue(Address.fromString(receiverAddress)),
            ])
            .withChainID(mxConfig.chainID)
            .withGasLimit(gasConfig.escrow.withdraw)
            .buildTransaction()
            .toPlainObject();
    }

    async lockFunds(
        senderAddress: string,
        receiverAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getEscrowContract();

        return contract.methodsExplicit
            .lockFunds([new AddressValue(Address.fromString(receiverAddress))])
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
                Address.fromString(senderAddress),
            )
            .withChainID(mxConfig.chainID)
            .withGasLimit(gasConfig.escrow.withdraw)
            .buildTransaction()
            .toPlainObject();
    }
}
