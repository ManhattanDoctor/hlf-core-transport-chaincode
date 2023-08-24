import { getUid, UID, DestroyableContainer } from "@ts-core/common";
import { ITransportFabricStub } from "../../stub";
import { DatabaseManager } from "../DatabaseManager";
import { IEntityFindOptions } from "./EntityManager";
import * as _ from 'lodash';

export class EntityRelation extends DestroyableContainer {

    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected stub: ITransportFabricStub;
    protected childPrefix: string;
    protected parentPrefix: string;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(stub: ITransportFabricStub, parentPrefix: string, childPrefix: string) {
        super();
        this.stub = stub;
        this.childPrefix = childPrefix;
        this.parentPrefix = parentPrefix;
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected getChildKey(child: UID, parent?: UID): string {
        let item = `→link:${this.childPrefix}~${this.parentPrefix}:${getUid(child)}`;
        return !_.isNil(parent) ? `${item}~${getUid(parent)}` : item;
    }

    protected getParentKey(parent: UID, child?: UID): string {
        let value = `→link:${this.parentPrefix}~${this.childPrefix}:${getUid(parent)}`;
        return !_.isNil(child) ? `${value}~${getUid(child)}` : value;
    }

    protected async linkAdd(child: UID, parent: UID): Promise<void> {
        await this.stub.putStateRaw(this.getChildKey(child, parent), getUid(parent));
        await this.stub.putStateRaw(this.getParentKey(parent, child), getUid(child));
    }

    protected async linkRemove(child: UID, parent: UID): Promise<void> {
        await this.stub.removeState(this.getChildKey(child, parent));
        await this.stub.removeState(this.getParentKey(parent, child));
    }

    // --------------------------------------------------------------------------
    //
    //  Child Methods
    //
    // --------------------------------------------------------------------------

    public async childAdd(child: UID, parent: UID): Promise<void> {
        return this.linkAdd(child, parent);
    }

    public childListOptions<T>(parent: UID): IEntityFindOptions<T> {
        return { prefix: this.getParentKey(parent), transform: item => this.stub.getState(item) };
    }

    public async childRemove(child: UID): Promise<void> {
        let kv = await DatabaseManager.getKV(this.stub, this.getChildKey(child));
        for (let { value } of kv) {
            await this.linkRemove(child, value);
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Link Methods
    //
    // --------------------------------------------------------------------------

    public async childLinkAdd(child: UID, parent: UID): Promise<void> {
        return this.linkAdd(child, parent);
    }

    public async childLinkHas(child: UID, parent: UID): Promise<boolean> {
        return this.stub.hasState(this.getChildKey(child, parent));
    }

    public async childLinkRemove(child: UID, parent: UID): Promise<void> {
        return this.linkRemove(child, parent);
    }

    // --------------------------------------------------------------------------
    //
    //  Parent Methods
    //
    // --------------------------------------------------------------------------

    public async parentRemove(parent: UID): Promise<Array<UID>> {
        let items = await DatabaseManager.getValues(this.stub, this.getParentKey(parent));
        for (let child of items) {
            await this.linkRemove(child, parent);
        }
        return items;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroy();
        this.stub = null;
        this.childPrefix = null;
        this.parentPrefix = null;
    }
}