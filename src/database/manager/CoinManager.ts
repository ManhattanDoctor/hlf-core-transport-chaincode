import { UID, TransformUtil, ILogger, IPaginableBookmark, IPaginationBookmark } from '@ts-core/common';
import { CoinAccountManager } from './CoinAccountManager';
import { Coin, CoinBalance, CoinAccount } from '@hlf-core/coin';
import { EntityManagerImpl } from '../entity';
import { IStub } from '../../stub';
import * as _ from 'lodash';

export class CoinManager extends EntityManagerImpl<Coin> {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected account: CoinAccountManager;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: IStub) {
        super(logger, stub, Coin)
        this.account = new CoinAccountManager(logger, stub);
    }

    // --------------------------------------------------------------------------
    //
    //  Emit / Burn Methods
    //
    // --------------------------------------------------------------------------

    public async emit(coin: Coin | string, to: string, amount: string): Promise<ICoinMovement> {
        coin = await this.coinGet(coin);
        coin.balance.emit(amount);
        coin = await this.save(coin);

        let account = await this.accountGet(coin.uid, to);
        account.emit(amount);
        account = await this.accountSet(account);
        return { coin, account };
    }

    public async emitHeld(coin: Coin | string, to: string, amount: string): Promise<ICoinMovement> {
        coin = await this.coinGet(coin);
        coin.balance.emitHeld(amount);
        coin = await this.save(coin);

        let account = await this.accountGet(coin.uid, to);
        account.emitHeld(amount);
        account = await this.accountSet(account);
        return { coin, account };
    }

    public async burn(coin: Coin | string, from: string, amount: string): Promise<ICoinMovement> {
        coin = await this.coinGet(coin);
        coin.balance.burn(amount);
        coin = await this.save(coin);

        let account = await this.accountGet(coin.uid, from);
        account.burn(amount);
        account = await this.accountSet(account);
        return { coin, account };
    }

    public async burnHeld(coin: Coin | string, from: string, amount: string): Promise<ICoinMovement> {
        coin = await this.coinGet(coin);
        coin.balance.burnHeld(amount);
        coin = await this.save(coin);

        let account = await this.accountGet(coin.uid, from);
        account.burnHeld(amount);
        account = await this.accountSet(account);
        return { coin, account };
    }

    public async hold(coin: Coin | string, from: string, amount: string): Promise<ICoinMovement> {
        coin = await this.coinGet(coin);
        coin.balance.hold(amount);
        coin = await this.save(coin);

        let account = await this.accountGet(coin.uid, from);
        account.hold(amount);
        await this.accountSet(account);
        return { coin, account };
    }

    public async unhold(coin: Coin | string, from: string, amount: string): Promise<ICoinMovement> {
        coin = await this.coinGet(coin);
        coin.balance.unhold(amount);
        coin = await this.save(coin);

        let account = await this.accountGet(coin.uid, from);
        account.unhold(amount);
        await this.accountSet(account);
        return { coin, account };
    }

    public async transfer(coin: Coin | string, from: string, to: string, amount: string): Promise<ICoinTransfer> {
        let uid = !_.isString(coin) ? coin.uid : coin;
        let fromAccount = await this.accountGet(uid, from);
        fromAccount.burn(amount);
        fromAccount = await this.accountSet(fromAccount);

        let toAccount = await this.accountGet(uid, to);
        toAccount.emit(amount);
        toAccount = await this.accountSet(toAccount);
        return { from: fromAccount, to: toAccount };
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected async coinGet(coin: Coin | string): Promise<Coin> {
        return !_.isString(coin) ? coin : this.get(coin);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async remove(item: UID): Promise<void> {
        await this.accountsRemove(item);
        await this.stub.removeState(CoinBalance.createUid(item));
        await super.remove(item);
    }

    public destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super.destroy();

        this.account.destroy();
        this.account = null;
    }

    // --------------------------------------------------------------------------
    //
    //  Account Methods
    //
    // --------------------------------------------------------------------------

    public async accountList(coin: UID, data: IPaginableBookmark<CoinAccount>): Promise<IPaginationBookmark<CoinAccount>> {
        return this.account.findPaginated(data, { prefix: CoinAccount.createUid(coin), transform: item => TransformUtil.toClass(CoinAccount, TransformUtil.toJSON(item)) });
    }

    public async accountGet(coin: UID, object: UID): Promise<CoinAccount> {
        let item = await this.account.get(CoinAccount.createUid(coin, object));
        if (_.isNil(item)) {
            item = CoinAccount.create(coin, object);
        }
        return item;
    }

    public async accountSet(item: CoinAccount): Promise<CoinAccount> {
        return this.account.save(item);
    }

    protected async accountsRemove(coin: UID): Promise<void> {
        let kv = await this.getKV(CoinAccount.createUid(coin));
        await Promise.all(kv.map(item => this.account.remove(item.key)));
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public get prefix(): string {
        return Coin.PREFIX;
    }
}

export interface ICoinMovement {
    coin: Coin;
    account: CoinAccount;
}
export interface ICoinTransfer {
    to: CoinAccount;
    from: CoinAccount;
}