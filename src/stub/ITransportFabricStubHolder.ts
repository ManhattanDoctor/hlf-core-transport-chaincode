import { ITransportFabricStub } from './ITransportFabricStub';
import { ExtendedError } from '@ts-core/common';
import * as _ from 'lodash';
import 'reflect-metadata';

export interface ITransportFabricStubHolder {
    readonly stub: ITransportFabricStub;
    destroyAsync(): Promise<void>;
}

// --------------------------------------------------------------------------
//
//  Decorators
//
// --------------------------------------------------------------------------

const STUB_HOLDER_INDEX = 'STUB_HOLDER_INDEX';

export const StubHolder = (): any => {
    return function (target: Object, propertyKey: string | symbol, parameterIndex: number) {
        if (!Reflect.hasMetadata(STUB_HOLDER_INDEX, target)) {
            Reflect.defineMetadata(STUB_HOLDER_INDEX, parameterIndex, target);
        }
    };
};

export function getStubHolder(target: any, args: Array<any>): ITransportFabricStubHolder {
    let index = Number(Reflect.getMetadata(STUB_HOLDER_INDEX, target));
    if (args.length === 0 || _.isNil(index) || _.isNaN(index) || index >= args.length) {
        throw new ExtendedError(`Unable to find stub holder, probably @StubHolder() decorator missed`, ExtendedError.HTTP_CODE_NOT_FOUND);
    }
    return args[index];
}
