import { ExtendedError } from '@ts-core/common';

export class NoCommandsToBatchError extends ExtendedError<string, string> {
    // --------------------------------------------------------------------------
    //
    //  Constants
    //
    // --------------------------------------------------------------------------

    public static CODE = 'NO_COMMANDS_TO_BATCH';

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor() {
        super('No commands to batch', NoCommandsToBatchError.CODE);
    }
} 