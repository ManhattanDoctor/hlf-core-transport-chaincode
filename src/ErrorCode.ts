import { UID, getUid } from '@ts-core/common';
import { Error as BaseError } from '@hlf-core/common';
import * as _ from 'lodash';

export class Error<D = any> extends BaseError<ErrorCode> {
    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(code: ErrorCode, message: string = '', details?: D) {
        super(code, message, details);
    }
}

export class SignatureInvalidError extends Error<void> {
    constructor(message: string, details?: any) {
        super(ErrorCode.SIGNATURE_INVALID, message, details)
    }
}

export class BatchInvalidError extends Error<void> {
    constructor(message: string, details?: any) {
        super(ErrorCode.BATCH_INVALID, message, details)
    }
}

export class NoCommandsToBatchError extends Error<void> {
    constructor() {
        super(ErrorCode.NO_COMMANDS_TO_BATCH, 'No commands to batch')
    }
}

export class UserRoleForbiddenError extends Error<IUserRoleForbiddenErrorDetails> {
    constructor(user: UID, details: IUserRoleForbiddenErrorDetails) {
        super(ErrorCode.USER_ROLE_FORBIDDEN, `User "${getUid(user)}" roles forbidden`, details)
    }
}

export interface IUserRoleForbiddenErrorDetails {
    has: Array<string>;
    required: Array<string>;
}

export enum ErrorCode {
    BATCH_INVALID = 'HLF_BATCH_INVALID',
    SIGNATURE_INVALID = 'HLF_SIGNATURE_INVALID',
    NO_COMMANDS_TO_BATCH = 'HLF_NO_COMMANDS_TO_BATCH',
    USER_ROLE_FORBIDDEN = 'USER_ROLE_FORBIDDEN',
}
