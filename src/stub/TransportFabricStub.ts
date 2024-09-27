import { ITransportCommand, ITransportCommandAsync, LoggerWrapper, ILogger, ExtendedError, TweetNaCl, ITransportEvent, ITransportReceiver, TransformUtil, IPageBookmark, IPaginationBookmark, ClassType, ValidateUtil, ObjectUtil, DateUtil } from '@ts-core/common';
import { ChaincodeStub, Iterators, StateQueryResponse } from 'fabric-shim';
import { IKeyValue, IPutStateOptions, IStub, IStubTransaction, IStubUser, ITransportCommandInvokeOptions } from '@hlf-core/common';
import { ITransportFabricCommandOptions, ITransportFabricRequestPayload, TRANSPORT_CHAINCODE_EVENT, TRANSPORT_FABRIC_METHOD, TransportFabricCommandOptions, TransportFabricRequestPayload, TransportFabricResponsePayload } from '@hlf-core/transport-common';
import * as _ from 'lodash';

export class TransportFabricStub extends LoggerWrapper implements IStub {
    // --------------------------------------------------------------------------
    //
    //  Static Methods
    //
    // --------------------------------------------------------------------------

    public static setEvents(item: ITransportFabricEvents, transactionHash: string, events: Array<ITransportEvent<any>>): ITransportFabricEvents {
        if (_.isNil(transactionHash) || _.isEmpty(events)) {
            return item;
        }
        let items = item[transactionHash] = new Array();
        for (let i = 0; i < events.length; i++) {
            let event = TransformUtil.fromClass(events[i]);
            event.uid = TweetNaCl.hash(`${transactionHash}_${i}`);
            items.push(event);
        }
        return item;
    }

    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected _stub: ChaincodeStub;

    protected _channel: string;
    protected _requestId: string;

    protected _user: IStubUser;
    protected _transaction: IStubTransaction;

