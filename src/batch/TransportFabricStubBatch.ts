import * as _ from 'lodash';
import { TransportFabricStubWrapper } from './TransportFabricStubWrapper';
import { Iterators, StateQueryResponse } from 'fabric-shim';
import { ITransportCommand, ITransportEvent, ValidateUtil, Transport } from '@ts-core/common';
import { StateProxy } from './StateProxy';
import { TransportFabricStub } from '../stub/TransportFabricStub';
import { IKeyValue } from '../stub/ITransportFabricStub';
import { ITransportFabricRequestPayload } from '@hlf-core/transport-common';

export class TransportFabricStubBatch<U = any> extends TransportFabricStub {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected state: StateProxy;
    protected wrapper: TransportFabricStubWrapper;

    // It needs for check response and commit temporary state
    public command: ITransportCommand<U>;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(transactionHash: string, transactionDate: Date, wrapper: TransportFabricStubWrapper, payload: ITransportFabricRequestPayload) {
        super(null, payload.id, payload.options, null);
        this.wrapper = wrapper;

        this.state = new StateProxy(this.getStateRawProxy);

        this._transactionHash = transactionHash;
        this._transactionDate = transactionDate;
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected async commit(): Promise<void> {
        for (let key of this.state.toRemove) {
            await this.wrapper.removeState(key);
        }
        for (let key of this.state.toPut.keys()) {
            await this.wrapper.putStateRaw(key, this.state.toPut.get(key));
        }
        this.wrapper.putEvent(this.transactionHash, this.eventsToDispatch);
    }

    protected dispatchEvents(): void {
        // do nothing, wrapper dispatch all events
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
        this.state.putState(key, item);
    }

    public async removeState(key: string): Promise<void> {
        this.state.removeState(key);
    }

    public async getStateByRange(startKey: string, endKey: string): Promise<Iterators.StateQueryIterator> {
        return this.wrapper.getStateByRange(startKey, endKey);
    }

    public async getStateByRangeWithPagination(
        startKey: string,
        endKey: string,
        pageSize: number,
        bookmark?: string
    ): Promise<StateQueryResponse<Iterators.StateQueryIterator>> {
        return this.wrapper.getStateByRangeWithPagination(startKey, endKey, pageSize, bookmark);
    }

    public async dispatch<T>(value: ITransportEvent<T>, isNeedValidate: boolean = true): Promise<void> {
        if (isNeedValidate) {
            ValidateUtil.validate(value);
        }
        this.eventsToDispatch.push(value);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public destroy(): void {
        if (this.isDestroyed) {
            return;
        }

        let isNeedCommit = Transport.isCommandAsync(this.command) && !_.isNil(this.command.error)
        if (isNeedCommit) {
            this.commit();
        }

        super.destroy();
        
        this.state.destroy();
        this.state = null;

        this.command = null;
        this.wrapper = null;
        this.getStateRawProxy = null;
    }
}
