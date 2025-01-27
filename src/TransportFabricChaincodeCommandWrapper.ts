import { ExtendedError, ITransportCommand, ITransportCommandAsync, Transport } from '@ts-core/common';
import { ITransportFabricRequestPayload } from '@hlf-core/transport-common';
import { IStub, IStubHolder } from '@hlf-core/chaincode';
import * as _ from 'lodash';

export class TransportFabricChaincodeCommandWrapper<U = any, V = any> implements ITransportCommandAsync<U, V>, IStubHolder {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected _stub: IStub;

    protected payload: ITransportFabricRequestPayload<U>;
    protected command: ITransportCommand<U>;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(payload: ITransportFabricRequestPayload<U>, command: ITransportCommand<U>, stub: IStub) {
        this._stub = stub;

        this.payload = payload;
        this.command = command;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public response(value: V | ExtendedError | Error): void {
        if (Transport.isCommandAsync(this.command)) {
            this.command.response(value);
        }
    }

    public async destroyAsync(): Promise<void> {
        if (!_.isNil(this.stub)) {
            await this.stub.destroyAsync();
            this._stub = null;
        }
        this.command = null;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public get stub(): IStub {
        return this._stub;
    }

    public get id(): string {
        return this.payload.id;
    }

    public get name(): string {
        return this.command.name;
    }

    public get request(): U {
        return this.command.request;
    }

    public get data(): V {
        return Transport.isCommandAsync(this.command) ? this.command.data : null;
    }

    public get error(): ExtendedError {
        return Transport.isCommandAsync(this.command) ? this.command.error : null;
    }
}
