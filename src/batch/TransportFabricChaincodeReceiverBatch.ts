import { ChaincodeStub } from 'fabric-shim';
import { ITransportFabricChaincodeSettings, TransportFabricChaincodeReceiver } from '../TransportFabricChaincodeReceiver';
import { ITransportFabricBatchDto } from './ITransportFabricBatchDto';
import { TransportFabricStubBatch } from './TransportFabricStubBatch';
import { DateUtil, ITransportCommand, ExtendedError, TransformUtil, ObjectUtil, TransportLogType } from '@ts-core/common';
import { IChaincodeBatchSettings, ITransportFabricRequestPayload, TransportFabricRequestPayload, TransportFabricResponsePayload, TRANSPORT_FABRIC_COMMAND_BATCH_NAME } from '@hlf-core/transport-common';
import { CommandBatchNoCommandsToBatchError, CommandBatchSignatureAlgorithmInvalidError, CommandBatchSignaturePublicKeyInvalidError, CommandBatchTimeoutNotExceedError } from '../Error';
import { TransportFabricStubBatchEventWrapper } from './TransportFabricStubBatchEventWrapper';
import { DatabaseManager, IKeyValue, IStub } from '@hlf-core/chaincode';
import * as _ from 'lodash';

export class TransportFabricChaincodeReceiverBatch extends TransportFabricChaincodeReceiver<ITransportFabricChaincodeSettingsBatch> {
    // --------------------------------------------------------------------------
    //
    //  Constants
    //
    // --------------------------------------------------------------------------

    private static PREFIX = 'COMMAND_BATCH';

    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected batchLastTime: number;

    // --------------------------------------------------------------------------
    //
    //  Receive Message Methods
    //
    // --------------------------------------------------------------------------

    protected async executeCommand<U>(stubOriginal: ChaincodeStub, payload: TransportFabricRequestPayload<U>, stub: IStub, command: ITransportCommand<U>): Promise<void> {
        if (payload.isReadonly) {
            return super.executeCommand(stubOriginal, payload, stub, command);
        }

        let response = null;
        try {
            if (this.isCommandBatch(payload)) {
                await this.batchValidate(payload, stub);
                response = await this.batch(stubOriginal, stub, payload);
            } else {
                response = await this.batchAdd(payload, stub, command);
            }
        } catch (error) {
            response = ExtendedError.create(error);
        }
        this.complete(command, response);
    }

    protected async batch<U>(stubOriginal: ChaincodeStub, stub: IStub, payload: TransportFabricRequestPayload<U>): Promise<ITransportFabricBatchDto> {
        let kvs = await DatabaseManager.getKV(stub, TransportFabricChaincodeReceiverBatch.PREFIX);
        if (_.isEmpty(kvs)) {
            throw new CommandBatchNoCommandsToBatchError();
        }

        console.log('Called batch', kvs);
        let item = {} as ITransportFabricBatchDto;
        let wrapper = new TransportFabricStubBatchEventWrapper(this.logger, stubOriginal, payload.id, payload.options, this);
        for (let kv of kvs) {
            await stub.removeState(kv.key);
            let response = {} as any;
            try {
                response = await this.batchCommand(kv, stubOriginal, wrapper);
            } catch (error) {
                this.error(`Unable to execute batched command: ${error.message}`);
                response = TransformUtil.fromClass(ExtendedError.create(error));
            } finally {
                console.log(`Command "${this.batchKeyToHash(kv.key)}" response:`, response);
                item[this.batchKeyToHash(kv.key)] = response;
            }
        }
        await wrapper.destroyAsync();
        return ObjectUtil.sortKeys(item, true);
    }

    protected async batchAdd<U>(payload: TransportFabricRequestPayload<U>, stub: IStub, command: ITransportCommand<U>): Promise<void> {
        TransportFabricRequestPayload.clearDefaultOptions(payload.options);
        delete payload.isNeedReply;
        await stub.putState(this.toBatchKey(stub, command), payload, {});
    }

    protected async batchCommand<U>(item: IKeyValue, stubOriginal: ChaincodeStub, wrapper: TransportFabricStubBatchEventWrapper): Promise<TransportFabricResponsePayload<U>> {
        let payload = TransformUtil.toClass<ITransportFabricRequestPayload<U>>(TransportFabricRequestPayload, TransformUtil.toJSON(item.value));
        let stub = new TransportFabricStubBatch(this.logger, this.batchKeyToHash(item.key), this.batchKeyToDate(item.key), wrapper, payload);
        let command = this.createCommand(payload, stub);
        stub.command = command;

        let request = this.checkRequestStorage(payload, stub, command);
        super.executeCommand(stubOriginal, payload, stub, command);
        return request.handler.promise;
    }

    protected async batchValidate<U>(payload: TransportFabricRequestPayload<U>, stub: IStub): Promise<void> {
        // Signature was checked before
        if (payload.options.signature.algorithm !== this.settings.batch.algorithm) {
            throw new CommandBatchSignatureAlgorithmInvalidError({ value: payload.options.signature.algorithm, expected: this.settings.batch.algorithm });
        }
        if (payload.options.signature.publicKey !== this.settings.batch.publicKey) {
            throw new CommandBatchSignaturePublicKeyInvalidError({ value: payload.options.signature.publicKey, expected: this.settings.batch.publicKey });
        }

        if (!_.isNumber(this.settings.batch.timeout)) {
            return;
        }
        let time = stub.transaction.date.getTime();
        if (_.isNumber(this.batchLastTime) && time - this.batchLastTime < this.settings.batch.timeout) {
            throw new CommandBatchTimeoutNotExceedError();
        }
        this.batchLastTime = time;
    }

    protected isCommandBatch<U>(item: ITransportCommand<U> | TransportFabricRequestPayload<U>): boolean {
        return !_.isNil(item) ? item.name === TRANSPORT_FABRIC_COMMAND_BATCH_NAME : false;
    }

    protected isNonSignedCommand<U>(command: ITransportCommand<U>): boolean {
        return !this.isCommandBatch(command) ? super.isNonSignedCommand(command) : false;
    }

    protected logCommand<U>(command: ITransportCommand<U>, type: TransportLogType): void {
        if (this.isCommandBatch(command)) {
            switch (type) {
                case TransportLogType.REQUEST_SENDED:
                case TransportLogType.REQUEST_RECEIVED:
                case TransportLogType.RESPONSE_SENDED:
                case TransportLogType.RESPONSE_RECEIVED:
                case TransportLogType.RESPONSE_NO_REPLY:
                case TransportLogType.RESPONSE_NO_REPLY_ERROR:
                    return;
            }
        }
        return super.logCommand(command, type);
    }

    // --------------------------------------------------------------------------
    //
    //  Batch Key Methods
    //
    // --------------------------------------------------------------------------

    protected batchKeyToHash(item: string): string {
        return item.split('/')[2];
    }

    protected batchKeyToDate(item: string): Date {
        return DateUtil.getDate(Number(item.split('/')[1]));
    }

    protected toBatchKey<U>(stub: IStub, command: ITransportCommand<U>): string {
        let time = stub.transaction.date.getTime();
        return `${TransportFabricChaincodeReceiverBatch.PREFIX}/${_.padStart(time.toString(), 14, '0')}/${stub.transaction.hash}/${command.id}`;
    }
}

export interface ITransportFabricChaincodeSettingsBatch extends ITransportFabricChaincodeSettings {
    batch: ITransportFabricSettingsBatch;
}

export interface ITransportFabricSettingsBatch extends IChaincodeBatchSettings {
    timeout: number;
    algorithm: string;
    publicKey: string;
}
