import { ILogger } from '@ts-core/common';
import { CoinAccount } from '@hlf-core/common';
import { EntityManagerImpl } from '../entity';
import { IStub } from '../../stub';

export class CoinAccountManager extends EntityManagerImpl<CoinAccount> {
    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: IStub) {
        super(logger, stub, CoinAccount);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async save(item: CoinAccount): Promise<CoinAccount> {
        if (item.isEmpty()) {
            await this.remove(item);
            return item;
        }
        return super.save(item);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public get prefix(): string {
        return CoinAccount.PREFIX;
    }
}
