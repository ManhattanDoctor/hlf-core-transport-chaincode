import { ExtendedError } from '@ts-core/common';
import * as _ from 'lodash';

export class Error<T = void> extends ExtendedError<T, ErrorCode> {
    // --------------------------------------------------------------------------
    //
    //  Static Methods
    //
    // --------------------------------------------------------------------------

    public static instanceOf(item: any): item is Error {
        return item instanceof Error || Object.values(ErrorCode).includes(item.code);
    }

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(code: ErrorCode, public details: T, public status: number = ExtendedError.HTTP_CODE_BAD_REQUEST) {
        super('', code, details);
        this.message = this.constructor.name;
    }
}

// Transport
export class CommandSignatureNotFoundError extends Error<void> {
    constructor() {
        super(ErrorCode.COMMAND_SIGNATURE_NOT_FOUND)
    }
}
export class CommandSignatureNonceNotFoundError extends Error<void> {
    constructor() {
        super(ErrorCode.COMMAND_SIGNATURE_NONCE_NOT_FOUND)
    }
}
export class CommandSignatureNonceNotNumericStringError extends Error<string | number> {
    constructor(nonce: string | number) {
        super(ErrorCode.COMMAND_SIGNATURE_NONCE_NOT_NUMERIC_STRING, nonce)
    }
}
export class CommandSignatureNonceLessThanPreviousError extends Error<string> {
    constructor(nonce: string) {
        super(ErrorCode.COMMAND_SIGNATURE_NONCE_LESS_THAN_PREVIOUS, nonce)
    }
}
export class CommandSignatureInvalidError extends Error<void> {
    constructor() {
        super(ErrorCode.COMMAND_SIGNATURE_INVALID)
    }
}
export class CommandSignatureAlgorithmInvalidError extends Error<void> {
    constructor() {
        super(ErrorCode.COMMAND_SIGNATURE_ALGORITHM_INVALID)
    }
}
export class CommandSignaturePublicKeyInvalidError extends Error<void> {
    constructor() {
        super(ErrorCode.COMMAND_SIGNATURE_PUBLIC_KEY_INVALID)
    }
}
export class CommandSignatureAlgorithmUnknownError extends Error<string> {
    constructor(algorithm: string) {
        super(ErrorCode.COMMAND_SIGNATURE_ALGORITHM_UNKNOWN, algorithm)
    }
}


export class CommandBatchSignatureAlgorithmInvalidError extends Error<IInvalidValue<string>> {
    constructor(details: IInvalidValue<string>) {
        super(ErrorCode.COMMAND_BATCH_SIGNATURE_ALGORITHM_INVALID, details)
    }
}
export class CommandBatchSignaturePublicKeyInvalidError extends Error<IInvalidValue<string>> {
    constructor(details: IInvalidValue<string>) {
        super(ErrorCode.COMMAND_BATCH_SIGNATURE_PUBLIC_KEY_INVALID, details)
    }
}
export class CommandBatchTimeoutNotExceedError extends Error<void> {
    constructor() {
        super(ErrorCode.COMMAND_BATCH_TIMEOUT_NOT_EXCEED)
    }
}
export class CommandBatchNoCommandsToBatchError extends Error<void> {
    constructor() {
        super(ErrorCode.COMMAND_BATCH_NO_COMMANDS_TO_BATCH)
    }
}

export interface IUserRoleForbiddenErrorDetails {
    has: Array<string>;
    required: Array<string>;
}

export interface IInvalidValue<T = any> {
    name?: string;
    value: T | Array<T>;
    expected?: T | Array<T>;
}

export enum ErrorCode {
    COMMAND_BATCH_NO_COMMANDS_TO_BATCH = 'HLF_COMMAND_BATCH_NO_COMMANDS_TO_BATCH',
    COMMAND_BATCH_TIMEOUT_NOT_EXCEED = 'HLF_COMMAND_BATCH_TIMEOUT_NOT_EXCEED',
    COMMAND_BATCH_SIGNATURE_ALGORITHM_INVALID = 'HLF_COMMAND_BATCH_SIGNATURE_ALGORITHM_INVALID',
    COMMAND_BATCH_SIGNATURE_PUBLIC_KEY_INVALID = 'HLF_COMMAND_BATCH_SIGNATURE_PUBLIC_KEY_INVALID',

    COMMAND_SIGNATURE_INVALID = 'HLF_COMMAND_SIGNATURE_INVALID',
    COMMAND_SIGNATURE_NOT_FOUND = 'HLF_COMMAND_SIGNATURE_NOT_FOUND',
    COMMAND_SIGNATURE_ALGORITHM_INVALID = 'HLF_COMMAND_SIGNATURE_ALGORITHM_INVALID',
    COMMAND_SIGNATURE_ALGORITHM_UNKNOWN = 'HLF_COMMAND_SIGNATURE_ALGORITHM_UNKNOWN',

    COMMAND_SIGNATURE_PUBLIC_KEY_INVALID = 'HLF_COMMAND_SIGNATURE_PUBLIC_KEY_INVALID',
    COMMAND_SIGNATURE_NONCE_NOT_FOUND = 'HLF_COMMAND_SIGNATURE_NONCE_NOT_FOUND',
    COMMAND_SIGNATURE_NONCE_LESS_THAN_PREVIOUS = 'HLF_COMMAND_SIGNATURE_NONCE_LESS_THAN_PREVIOUS',
    COMMAND_SIGNATURE_NONCE_NOT_NUMERIC_STRING = 'HLF_COMMAND_SIGNATURE_NONCE_NOT_NUMERIC_STRING',
}
