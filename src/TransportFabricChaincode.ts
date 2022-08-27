import { ITransportFabricResponsePayload } from '@hlf-core/transport-common';
import { ExtendedError, ObservableData, TransformUtil, ILogger, LoggerWrapper } from '@ts-core/common';
import { Shim, ChaincodeInterface, ChaincodeResponse, ChaincodeStub } from 'fabric-shim';
import * as _ from 'lodash';
import { Observable, Subject } from 'rxjs';
import { TransportFabricChaincodeReceiver } from './TransportFabricChaincodeReceiver';

export abstract class TransportFabricChaincode<T> extends LoggerWrapper implements ChaincodeInterface {
    // --------------------------------------------------------------------------
    //
    // 	Properties
    //
    // --------------------------------------------------------------------------

    protected observer: Subject<ObservableData<T | TransportFabricChaincodeEvent, ITransportFabricChaincodeEventData>>;

    // --------------------------------------------------------------------------
    //
    // 	Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, protected transport: TransportFabricChaincodeReceiver) {
        super(logger);
        this.observer = new Subject();
    }

    // --------------------------------------------------------------------------
    //
    //  Chaincode Methods
    //
    // --------------------------------------------------------------------------

    public async Init(stub: ChaincodeStub): Promise<ChaincodeResponse> {
        this.debug(`Chaincode "${this.name}" inited`);
        this.observer.next(new ObservableData(TransportFabricChaincodeEvent.INITED, { stub }));
        return Shim.success(Buffer.from(''));
    }

    public async Invoke(stub: ChaincodeStub): Promise<ChaincodeResponse> {
        this.observer.next(new ObservableData(TransportFabricChaincodeEvent.INVOKE_STARTED, { stub }));

        let response = await this.transport.invoke(stub);

        let event = { stub, response };
        let isHasResponse = !_.isNil(response);

        let isError = isHasResponse && ExtendedError.instanceOf(response.response);
        if (isError) {
            this.observer.next(new ObservableData(TransportFabricChaincodeEvent.INVOKE_ERROR, event));
        } else {
            this.observer.next(new ObservableData(TransportFabricChaincodeEvent.INVOKE_COMPLETE, event));
        }
        this.observer.next(new ObservableData(TransportFabricChaincodeEvent.INVOKE_FINISHED, event));

        let content = this.getContent(response);
        return isError ? Shim.error(content) : Shim.success(content);
    }

    // --------------------------------------------------------------------------
    //
    // 	Protected Methods
    //
    // --------------------------------------------------------------------------

    protected getContent<V>(response: ITransportFabricResponsePayload<V>): Buffer {
        return !_.isNil(response) ? TransformUtil.fromClassBuffer(response) : Buffer.from('');
    }

    // --------------------------------------------------------------------------
    //
    // 	Public Properties
    //
    // --------------------------------------------------------------------------

    public get events(): Observable<ObservableData<T | TransportFabricChaincodeEvent, ITransportFabricChaincodeEventData>> {
        return this.observer.asObservable();
    }

    public abstract get name(): string;
}

export interface ITransportFabricChaincodeEventData<V = any> {
    stub: ChaincodeStub;
    response?: ITransportFabricResponsePayload<V>;
}

export enum TransportFabricChaincodeEvent {
    INITED = 'INITED',
    INVOKE_ERROR = 'INVOKE_ERROR',
    INVOKE_STARTED = 'INVOKE_STARTED',
    INVOKE_COMPLETE = 'INVOKE_COMPLETE',
    INVOKE_FINISHED = 'INVOKE_FINISHED'
}
