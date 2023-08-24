import * as _ from 'lodash';
import { ILogger, LoggerWrapper, IPaginationBookmark, IPageBookmark } from '@ts-core/common';
import { IKeyValue, ITransportFabricStub } from '../stub/ITransportFabricStub';

export class DatabaseManager extends LoggerWrapper {
    // --------------------------------------------------------------------------
    //
    //  Static Properties
    //
    // --------------------------------------------------------------------------

    public static LAST_KEY = '\ufff0';

    // --------------------------------------------------------------------------
    //
    //  Static Methods
    //
    // --------------------------------------------------------------------------

    public static async getKV(stub: ITransportFabricStub, start: string, finish?: string): Promise<Array<IKeyValue>> {
        return stub.loadKV(await stub.getStateByRange(start, !_.isNil(finish) ? finish : DatabaseManager.getFinish(start)));
    }

    public static async getPaginatedKV(stub: ITransportFabricStub, request: IPageBookmark, start: string, finish?: string): Promise<IPaginationBookmark<IKeyValue>> {
        return stub.getPaginatedKV(request, start, !_.isNil(finish) ? finish : DatabaseManager.getFinish(start));
    }

    public static async getKeys(stub: ITransportFabricStub, start: string, finish?: string): Promise<Array<string>> {
        return (await DatabaseManager.getKV(stub, start, finish)).map(item => item.key);
    }

    public static async getValues(stub: ITransportFabricStub, start: string, finish?: string): Promise<Array<string>> {
        return (await DatabaseManager.getKV(stub, start, finish)).map(item => item.value);
    }

    public static async removeKV(stub: ITransportFabricStub, start: string, finish?: string): Promise<void> {
        let kv = await DatabaseManager.getKV(stub, start, finish);
        await Promise.all(kv.map(item => stub.removeState(item.key)));
        await Promise.all(kv.map(item => stub.removeState(item.value)));
    }

    public static getFinish(start: string): string {
        return start + DatabaseManager.LAST_KEY;
    }

    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    private _stub: ITransportFabricStub;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: ITransportFabricStub) {
        super(logger);
        this._stub = stub;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async getKV(start: string, finish?: string): Promise<Array<IKeyValue>> {
        return DatabaseManager.getKV(this.stub, start, finish);
    }

    public async removeKV(start: string, finish?: string): Promise<void> {
        return DatabaseManager.removeKV(this.stub, start, finish);
    }

    public async getPaginatedKV(request: IPageBookmark, start: string, finish?: string): Promise<IPaginationBookmark<IKeyValue>> {
        return DatabaseManager.getPaginatedKV(this.stub, request, start, finish);
    }

    public async getKeys(start: string, finish?: string): Promise<Array<string>> {
        return DatabaseManager.getKeys(this.stub, start, finish);
    }

    public async getValues(start: string, finish?: string): Promise<Array<string>> {
        return DatabaseManager.getValues(this.stub, start, finish);
    }

    public getFinish(start: string): string {
        return DatabaseManager.getFinish(start);
    }

    public destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super.destroy();
        this._stub = null;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public get stub(): ITransportFabricStub {
        return this._stub;
    }
}
