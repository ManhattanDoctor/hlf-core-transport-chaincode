import { ITransportFabricCommandOptions } from '@hlf-core/transport-common';
import { ITransportEvent, ExtendedError, ILogger, ITransportReceiver } from '@ts-core/common';
import { ChaincodeStub, Iterators } from 'fabric-shim';
import { IKeyValue, TransportFabricStub } from '../stub';
import { GetStateRaw, StateProxy } from '../state';
import * as _ from 'lodash';

export class TransportFabricStubStateProxy extends TransportFabricStub {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected state: StateProxy;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: ChaincodeStub, requestId: string, options: ITransportFabricCommandOptions, transport: ITransportReceiver) {
        super(logger, stub, requestId, options, transport);
        this.state = new StateProxy(logger, this.getStateRawProxy);
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected async commit(): Promise<void> {
        for (let key of this.state.toRemove) {
            await super.removeState(key);
        }
        for (let key of this.state.toPut.keys()) {
            await super.putStateRaw(key, this.state.toPut.get(key));
        }
    }

    protected _destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super._destroy();

        this.state.destroy();
        this.state = null;

        this.getStateRawProxy = null;
    }

    protected getStateRawProxy: GetStateRaw = (item: string): Promise<string> => super.getStateRaw(item);

    // --------------------------------------------------------------------------
    //
    //  Public Methods
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

    public async dispatch<T>(value: ITransportEvent<T>): Promise<void> {
        throw new ExtendedError(`Can't dispatch event directly, use TransportFabricStubBatch`);
    }

    public async destroyAsync(): Promise<void> {
        await this.commit();
        return super.destroyAsync();
    }
}
