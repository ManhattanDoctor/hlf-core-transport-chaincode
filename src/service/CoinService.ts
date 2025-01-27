import { ILogger, LoggerWrapper, ObjectUtil } from '@ts-core/common';
import { CoinBalance, ICoinEmitDto, CoinTransferredEvent, CoinEmittedEvent, CoinBurnedEvent, ICoinHoldDto, CoinHoldedEvent, CoinUnholdedEvent, ICoinTransferDto, ICoinBalanceGetDto, ICoinBalance, ICoin } from '@hlf-core/coin';
import { IStub, IStubHolder } from '../stub';
import { CoinNotFoundError, CoinObjectNotFoundError } from '../Error';
import { CoinManager, ICoinManager } from '../database/manager/coin';
import * as _ from 'lodash';

export class CoinService<H extends IStubHolder = IStubHolder> extends LoggerWrapper {
    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger) {
        super(logger);
    }

    // --------------------------------------------------------------------------
    //
    //  Add Methods
    //
    // --------------------------------------------------------------------------

    /*
    public async add(holder: IUserStubHolder, coinId: string, decimals: number, owner: UID, emit?: Partial<ICoinEmitDto>): Promise<T> {
        let uid = CoinUtil.createUid(coinId, decimals, owner);
        if (await holder.stub.hasState(uid)) {
            throw new CoinAlreadyExistsError(uid);
        }

        let manager = this.getManager(holder.stub, uid);
        let item = manager.create(coinId, decimals, owner);
        await manager.save(item);

        if (!_.isNil(emit)) {
            await manager.emit(item, emit.objectUid, emit.amount);
            await holder.stub.dispatch(new CoinEmittedEvent({ coinUid: item.uid, objectUid: emit.objectUid, amount: emit.amount }));
        }
        return item;
    }
    */

    // --------------------------------------------------------------------------
    //
    //  Emit / Burn Methods
    //
    // --------------------------------------------------------------------------

    public async emit(holder: H, params: ICoinEmitDto): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.objectUid)) {
            throw new CoinObjectNotFoundError(params.objectUid);
        }
        await this.getManager(holder.stub, params.coinUid).emit(params.coinUid, params.objectUid, params.amount);
        await holder.stub.dispatch(new CoinEmittedEvent(params));
    }

    public async emitHeld(holder: H, params: ICoinEmitDto): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.objectUid)) {
            throw new CoinObjectNotFoundError(params.objectUid);
        }
        await this.getManager(holder.stub, params.coinUid).emitHeld(params.coinUid, params.objectUid, params.amount);
        await holder.stub.dispatch(new CoinEmittedEvent(params));
    }

    public async burn(holder: H, params: ICoinEmitDto): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.objectUid)) {
            throw new CoinObjectNotFoundError(params.objectUid);
        }
        await this.getManager(holder.stub, params.coinUid).burn(params.coinUid, params.objectUid, params.amount);
        await holder.stub.dispatch(new CoinBurnedEvent(params));
    }

    public async burnHeld(holder: H, params: ICoinEmitDto): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.objectUid)) {
            throw new CoinObjectNotFoundError(params.objectUid);
        }
        await this.getManager(holder.stub, params.coinUid).burnHeld(params.coinUid, params.objectUid, params.amount);
        await holder.stub.dispatch(new CoinBurnedEvent(params));
    }

    // --------------------------------------------------------------------------
    //
    //  Hold Methods
    //
    // --------------------------------------------------------------------------

    public async hold(holder: H, params: ICoinHoldDto): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.from)) {
            throw new CoinObjectNotFoundError(params.from);
        }
        await this.getManager(holder.stub, params.coinUid).hold(params.coinUid, params.from, params.amount);
        await holder.stub.dispatch(new CoinHoldedEvent({ coinUid: params.coinUid, amount: params.amount, objectUid: params.from }));
    }

    public async unhold(holder: H, params: ICoinHoldDto): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.from)) {
            throw new CoinObjectNotFoundError(params.from);
        }
        await this.getManager(holder.stub, params.coinUid).unhold(params.coinUid, params.from, params.amount);
        await holder.stub.dispatch(new CoinUnholdedEvent({ coinUid: params.coinUid, amount: params.amount, objectUid: params.from }));
    }

    // --------------------------------------------------------------------------
    //
    //  Transfer Methods
    //
    // --------------------------------------------------------------------------

    public async transfer(holder: H, params: ICoinTransferDto): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.to)) {
            throw new CoinObjectNotFoundError(params.to);
        }
        if (await holder.stub.hasNotState(params.from)) {
            throw new CoinObjectNotFoundError(params.from);
        }
        await this.getManager(holder.stub, params.coinUid).transfer(params.coinUid, params.from, params.to, params.amount);
        await holder.stub.dispatch(new CoinTransferredEvent({ coinUid: params.coinUid, from: params.from, to: params.to, amount: params.amount }));
    }

    // --------------------------------------------------------------------------
    //
    //  Other Methods
    //
    // --------------------------------------------------------------------------

    public async balanceGet(holder: H, params: ICoinBalanceGetDto): Promise<ICoinBalance> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.objectUid)) {
            throw new CoinObjectNotFoundError(params.objectUid);
        }
        let account = await this.getManager(holder.stub, params.coinUid).accountGet(params.coinUid, params.objectUid);
        let item = new CoinBalance();
        ObjectUtil.copyPartial(account, item, ['held', 'inUse']);
        return item;
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected getManager<T extends ICoin>(stub: IStub, coinUid: string): ICoinManager<T> {
        return new CoinManager<T>(this.logger, stub);
    }
}