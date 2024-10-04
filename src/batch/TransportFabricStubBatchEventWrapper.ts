import { ITransportFabricCommandOptions } from '@hlf-core/transport-common';
import { ITransportEvent, ExtendedError, ILogger, ITransportReceiver } from '@ts-core/common';
import { ITransportFabricEvents, TransportFabricStub, TransportFabricStubStateProxy } from '../stub';
import { ChaincodeStub } from 'fabric-shim';
import * as _ from 'lodash';

export class TransportFabricStubBatchEventWrapper extends TransportFabricStubStateProxy {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected transactions: Map<string, Array<ITransportEvent<any>>>;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: ChaincodeStub, requestId: string, options: ITransportFabricCommandOptions, transport: ITransportReceiver) {
        super(logger, stub, requestId, options, transport);
        this.transactions = new Map();
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected dispatchEvents(): void {
        if (_.isNil(this.transactions) || this.transactions.size === 0) {
            return;
        }
        let item: ITransportFabricEvents = {};
        this.transactions.forEach((events, transactionHash) => TransportFabricStub.setEvents(item, transactionHash, events));
        this.setEvent(item);
    }

    protected _destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super._destroy();
        this.transactions.clear();
        this.transactions = null;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public addEvent<T>(transaction: string, items: Array<ITransportEvent<T>>): void {
        if (this.transactions.has(transaction)) {
            throw new ExtendedError(`Events for "${transaction}" already putted`);
        }
        this.transactions.set(transaction, items);
    }

    public async dispatch<T>(value: ITransportEvent<T>): Promise<void> {
        throw new ExtendedError(`Can't dispatch event directly, use TransportFabricStubBatch`);
    }
}
