import {
    ILogger,
    ExtendedError,
    PromiseHandler,
    ITransportCommand,
    ITransportEvent,
    ITransportCommandRequest,
    ISignature,
    TransportLogType,
    ITransportCryptoManager,
    ITransportSettings,
    ITransportCommandOptions,
    TransportCommandAsync,
    ITransportReceiver,
    TransportImpl,
    DateUtil,
    ObjectUtil,
    TransportCryptoManager
} from '@ts-core/common';
import { ChaincodeStub } from 'fabric-shim';
import * as _ from 'lodash';
import { ITransportFabricStub, TransportFabricStub } from './stub';
import { TransportFabricChaincodeCommandWrapper } from './TransportFabricChaincodeCommandWrapper';
import { ITransportFabricRequestPayload, ITransportFabricResponsePayload, TransportFabricRequestPayload, TransportFabricResponsePayload } from '@hlf-core/transport-common';

export class TransportFabricChaincodeReceiver<T extends ITransportFabricChaincodeSettings = ITransportFabricChaincodeSettings> extends TransportImpl<T, ITransportCommandOptions, ITransportFabricCommandRequest> {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected defaultCreateStubFactory = <U>(logger: ILogger, stub: ChaincodeStub, payload: ITransportFabricRequestPayload<U>, transport: ITransportReceiver) => new TransportFabricStub(logger, stub, payload.id, payload.options, transport);

    protected defaultCreateCommandFactory = <U>(item: ITransportFabricRequestPayload<U>) => new TransportCommandAsync(item.name, item.request, item.id);

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async invoke<U = any, V = any>(chaincode: ChaincodeStub): Promise<ITransportFabricResponsePayload<V>> {
        let stub: ITransportFabricStub = null;
        let payload: ITransportFabricRequestPayload<U> = null;
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
            return Promise.resolve(TransportFabricResponsePayload.fromError(!_.isNil(payload) ? payload.id : null, error));
        }

        this.logCommand(command, TransportLogType.REQUEST_RECEIVED);

        let request = this.checkRequestStorage(payload, stub, command);
        this.executeCommand(chaincode, payload, stub, command);
        return request.handler.promise;
    }

    public complete<U, V>(command: ITransportCommand<U>, response?: V | Error): void {
        if (!(command instanceof TransportFabricChaincodeCommandWrapper<U, V>)) {
            throw new ExtendedError('Command must be instance of "TransportFabricChaincodeCommandWrapper"');
        }

        let request = this.requests.get(command.id);
        if (_.isNil(request)) {
            return;
        }

        this.requests.delete(command.id);

        command.response(response);
        this.commandResponse(command, request);
    }

    // --------------------------------------------------------------------------
    //
    //  Receive Message Methods
    //
    // --------------------------------------------------------------------------

    protected checkRequestStorage<U>(payload: ITransportFabricRequestPayload<U>, stub: ITransportFabricStub, command: ITransportCommand<U>): ITransportFabricCommandRequest {
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

    protected async commandResponseExecute<U, V>(command: TransportFabricChaincodeCommandWrapper<U, V>, request: ITransportFabricCommandRequest): Promise<void> {
        let payload = this.createResponsePayload(command);
        await command.destroyAsync();
        request.handler.resolve(payload);
    }

    protected commandRequestExecute<U>(command: ITransportCommand<U>, options: ITransportCommandOptions, isNeedReply: boolean): Promise<void> {
        throw new ExtendedError(`Method doesn't implemented`);
    }

    protected async eventRequestExecute<U>(event: ITransportEvent<U>, options?: void): Promise<void> { }

    protected isNonSignedCommand<U>(command: ITransportCommand<U>): boolean {
        let items = this.getSettingsValue('nonSignedCommands');
        return !_.isEmpty(items) && items.includes(command.name);
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

        let manager = _.find(this.settings.cryptoManagers, { algorithm: signature.algorithm });
        if (_.isNil(manager)) {
            throw new ExtendedError(`Command "${command.name}" signature algorithm (${signature.algorithm}) doesn't support`);
        }

        let isVerified = await TransportCryptoManager.verify(command, manager, signature);
        if (!isVerified) {
            throw new ExtendedError(`Command "${command.name}" has invalid signature`);
        }
    }

    protected async executeCommand<U>(chaincodeStub: ChaincodeStub, payload: ITransportFabricRequestPayload<U>, stub: ITransportFabricStub, command: ITransportCommand<U>): Promise<void> {
        await this.commandResponseRequestDispatch(command, payload.options, payload.isNeedReply);
    }

    protected createCommand<U>(payload: ITransportFabricRequestPayload<U>, stub: ITransportFabricStub): ITransportCommand<U> {
        let factory = this.getSettingsValue('commandFactory', this.defaultCreateCommandFactory);
        let command = factory(payload);
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
