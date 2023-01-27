import { ChaincodeStub } from 'fabric-shim';
import * as _ from 'lodash';
import { IKeyValue, ITransportFabricStub } from '../stub';
import { ITransportFabricChaincodeSettings, TransportFabricChaincodeReceiver } from '../TransportFabricChaincodeReceiver';
import { DatabaseManager } from '../database/DatabaseManager';
import { ITransportFabricBatchDto } from './ITransportFabricBatchDto';
import { TransportFabricStubWrapper } from './TransportFabricStubWrapper';
import { TransportFabricStubBatch } from './TransportFabricStubBatch';
import { DateUtil, ITransportCommand, ExtendedError, TransformUtil, ObjectUtil, TransportLogType } from '@ts-core/common';
import { IChaincodeBatchSettings, ITransportFabricRequestPayload, TransportFabricRequestPayload, TransportFabricResponsePayload, TRANSPORT_FABRIC_COMMAND_BATCH_NAME } from '@hlf-core/transport-common';
import { NoCommandsToBatchError } from './NoCommandsToBatchError';

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

    protected async executeCommand<U>(stubOriginal: ChaincodeStub, payload: TransportFabricRequestPayload<U>, stub: ITransportFabricStub, command: ITransportCommand<U>): Promise<void> {
        if (payload.isReadonly) {
            return super.executeCommand(stubOriginal, payload, stub, command);
        }

        let result = null;
        try {
            if (this.isCommandBatch(payload)) {
                await this.batchValidate(payload, stub);
                result = await this.batch(stubOriginal, stub, payload);
            } else {
                result = await this.batchAdd(payload, stub, command);
            }
        } catch (error) {
            result = ExtendedError.create(error);
        }
        this.complete(command, result);
    }

    protected async batch<U>(stubOriginal: ChaincodeStub, stub: ITransportFabricStub, payload: TransportFabricRequestPayload<U>): Promise<ITransportFabricBatchDto> {
        let database = new DatabaseManager(this.logger, stub);
        let items = await database.getKV(TransportFabricChaincodeReceiverBatch.PREFIX);
        if (_.isEmpty(items)) {
            throw new NoCommandsToBatchError();
        }

        let wrapper = new TransportFabricStubWrapper(this.logger, stubOriginal, payload.id, payload.options, this);
        let response = {} as ITransportFabricBatchDto;
        for (let item of items) {
            let result = {} as any;
            this.debug(`Batching "${item.key}"...`);
            this.debug(`Do noting!`);
            /*
            try {
                result = await this.batchCommand(item, stubOriginal, wrapper);
            } catch (error) {
                error = ExtendedError.create(error);
                this.error(`Unable to execute batched command: ${error.message}`);
                result = TransformUtil.fromClass(error);
            } finally {
                response[this.batchKeyToHash(item.key)] = result;
            }
            */
        }
        await wrapper.destroyAsync();
        for (let item of items) {
            await stub.removeState(item.key);
        }
        return ObjectUtil.sortKeys(response, true);
    }

    protected async batchAdd<U>(payload: TransportFabricRequestPayload<U>, stub: ITransportFabricStub, command: ITransportCommand<U>): Promise<void> {
        TransportFabricRequestPayload.clearDefaultOptions(payload.options);
        delete payload.isNeedReply;
        await stub.putState(this.toBatchKey(stub, command), payload, {});
    }

    protected async batchCommand<U>(item: IKeyValue, stubOriginal: ChaincodeStub, wrapper: TransportFabricStubWrapper): Promise<TransportFabricResponsePayload<U>> {
        let payload = TransformUtil.toClass<ITransportFabricRequestPayload<U>>(TransportFabricRequestPayload, TransformUtil.toJSON(item.value));
        let stub = new TransportFabricStubBatch(this.logger, this.batchKeyToHash(item.key), this.batchKeyToDate(item.key), wrapper, payload);
        let command = this.createCommand(payload, stub);
        stub.command = command;

        let request = this.checkRequestStorage(payload, stub, command);
        super.executeCommand(stubOriginal, payload, stub, command);
        return request.handler.promise;
    }

    protected async batchValidate<U>(payload: TransportFabricRequestPayload<U>, stub: ITransportFabricStub): Promise<void> {
        // Signature was checked before
        if (payload.options.signature.algorithm !== this.settings.batch.algorithm) {
            throw new ExtendedError(`Batch command has invalid algorithm`);
        }
        if (payload.options.signature.publicKey !== this.settings.batch.publicKey) {
            throw new ExtendedError(`Batch command has invalid publicKey`);
        }
        if (!_.isNumber(this.settings.batch.timeout)) {
            return;
        }
        let time = stub.transactionDate.getTime();
        if (_.isNumber(this.batchLastTime) && time - this.batchLastTime < this.settings.batch.timeout) {
            throw new ExtendedError(`Batch command timeout is not exceeded`);
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

    protected toBatchKey<U>(stub: ITransportFabricStub, command: ITransportCommand<U>): string {
        let time = stub.transactionDate.getTime();
        return `${TransportFabricChaincodeReceiverBatch.PREFIX}/${_.padStart(time.toString(), 14, '0')}/${stub.transactionHash}/${command.id}`;
    }
}

export interface ITransportFabricChaincodeSettingsBatch extends ITransportFabricChaincodeSettings {
    batch: ITransportFabricSettingsBatch;
}

export interface ITransportFabricSettingsBatch extends IChaincodeBatchSettings {
    timeout: number;
    algorithm: string;
    publicKey: string;
    privateKey: string;
}
