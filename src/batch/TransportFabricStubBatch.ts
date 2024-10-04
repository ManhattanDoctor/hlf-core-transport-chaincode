
import { ITransportFabricRequestPayload } from '@hlf-core/transport-common';
import { ITransportCommand, ITransportEvent, ValidateUtil, Transport, ILogger } from '@ts-core/common';
import { TransportFabricStubBatchEventWrapper } from './TransportFabricStubBatchEventWrapper';
import { TransportFabricStub, IKeyValue } from '../stub';
import { StateProxy } from '../state';
import { Iterators, StateQueryResponse } from 'fabric-shim';
import * as _ from 'lodash';

export class TransportFabricStubBatch<U = any> extends TransportFabricStub {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected state: StateProxy;
    protected wrapper: TransportFabricStubBatchEventWrapper;

    // It needs for check response and commit temporary state
    public command: ITransportCommand<U>;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, transactionHash: string, transactionDate: Date, wrapper: TransportFabricStubBatchEventWrapper, payload: ITransportFabricRequestPayload) {
        super(logger, null, payload.id, payload.options, null);
        this.wrapper = wrapper;
        this.state = new StateProxy(logger, this.getStateRawProxy);

        this._transaction = { hash: transactionHash, date: transactionDate };
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected async commit(): Promise<void> {
        if (Transport.isCommandAsync(this.command) && !_.isNil(this.command.error)) {
            return;
        }
        if (!_.isEmpty(this.events)) {
            this.wrapper.addEvent(this.transaction.hash, this.events);
        }
        for (let key of this.state.toRemove) {
            await this.wrapper.removeState(key);
        }
        for (let key of this.state.toPut.keys()) {
            await this.wrapper.putStateRaw(key, this.state.toPut.get(key));
        }
    }

    protected dispatchEvents(): void {
        // do nothing, wrapper dispatch all events
    }

    protected _destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super._destroy();

        if (!_.isNil(this.state)) {
            this.state.destroy();
            this.state = null;
        }

        this.command = null;
        this.wrapper = null;
        this.getStateRawProxy = null;
    }

    // --------------------------------------------------------------------------
    //
    //  Public State Methods
    //
    // --------------------------------------------------------------------------

    protected getStateRawProxy = (item: string): Promise<string> => this.wrapper.getStateRaw(item);

    public async loadKV(iterator: Iterators.StateQueryIterator): Promise<Array<IKeyValue>> {
        let items = await this.wrapper.loadKV(iterator);
        this.state.checkKV(items);
        return items;
    }

    public async getStateRaw(key: string): Promise<string> {
        return this.state.getState(key);
    }

    public async putStateRaw(key: string, item: string): Promise<void> {
        return this.state.putState(key, item);
    }

    public async removeState(key: string): Promise<void> {
        return this.state.removeState(key);
    }

    public async getStateByRange(startKey: string, endKey: string): Promise<Iterators.StateQueryIterator> {
        return this.wrapper.getStateByRange(startKey, endKey);
    }

    public async getStateByRangeWithPagination(startKey: string, endKey: string, pageSize: number, bookmark?: string): Promise<StateQueryResponse<Iterators.StateQueryIterator>> {
        return this.wrapper.getStateByRangeWithPagination(startKey, endKey, pageSize, bookmark);
    }

    public async dispatch<T>(value: ITransportEvent<T>): Promise<void> {
        ValidateUtil.validate(value);
        this.events.push(value);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async destroyAsync(): Promise<void> {
        await this.commit();
        return super.destroyAsync();
    }
}