    protected options: ITransportFabricCommandOptions;
    protected transport: ITransportReceiver;
    protected eventsToDispatch: Array<ITransportEvent<any>>;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: ChaincodeStub, requestId: string, options: ITransportFabricCommandOptions, transport: ITransportReceiver) {
        super(logger);
        this._stub = stub;
        this._requestId = requestId;

        this.options = options;
        this.transport = transport;
        this.eventsToDispatch = new Array();

        if (!_.isNil(this.options)) {
            this.commitOptionsProperties();
        }
        if (!_.isNil(this.stub)) {
            this.commitStubProperties();
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected commitStubProperties(): void {
        this._channel = this.stub.getChannelID();
        this._transaction = { hash: this.stub.getTxID(), date: null };

        let item = this.stub.getTxTimestamp() as any;
        if (ObjectUtil.hasOwnProperty(item, 'toDate')) {
            this._transaction.date = item.toDate();
        } else if (ObjectUtil.hasOwnProperties(item, ['seconds', 'nanos'])) {
            this._transaction.date = new Date(item.seconds * DateUtil.MILLISECONDS_SECOND + Math.round(item.nanos * DateUtil.MILLISECONDS_NANOSECOND));
        }
    }

    protected commitOptionsProperties(): void {
        this._user = { id: this.options.userId, publicKey: null };
        if (!_.isNil(this.options.signature)) {
            this._user.publicKey = this.options.signature.publicKey;
        }
    }

    protected dispatchEvents(): void {
        if (!_.isEmpty(this.eventsToDispatch)) {
            this.setEvent(TransportFabricStub.setEvents({}, this.transaction.hash, this.eventsToDispatch));
        }
    }

    protected setEvent(item: ITransportFabricEvents): void {
        item = ObjectUtil.sortKeys(item, true);
        this.stub.setEvent(TRANSPORT_CHAINCODE_EVENT, Buffer.from(JSON.stringify(item), TransformUtil.ENCODING));
    }

    protected _destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super.destroy();
        this.dispatchEvents();

        this._stub = null;
        this._user = null;
        this._transaction = null;

        this.options = null;
        this.transport = null;
        this.eventsToDispatch = null;
    }

    // --------------------------------------------------------------------------
    //
    //  Public State Methods
    //
    // --------------------------------------------------------------------------

    public async getState<U>(key: string, type: ClassType<U> = null): Promise<U> {
        let value = TransformUtil.toJSON(await this.getStateRaw(key));
        if (_.isNil(type) || _.isNil(value)) {
            return value;
        }
        return TransformUtil.toClass<U>(type, value);
    }

    public async getStateRaw(key: string): Promise<string> {
        let item = await this.stub.getState(key);
        return !_.isNil(item) && item.length > 0 ? Buffer.from(item).toString(TransformUtil.ENCODING) : null;
    }

    public async getStateByRange(startKey: string, endKey: string): Promise<Iterators.StateQueryIterator> {
        return this.stub.getStateByRange(startKey, endKey);
    }

    public async getStateByRangeWithPagination(startKey: string, endKey: string, pageSize: number, bookmark?: string): Promise<StateQueryResponse<Iterators.StateQueryIterator>> {
        return this.stub.getStateByRangeWithPagination(startKey, endKey, pageSize, bookmark);
    }

    public async putState<U>(key: string, value: U, options: IPutStateOptions): Promise<U> {
        if (_.isNil(options)) {
            options = { isValidate: true, isTransform: true, isSortKeys: true };
        }
        if (options.isValidate) {
            ValidateUtil.validate(value);
        }
        let item = value;
        if (options.isTransform) {
            item = TransformUtil.fromClass(value);
        }
        if (options.isSortKeys) {
            item = ObjectUtil.sortKeys(item, true);
        }
        await this.putStateRaw(key, TransformUtil.fromJSON(item));
        return item;
    }

    public async putStateRaw(key: string, item: string): Promise<void> {
        return this.stub.putState(key, Buffer.from(item, TransformUtil.ENCODING));
    }

    public async hasState(key: string): Promise<boolean> {
        return !_.isNil(await this.getStateRaw(key));
    }

    public async removeState(key: string): Promise<void> {
        return this.stub.deleteState(key);
    }

    // --------------------------------------------------------------------------
    //
    //  Transport Methods
    //
    // --------------------------------------------------------------------------

    public invokeChaincode(chaincode: string, args: Array<string>, channel: string): Promise<any> {
        return this.stub.invokeChaincode(chaincode, args, channel);
    }

    public invokeSend<U>(command: ITransportCommand<U>, options: ITransportCommandInvokeOptions): void {
        let request = this.createRequestPayload(command, options, false);
        TransportFabricRequestPayload.clear(request);

        this.stub.invokeChaincode(options.chaincode, [TRANSPORT_FABRIC_METHOD, TransformUtil.fromJSON(TransformUtil.fromClass(request))], options.channel);
    }

    public async invokeSendListen<U, V>(command: ITransportCommandAsync<U, V>, options: ITransportCommandInvokeOptions): Promise<V> {
        let request = this.createRequestPayload(command, options, false);
        TransportFabricRequestPayload.clear(request);

        let item = await this.stub.invokeChaincode(options.chaincode, [TRANSPORT_FABRIC_METHOD, TransformUtil.fromJSON(TransformUtil.fromClass(request))], options.channel);
        let payload: TransportFabricResponsePayload = TransportFabricResponsePayload.parse(Buffer.from(item.payload));
        return payload.response;
    }

    protected createRequestPayload<U>(command: ITransportCommand<U>, options: ITransportFabricCommandOptions, isNeedReply: boolean): ITransportFabricRequestPayload<U> {
        let item = new TransportFabricRequestPayload<U>();
        item.id = command.id;
        item.name = command.name;
        item.options = TransformUtil.toClass(TransportFabricCommandOptions, options);
        if (!_.isNil(command.request)) {
            item.request = command.request;
        }
        if (this.isCommandReadonly(command)) {
            item.isReadonly = true;
        }
        if (isNeedReply) {
            item.isNeedReply = isNeedReply;
        }
        ValidateUtil.validate(item);
        return item;
    }

    protected isCommandReadonly<U>(command: ITransportCommand<U>): boolean {
        if (ObjectUtil.hasOwnProperty(command, 'isQuery')) {
            return command['isQuery'] === true;
        }
        if (ObjectUtil.hasOwnProperty(command, 'isReadonly')) {
            return command['isReadonly'] === true;
        }
        return false;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Key Value
    //
    // --------------------------------------------------------------------------

    public async loadKV(iterator: Iterators.StateQueryIterator): Promise<Array<IKeyValue>> {
        let items = [];
        while (true) {
            let response = await iterator.next();
            let item = response.value;
            if (!_.isNil(item) && !_.isNil(item.key)) {
                items.push({ key: item.key, value: !_.isNil(item.value) ? Buffer.from(item.value).toString(TransformUtil.ENCODING) : null });
            }
            if (response.done) {
                await iterator.close();
                break;
            }
        }
        return items;
    }

    public async getPaginatedKV(request: IPageBookmark, start: string, finish: string): Promise<IPaginationBookmark<IKeyValue>> {
        let response = await this.stub.getStateByRangeWithPagination(start, finish, request.pageSize, request.pageBookmark);
        return {
            items: await this.loadKV(response.iterator),
            pageSize: request.pageSize,
            isAllLoaded: response.metadata.fetchedRecordsCount < request.pageSize,
            pageBookmark: response.metadata.bookmark
        };
    }

    // --------------------------------------------------------------------------
    //
    //  Public Event Methods
    //
    // --------------------------------------------------------------------------

    public async dispatch<T>(value: ITransportEvent<T>): Promise<void> {
        ValidateUtil.validate(value);
        this.transport.dispatch(value);
        this.eventsToDispatch.push(value);
    }

    public async destroyAsync(): Promise<void> {
        return this._destroy();
    }

    public destroy(): void {
        throw new ExtendedError(`Call "destroyAsync" instead`);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public get stub(): ChaincodeStub {
        return this._stub;
    }

    public get requestId(): string {
        return this._requestId;
    }

    public get user(): IStubUser {
        return this._user;
    }

    public get transaction(): IStubTransaction {
        return this._transaction;
    }
}

export interface ITransportFabricEvents {
    [transactionHash: string]: Array<ITransportEvent<any>>;
}


