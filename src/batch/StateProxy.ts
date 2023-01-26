import { LoggerWrapper, ILogger, ArrayUtil } from '@ts-core/common';
import * as _ from 'lodash';
import { IKeyValue } from '../stub';

export class StateProxy extends LoggerWrapper {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected _toPut: Map<string, string>;
    protected _toRemove: Array<string>;

    protected state: Map<string, string>;
    protected getStateRaw: GetStateRaw;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, getStateRaw: GetStateRaw) {
        super(logger);

        this.state = new Map();
        this.getStateRaw = getStateRaw;

        this._toPut = new Map();
        this._toRemove = new Array();
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected isRemoved(key: string): boolean {
        return this.toRemove.includes(key);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public checkKV(items: Array<IKeyValue>): void {
        for (let i = items.length - 1; i > -1; i--) {
            let item = items[i];
            if (this.isRemoved(item.key)) {
                items.splice(i, 1);
            } else if (this.state.has(item.key)) {
                items.splice(i, 1, item);
            }
        }
    }

    public async getState(key: string): Promise<string> {
        if (this.isRemoved(key)) {
            return null;
        }
        if (this.state.has(key)) {
            return this.state.get(key);
        }
        let item = await this.getStateRaw(key);
        this.state.set(key, item);
        this.debug(`Get state: "${key}"`);
        this.verbose(`Get value: ${item}`);
        return item;
    }

    public putState(key: string, item: string): void {
        if (this.isRemoved(key)) {
            ArrayUtil.remove(this.toRemove, key);
        }
        this.state.set(key, item);
        this.toPut.set(key, item);
        this.debug(`Put state: "${key}"`);
        this.verbose(`Put value: ${item}`);
    }

    public removeState(key: string): void {
        if (!this.isRemoved(key)) {
            this.toRemove.push(key);
        }
        this.state.delete(key);
        this.toPut.delete(key);
        this.debug(`Remove state: "${key}"`);
    }

    public destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super.destroy();

        this.getStateRaw = null;

        this.state.clear();
        this.state = null;

        this.toPut.clear();
        this._toPut = null;

        this._toRemove = null;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public get toPut(): Map<string, string> {
        return this._toPut;
    }

    public get toRemove(): Array<string> {
        return this._toRemove;
    }
}

export type GetStateRaw = (key: string) => Promise<string>;
