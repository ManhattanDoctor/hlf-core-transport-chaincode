import { IUIDable, ILogger, TransformUtil, ClassType, ValidateUtil } from '@ts-core/common';
import { EntityManager } from './EntityManager';
import { IStub } from '../../stub';
import * as _ from 'lodash';

export abstract class EntityManagerImpl<T extends IUIDable> extends EntityManager<T> {
    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected async serialize(item: T): Promise<any> {
        ValidateUtil.validate(item);
        return TransformUtil.fromClass(item);
    }

    protected async deserialize(item: any, details?: Array<keyof T>): Promise<T> {
        if (_.isNil(item)) {
            return null;
        }
        let value = this.toEntity(item);
        ValidateUtil.validate(value);
        await this.loadDetails(value, details);
        return value;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async loadDetails(item: T, details?: Array<keyof T>): Promise<void> { }

    public abstract toEntity(item: any): T;
}
