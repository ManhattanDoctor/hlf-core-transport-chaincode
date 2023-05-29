import {
    ILogger,
    ExtendedError,
    PromiseHandler,
    ITransportCommand,
    ITransportEvent,
    ITransportCommandRequest,
    Transport,
    ISignature,
    TransportLogType,
    ITransportCryptoManager,
    ITransportSettings,
    ITransportCommandOptions,
    ITransportCommandAsync,
    TransportCommandAsync,
    ITransportReceiver,
    TransportWaitExceedError,
    DateUtil,
    ObjectUtil,
    TransportCryptoManager
} from '@ts-core/common';
import { Observable } from 'rxjs';
import { ChaincodeStub } from 'fabric-shim';
import * as _ from 'lodash';
import { ITransportFabricStub, TransportFabricStub } from './stub';
import { TransportFabricChaincodeCommandWrapper } from './TransportFabricChaincodeCommandWrapper';
import { ITransportFabricRequestPayload, ITransportFabricResponsePayload, TransportFabricRequestPayload, TransportFabricResponsePayload } from '@hlf-core/transport-common';

export class TransportFabricChaincodeReceiver<T extends ITransportFabricChaincodeSettings = ITransportFabricChaincodeSettings> extends Transport<T, ITransportCommandOptions, ITransportFabricCommandRequest> {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected defaultCreateStubFactory = <U>(logger: ILogger, stub: ChaincodeStub, payload: ITransportFabricRequestPayload<U>, transport: ITransportReceiver) => new TransportFabricStub(logger, stub, payload.id, payload.options, transport);

