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

export interface IUserRoleForbiddenErrorDetails {
    has: Array<string>;
    required: Array<string>;
}

export enum ErrorCode {
    BATCH_INVALID = 'HLF_BATCH_INVALID',
    SIGNATURE_INVALID = 'HLF_SIGNATURE_INVALID',
    NO_COMMANDS_TO_BATCH = 'HLF_NO_COMMANDS_TO_BATCH'
}
