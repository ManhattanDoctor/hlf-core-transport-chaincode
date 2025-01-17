
import { LoggerWrapper, ILogger } from '@ts-core/common';
import { TransportFabricChaincodeReceiver } from '../TransportFabricChaincodeReceiver';
import { ChaincodeStub } from 'fabric-shim';
import { IStub, IUserStubHolder, TransportFabricStub } from '../stub';

export abstract class Seeder<S = any, H extends IUserStubHolder = IUserStubHolder> extends LoggerWrapper {
    // --------------------------------------------------------------------------
    //
    //  Static Properties
    //
    // --------------------------------------------------------------------------

    public static KEY = 'SEED';

    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected chaincode: TransportFabricChaincodeReceiver;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, chaincode: TransportFabricChaincodeReceiver) {
        super(logger);
        this.chaincode = chaincode;
    }

    // --------------------------------------------------------------------------
    //
    //  Private Methods
    //
    // --------------------------------------------------------------------------

    protected holderGet(stub: ChaincodeStub): H {
        let transport = this.stubGet(stub);
        let destroyAsync = (): Promise<void> => {
            return transport.destroyAsync();
        }
        return { stub: transport, destroyAsync } as any;
    }

    protected stubGet(stub: ChaincodeStub): TransportFabricStub {
        return new TransportFabricStub(this.logger, stub, null, { userId: null, signature: { nonce: null, value: null, algorithm: null, publicKey: null } }, this.chaincode);
    }

    protected add(holder: H): Promise<S> {
        return null;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async get(stub: ChaincodeStub | IStub): Promise<S> {
        if (stub instanceof ChaincodeStub) {
            stub = this.stubGet(stub);
        }
        return stub.getState<S>(Seeder.KEY);
    }

    public async seed(stub: ChaincodeStub): Promise<S> {
        let holder = this.holderGet(stub);
        try {
            return holder.stub.putState(Seeder.KEY, await this.add(holder), { isValidate: true, isTransform: true, isSortKeys: true });
        }
        catch (error) {
            this.error(error);
        }
    }
}
