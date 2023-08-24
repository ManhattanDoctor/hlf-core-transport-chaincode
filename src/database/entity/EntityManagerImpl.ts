import { ExtendedError, IUIDable, ILogger, TransformUtil, ClassType, ValidateUtil } from '@ts-core/common';
import { EntityManager } from './EntityManager';
import { ITransportFabricStub } from '../../stub';
import * as _ from 'lodash';

export abstract class EntityManagerImpl<U extends IUIDable> extends EntityManager<U> {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected className: ClassType<U>;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: ITransportFabricStub, className: ClassType<U>) {
        super(logger, stub)
        this.className = className;
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected async serialize(item: U): Promise<any> {
        if (!(item instanceof this.className)) {
            throw new ExtendedError(`Not instance of "${this.className.name}"`, ExtendedError.HTTP_CODE_BAD_REQUEST, item);
        }
        ValidateUtil.validate(item);
        return TransformUtil.fromClass(item);
    }

    protected async deserialize(item: any, details?: Array<keyof U>): Promise<U> {
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

    public async loadDetails(item: U, details?: Array<keyof U>): Promise<void> { }

    public toEntity(item: any): U {
        return TransformUtil.toClass(this.className, item);
    }

    public destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super.destroy();
        this.className = null;
    }
}
