import { ITransportFabricCommandOptions } from '@hlf-core/transport-common';
import { ITransportEvent, ExtendedError, ILogger, ITransportReceiver } from '@ts-core/common';
import { ChaincodeStub } from 'fabric-shim';
import { ITransportFabricEvents, TransportFabricStub, TransportFabricStubStateProxy } from '../stub';
import * as _ from 'lodash';

export class TransportFabricStubBatchEventWrapper extends TransportFabricStubStateProxy {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected events: Map<string, Array<ITransportEvent<any>>>;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: ChaincodeStub, requestId: string, options: ITransportFabricCommandOptions, transport: ITransportReceiver) {
        super(logger, stub, requestId, options, transport);
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

        let item: ITransportFabricEvents = {};
        this.events.forEach((events, transactionHash) => TransportFabricStub.setEvents(item, transactionHash, events));
        this.setEvent(item);
    }


    protected _destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super._destroy();

        this.events.clear();
        this.events = null;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public putEvent<T>(transactionHash: string, items: Array<ITransportEvent<T>>): void {
        if (this.events.has(transactionHash)) {
            throw new ExtendedError(`Events for "${transactionHash}" already putted`);
        }
        this.events.set(transactionHash, items);
    }
}