    protected defaultCreateCommandFactory = <U>(item: ITransportFabricRequestPayload<U>) => new TransportCommandAsync(item.name, item.request, item.id);

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, settings?: T) {
        super(logger, settings);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async invoke<U = any, V = any>(chaincode: ChaincodeStub): Promise<ITransportFabricResponsePayload<V>> {
        let payload: ITransportFabricRequestPayload<U> = null;
        let stub: ITransportFabricStub = null;
        let command: ITransportCommand<U> = null;

        try {
            payload = TransportFabricRequestPayload.parse(chaincode.getFunctionAndParameters(), true);
            stub = this.createStub(this.logger, chaincode, payload, this);

            command = this.createCommand(payload, stub);
            if (!this.isNonSignedCommand(command)) {
                await this.validateSignature(command, payload.options.signature);
            }
        } catch (error) {
            error = ExtendedError.create(error);
            this.warn(error.message);
            return Promise.resolve(TransportFabricResponsePayload.fromError(!_.isNil(payload) ? payload.id : null, error));
        }

        this.logCommand(command, TransportLogType.REQUEST_RECEIVED);

        let request = this.checkRequestStorage(payload, stub, command);
        if (this.isCommandRequestExpired(request)) {
            this.logCommand(command, TransportLogType.REQUEST_EXPIRED);
            this.warn(`Received "${command.name}" command with already expired timeout: ignore`);
            this.requests.delete(command.id);
            return;
        }
        this.executeCommand(chaincode, payload, stub, command);
        return request.handler.promise;
    }

    public complete<U, V>(command: ITransportCommand<U>, result?: V | Error): void {
        if (!(command instanceof TransportFabricChaincodeCommandWrapper<U, V>)) {
            throw new ExtendedError('Command must be instance of "TransportFabricChaincodeCommandWrapper"');
        }

        let request = this.requests.get(command.id);
        this.requests.delete(command.id);

        if (_.isNil(request)) {
            this.warn(`Unable to complete command "${command.name}", probably command was already completed`);
            return;
        }

        let handler = request.handler;
        if (this.isCommandRequestExpired(request)) {
            this.logCommand(command, TransportLogType.RESPONSE_EXPIRED);
            let error = new ExtendedError(`Unable to completed "${command.name}" command: timeout is expired`);
            this.warn(error.message);
            handler.resolve(TransportFabricResponsePayload.fromError(command.id, error));
            return;
        }

        command.response(result);
        this.logCommand(command, request.isNeedReply ? TransportLogType.RESPONSE_SENDED : TransportLogType.RESPONSE_NO_REPLY);

        let payload = this.createResponsePayload(command);
        command.destroyAsync().then(() => handler.resolve(payload));
    }

    public wait<U>(command: ITransportCommand<U>): void {
        let request = this.requests.get(command.id);
        if (_.isNil(request)) {
            throw new ExtendedError(`Unable to wait "${command.name}" command: can't find request details`);
        }

        if (this.isCommandRequestWaitExpired(request)) {
            this.complete(command, new TransportWaitExceedError(command));
            return;
        }

        this.waitSend(command);
    }

    public dispatch<T>(event: ITransportEvent<T>): void {
        this.eventSend(event);
    }

    public getDispatcher<T>(name: string): Observable<T> {
        throw new ExtendedError(`Method is not supported, use TransportFabricSender instead`);
    }

    public send<U>(command: ITransportCommand<U>, options?: ITransportCommandOptions): void {
        throw new ExtendedError(`Method is not supported, use TransportFabricSender instead`);
    }

    public sendListen<U, V>(command: ITransportCommandAsync<U, V>, options?: ITransportCommandOptions): Promise<V> {
        throw new ExtendedError(`Method is not supported, use TransportFabricSender instead`);
    }

    public destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super.destroy();

        this.requests.forEach(item => item.handler.reject(new ExtendedError(`Chaincode destroyed`)));
        this.requests.clear();
        this.requests = null;
    }

    // --------------------------------------------------------------------------
    //
    //  Send Methods
    //
    // --------------------------------------------------------------------------

    protected async eventSend<U>(event: ITransportEvent<U>): Promise<void> {
        this.logEvent(event, TransportLogType.EVENT_SENDED);
    }

    protected async waitSend<U>(command: ITransportCommand<U>): Promise<void> {
        this.logCommand(command, TransportLogType.RESPONSE_WAIT);
    }

    // --------------------------------------------------------------------------
    //
    //  Receive Message Methods
    //
    // --------------------------------------------------------------------------

    protected checkRequestStorage<U>(
        payload: ITransportFabricRequestPayload<U>,
        stub: ITransportFabricStub,
        command: ITransportCommand<U>
    ): ITransportFabricCommandRequest {
        let item = this.requests.get(command.id);
        if (!_.isNil(item)) {
            item.waited++;
            return item;
        }

        item = ObjectUtil.copyProperties(payload.options, { waited: 0, isNeedReply: payload.isNeedReply, handler: PromiseHandler.create(), payload });
        if (payload.isNeedReply) {
            item.expired = DateUtil.getDate(Date.now() + this.getCommandTimeoutDelay(command, payload.options));
        }
        this.requests.set(command.id, item);
        return item;
    }

    protected isNonSignedCommand<U>(command: ITransportCommand<U>): boolean {
        return !_.isEmpty(this.getSettingsValue('nonSignedCommands')) && this.getSettingsValue('nonSignedCommands').includes(command.name);
    }

    protected async validateSignature<U>(command: ITransportCommand<U>, signature: ISignature): Promise<void> {
        if (_.isNil(signature)) {
            throw new ExtendedError(`Command "${command.name}" has nil signature`);
        }
        if (_.isNil(signature.nonce)) {
            throw new ExtendedError(`Command "${command.name}" signature has invalid nonce`);
        }
        if (_.isNil(signature.algorithm)) {
            throw new ExtendedError(`Command "${command.name}" signature has invalid algorithm`);
        }
        if (_.isNil(signature.publicKey)) {
            throw new ExtendedError(`Command "${command.name}" signature has invalid publicKey`);
        }

        let manager = _.find(this.getSettingsValue('cryptoManagers'), item => item.algorithm === signature.algorithm);
        if (_.isNil(manager)) {
            throw new ExtendedError(`Command "${command.name}" signature algorithm (${signature.algorithm}) doesn't support`);
        }

        let isVerified = await TransportCryptoManager.verify(command, manager, signature);
        if (!isVerified) {
            throw new ExtendedError(`Command "${command.name}" has invalid signature`);
        }
    }

    protected async executeCommand<U>(chaincodeStub: ChaincodeStub, payload: ITransportFabricRequestPayload<U>, stub: ITransportFabricStub, command: ITransportCommand<U>): Promise<void> {
        let listener = this.listeners.get(command.name);
        if (_.isNil(listener)) {
            this.complete(command, new ExtendedError(`No listener for "${command.name}" command`));
        } else {
            listener.next(command);
        }
    }

    protected createCommand<U>(payload: ITransportFabricRequestPayload<U>, stub: ITransportFabricStub): ITransportCommand<U> {
        let command = this.getSettingsValue('commandFactory', this.defaultCreateCommandFactory)(payload);
        return new TransportFabricChaincodeCommandWrapper(payload, command, stub);
    }

    protected createStub<U>(logger: ILogger, stub: ChaincodeStub, payload: ITransportFabricRequestPayload<U>, transport: ITransportReceiver): ITransportFabricStub {
        return this.getSettingsValue('stubFactory', this.defaultCreateStubFactory)(logger, stub, payload, transport);
    }

    protected createResponsePayload<U, V = any>(command: ITransportCommand<U>): ITransportFabricResponsePayload<V> {
        return new TransportFabricResponsePayload<U>(command);
    }
}

export interface ITransportFabricChaincodeSettings extends ITransportSettings {
    cryptoManagers?: Array<ITransportCryptoManager>;
    nonSignedCommands?: Array<string>;

    stubFactory?: <U>(logger: ILogger, stub: ChaincodeStub, payload: ITransportFabricRequestPayload<U>, transport: ITransportReceiver) => ITransportFabricStub;
    commandFactory?: <U>(payload: ITransportFabricRequestPayload<U>) => ITransportCommand<U>;
}

interface ITransportFabricCommandRequest<U = any, V = any> extends ITransportCommandRequest {
    payload: ITransportFabricRequestPayload<U>;
    handler: PromiseHandler<ITransportFabricResponsePayload<V>, ExtendedError>;
}
