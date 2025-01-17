import { ILogger } from '@ts-core/common';
import { ChaincodeResponse, ChaincodeStub } from 'fabric-shim';
import { TransportFabricChaincode } from '../TransportFabricChaincode';
import { TransportFabricChaincodeReceiver } from '../TransportFabricChaincodeReceiver';
import { Seeder } from './Seeder';
import * as _ from 'lodash';

export abstract class SeededChaincode<S extends Seeder, T = void> extends TransportFabricChaincode<T> {
    // --------------------------------------------------------------------------
    //
    // 	Properties
    //
    // --------------------------------------------------------------------------

    protected seeder: S;

    // --------------------------------------------------------------------------
    //
    // 	Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, transport: TransportFabricChaincodeReceiver, seeder: S) {
        super(logger, transport);
        this.seeder = seeder;
    }

    // --------------------------------------------------------------------------
    //
    // 	Public Methods
    //
    // --------------------------------------------------------------------------

    public async Init(stub: ChaincodeStub): Promise<ChaincodeResponse> {
        let item = await this.seeder.get(stub);
        if (!_.isNil(item)) {
            this.log(`Seeds already exists`);
            return super.Init(stub);
        }
        await this.seeder.seed(stub);
        this.log(`Seeds successfully added`);
        return super.Init(stub);
    }
}