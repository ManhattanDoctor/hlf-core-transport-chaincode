import { ExtendedError, UID, getUid } from '@ts-core/common';
import * as _ from 'lodash';

class Error<C, D = any> extends ExtendedError<D, C | ErrorCode> {
    constructor(code: C | ErrorCode, message: string = '', details?: D) {
        super(message, code, details);
    }
}

// Transport
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
// User
export class UserRoleForbiddenError extends Error<IUserRoleForbiddenErrorDetails> {
    constructor(user: UID, details: IUserRoleForbiddenErrorDetails) {
        super(ErrorCode.USER_ROLE_FORBIDDEN, `User "${getUid(user)}" roles forbidden`, details)
    }
}
// Coin
export class CoinNotFoundError extends Error<void> {
    constructor(item: UID) {
        super(ErrorCode.COIN_NOT_FOUND, `Unable to find "${getUid(item)}" coin`);
    }
}
export class CoinObjectNotFoundError extends Error<void> {
    constructor(item: UID) {
        super(ErrorCode.COIN_OBJECT_NOT_FOUND, `Unable to find "${getUid(item)}" coin object`);
    }
}
export class CoinAlreadyExistsError extends Error<void> {
    constructor(item: UID) {
        super(ErrorCode.COIN_ALREADY_EXISTS, `Coin "${getUid(item)}" already exists`);
    }
}
export class CoinTransferForbiddenError extends Error<void> {
    constructor(item: UID) {
        super(ErrorCode.COIN_TRANSFER_FORBIDDEN, `Coin tranfser for "${getUid(item)}" forbidden`);
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
    // Coin
    COIN_NOT_FOUND = 'COIN_NOT_FOUND',
    COIN_ALREADY_EXISTS = 'COIN_ALREADY_EXISTS',
    COIN_OBJECT_NOT_FOUND = 'COIN_OBJECT_NOT_FOUND',
    COIN_TRANSFER_FORBIDDEN = 'COIN_TRANSFER_FORBIDDEN',
}
