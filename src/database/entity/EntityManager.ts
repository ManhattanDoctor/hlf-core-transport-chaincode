import { ILogger, TransformUtil, IPaginableBookmark, IPaginationBookmark, getUid, UID, IUIDable } from '@ts-core/common';
import { DatabaseManager } from '../DatabaseManager';
import { IKeyValue, IStub } from '../../stub';
import * as _ from 'lodash';

export abstract class EntityManager<U extends IUIDable> extends DatabaseManager {
    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: IStub) {
        super(logger, stub);
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected getFindOptions(options?: IEntityFindOptions): IEntityFindOptions {
        if (_.isNil(options)) {
            options = {};
        }
        if (_.isNil(options.prefix)) {
            options.prefix = this.prefix;
        }
        if (_.isNil(options.transform)) {
            options.transform = TransformUtil.toJSON;
        }
        return options;
    }

    protected async parseFindResult<T = any>(result: Array<IKeyValue>, options: IEntityFindOptions<T>): Promise<Array<T | string>> {
        let items = result.map(item => item.value);
        items = items.filter(item => !_.isNil(item));
        return _.isNil(options.transform) ? items : await Promise.all(items.map(item => options.transform(item)));
    }

    protected abstract serialize<V = any>(item: U): Promise<V>;

    protected abstract deserialize(item: any, details?: Array<keyof U>): Promise<U>;

    public abstract loadDetails(item: U, details?: Array<keyof U>): Promise<void>;

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async get(item: UID, details?: Array<keyof U>): Promise<U> {
        return this.deserialize(await this.stub.getState(getUid(item)), details);
    }

    public async getMany(items: Array<UID>, details?: Array<keyof U>): Promise<Array<U>> {
        return Promise.all<U>(items.map(item => this.get(item, details)));
    }

    public async save(item: U): Promise<U> {
        await this.stub.putState(getUid(item), await this.serialize(item), { isSortKeys: true });
        return item;
    }

    public async has(item: UID): Promise<boolean> {
        return this.stub.hasState(getUid(item));
    }

    public async saveMany(items: Array<U>): Promise<Array<U>> {
        return Promise.all<U>(items.map(item => this.save(item)));
    }

    public async saveIfNotExists(item: U): Promise<U> {
        if (await this.stub.hasState(getUid(item))) {
            return item;
        }
        return this.save(item);
    }

    public async saveManyIfNotExists(items: Array<U>): Promise<Array<U>> {
        return Promise.all<U>(items.map(item => this.saveIfNotExists(item)));
    }

    public async remove(item: UID): Promise<void> {
        await this.stub.removeState(getUid(item));
    }

    public async removeMany(items: Array<UID>): Promise<void> {
        Promise.all(items.map(item => this.remove(item)));
    }

    // --------------------------------------------------------------------------
    //
    //  Find Methods
    //
    // --------------------------------------------------------------------------

    public async find(details?: Array<keyof U>, options?: IEntityFindOptions): Promise<Array<U>> {
        options = this.getFindOptions(options);

        let result = await this.getKV(options.prefix, this.getFinish(options.prefix));
        let items = await this.parseFindResult(result, options);
        return Promise.all(items.map(item => this.deserialize(item, details)));
    }

    public async findPaginated(data: IPaginableBookmark<U>, options?: IEntityFindOptions): Promise<IPaginationBookmark<U>> {
        options = this.getFindOptions(options);

        let result = await this.getPaginatedKV(data, options.prefix, this.getFinish(options.prefix));
        let items = await this.parseFindResult(result.items, options);

        return {
            pageSize: result.pageSize,
            isAllLoaded: result.isAllLoaded,
            pageBookmark: result.pageBookmark,
            items: await Promise.all(items.map(item => this.deserialize(item, data.details)))
        };
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public abstract get prefix(): string;
}

export interface IEntityFindOptions<T = any> {
    prefix?: string;
    transform?: (item: string) => T | Promise<T>;
}
