import { ITransportCommand, ITransportCommandOptions, ITransportCommandAsync, IPageBookmark, IPaginationBookmark, ClassType, ITransportEvent } from '@ts-core/common';
import { StateQueryResponse, Iterators } from 'fabric-shim';

type StateQueryIterator = Iterators.StateQueryIterator;

export interface IStub {
    readonly user: IStubUser;
    readonly requestId: string;
    readonly transaction: IStubTransaction;

    invokeSend<U>(command: ITransportCommand<U>, options: ITransportCommandInvokeOptions): void;
    invokeSendListen<U, V>(command: ITransportCommandAsync<U, V>, options: ITransportCommandInvokeOptions): Promise<V>;
    invokeChaincode(chaincodeName: string, args: string[], channel: string): Promise<any>;

    loadKV(iterator: StateQueryIterator): Promise<Array<IKeyValue>>;
    getPaginatedKV(request: IPageBookmark, start: string, finish: string): Promise<IPaginationBookmark<IKeyValue>>;

    getState<U>(key: string, type?: ClassType<U>): Promise<U>;
    getStateRaw(key: string): Promise<string>;

    getStateByRange(startKey: string, endKey: string): Promise<StateQueryIterator>;
    getStateByRangeWithPagination(startKey: string, endKey: string, pageSize: number, bookmark?: string): Promise<StateQueryResponse<StateQueryIterator>>;

    putState<U>(key: string, value: U, options: IPutStateOptions): Promise<U>;
    putStateRaw(key: string, value: string): Promise<void>;

    hasState(key: string): Promise<boolean>;
    hasNotState(key: string): Promise<boolean>;
    removeState(key: string): Promise<void>;

    dispatch<T>(event: ITransportEvent<T>): Promise<void>;
    destroyAsync(): Promise<void>;
}

export interface IStubUser {
    id: string;
    publicKey: string;
}

export interface IStubTransaction {
    hash: string;
    date: Date;
}

export interface IPutStateOptions {
    isSortKeys?: boolean;
    isValidate?: boolean;
    isTransform?: boolean;
}

export interface IKeyValue {
    key: string;
    value?: string;
}

export interface ITransportCommandInvokeOptions extends ITransportCommandOptions {
    channel: string;
    chaincode: string;
}
