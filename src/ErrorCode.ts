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

export enum ErrorCode {
    BATCH_INVALID = 'HLF_BATCH_INVALID',
    SIGNATURE_INVALID = 'HLF_SIGNATURE_INVALID',
}
