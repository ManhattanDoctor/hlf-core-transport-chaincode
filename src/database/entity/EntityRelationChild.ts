import { UID, IUIDable, IPaginableBookmark, IPaginationBookmark } from "@ts-core/common";
import { EntityManager } from "./EntityManager";
import { EntityRelation } from "./EntityRelation";
import * as _ from 'lodash';

export class EntityRelationChild<U extends IUIDable = any, V extends EntityManager<any> = any> extends EntityRelation {

    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected manager: V;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(parentPrefix: string, childPrefix: string, manager: V) {
        super(manager.stub, parentPrefix, childPrefix);
        this.manager = manager;
    }

    // --------------------------------------------------------------------------
    //
    //  Parent Methods
    //
    // --------------------------------------------------------------------------

    public async parentRemove(parent: UID): Promise<Array<UID>> {
        let items = await super.parentRemove(parent);
        for(let item of items) {
            await this.manager.remove(item);
        }
        return items;
    }

    // --------------------------------------------------------------------------
    //
    //  Child Methods
    //
    // --------------------------------------------------------------------------

    public async childList(parent: UID, data: IPaginableBookmark<U>): Promise<IPaginationBookmark<U>> {
        return this.manager.findPaginated(data, this.childListOptions(parent));
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
        this.manager = null;
    }
}