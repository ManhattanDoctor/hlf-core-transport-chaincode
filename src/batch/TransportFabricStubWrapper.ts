import { ITransportFabricCommandOptions } from '@hlf-core/transport-common';
import { ITransportEvent, ExtendedError, TransformUtil, ObjectUtil, ITransportReceiver } from '@ts-core/common';
import { ChaincodeStub, Iterators } from 'fabric-shim';
import * as _ from 'lodash';
import { TransportFabricStub } from '../stub/TransportFabricStub';
import { IKeyValue } from '../stub/ITransportFabricStub';
import { GetStateRaw, StateProxy } from './StateProxy';

export class TransportFabricStubWrapper extends TransportFabricStub {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected state: StateProxy;
    protected events: Map<string, Array<ITransportEvent<any>>>;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(stub: ChaincodeStub, requestId: string, options: ITransportFabricCommandOptions, transport: ITransportReceiver) {
        super(stub, requestId, options, transport);
        this.state = new StateProxy(this.getStateRawProxy);
        this.events = new Map();
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected dispatchEvents(): void {
        if (_.isNil(this.events) || this.events.size === 0) {
            return;
        }
        let item = {};
        console.log('Settings events', this.events);
        this.events.forEach((events, transactionHash) => item[transactionHash] = TransformUtil.fromClassMany(events));
        this.setEvent(ObjectUtil.sortKeys(item, true));
    }

    protected getStateRawProxy: GetStateRaw = (item: string): Promise<string> => super.getStateRaw(item);

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async complete(): Promise<void> {
        for (let key of this.state.toRemove) {
            await super.removeState(key);
        }
        for (let key of this.state.toPut.keys()) {
            await super.putStateRaw(key, this.state.toPut.get(key));
        }
        this.destroy();
    }

    // --------------------------------------------------------------------------
    //
    //  Public Override Methods
    //
    // --------------------------------------------------------------------------

    public async loadKV(iterator: Iterators.StateQueryIterator): Promise<Array<IKeyValue>> {
        let items = await super.loadKV(iterator);
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

    public putEvent<T>(transactionHash: string, items: Array<ITransportEvent<T>>): void {
        if (this.events.has(transactionHash)) {
            throw new ExtendedError(`Events for "${transactionHash}" already putted`);
        }
        this.events.set(transactionHash, items);
    }

    public async dispatch<T>(value: ITransportEvent<T>, isNeedValidate: boolean = true): Promise<void> {
        throw new ExtendedError(`Can't dispatch event directly, use TransportFabricStubBatch`);
    }

    public destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super.destroy();
        this.getStateRawProxy = null;

        this.events.clear();
        this.events = null;

        this.state.destroy();
        this.state = null;
    }
}
