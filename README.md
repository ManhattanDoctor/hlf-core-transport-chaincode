**English** · [Русский](./README.ru.md)

# @hlf-core/transport-chaincode

> TypeScript transport library on the chaincode side: command reception, signature verification, batch processing

[![npm version](https://img.shields.io/npm/v/@hlf-core/transport-chaincode.svg)](https://www.npmjs.com/package/@hlf-core/transport-chaincode)
[![Docs](https://img.shields.io/badge/docs-hlf.gnosisai.ru-1f6feb)](https://hlf.gnosisai.ru/docs/packages/transport-chaincode)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Full documentation: https://hlf.gnosisai.ru/docs/packages/transport-chaincode

A comprehensive TypeScript framework for building secure and scalable **chaincode for Hyperledger Fabric** with advanced transport-layer capabilities, cryptographic signature validation, batch processing, and an event-driven architecture.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Advanced Usage](#advanced-usage)
- [Security](#security)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Overview

`@hlf-core/transport-chaincode` is part of the **hlf-core ecosystem** - a collection of interconnected libraries designed to simplify development on Hyperledger Fabric. This library provides a robust transport-layer abstraction for chaincode, handling commands, signature validation, state management, and batch operations.

### Key Benefits

- **Focus on business logic**: The framework takes care of authentication, validation, and state management
- **Type safety**: Full TypeScript support with exhaustive type definitions
- **Secure by default**: Built-in cryptographic signature validation and replay-attack protection
- **Performance optimization**: Batch-processing support for high-load scenarios
- **Event-driven**: Observable pattern for the chaincode lifecycle and command events
- **Modular design**: Clear separation of concerns with an extensible architecture

## Features

### Security and Authentication

- **Cryptographic signature validation**: Verification of command signatures with configurable algorithms
- **Replay-attack protection**: A nonce-based mechanism prevents repeated attacks
- **Public key management**: A flexible public key validation system
- **Unsigned commands**: Optional support for commands that do not require signatures

### Command and Event Processing

- **Asynchronous command processing**: Built-in support for asynchronous command execution
- **Command Wrapper pattern**: A clean abstraction over ChaincodeStub from fabric-shim
- **Event dispatching**: An RxJS-based event system for the chaincode lifecycle
- **Transport abstraction**: A unified interface for command requests and responses

### State Management

- **State Proxy pattern**: Transactional state management with deferred writes
- **Automatic validation**: Built-in validation using class-validator decorators
- **Key-value operations**: Simplified get/put/remove operations
- **Pagination support**: Query large data sets with bookmarks

### Performance

- **Batch processing**: Execute multiple commands in a single transaction
- **State caching**: An in-memory caching layer for state operations
- **Optimized serialization**: Efficient JSON transformation with class-transformer

### Developer Experience

- **Seeding support**: Initialize chaincode state with initial data
- **Native TypeScript**: Written in TypeScript with full type safety
- **Dual module support**: CommonJS and ESM builds are included
- **Extensible architecture**: Factory patterns for customization

## Installation

```bash
npm install @hlf-core/transport-chaincode
```

### Dependencies

```bash
npm install @hlf-core/chaincode @hlf-core/transport-common @ts-core/common fabric-shim
```

## Quick Start

### Basic Chaincode Implementation

```typescript
import { ILogger } from '@ts-core/common';
import { ChaincodeStub } from 'fabric-shim';
import {
    TransportFabricChaincode,
    TransportFabricChaincodeReceiver
} from '@hlf-core/transport-chaincode';

// Define your chaincode class
export class MyChaincode extends TransportFabricChaincode<void> {
    constructor(logger: ILogger) {
        const transport = new TransportFabricChaincodeReceiver({
            cryptoManagers: [{
                algorithm: 'secp256k1',
                publicKey: 'your-public-key'
            }],
            nonSignedCommands: ['healthCheck']
        });

        super(logger, transport);
    }

    public get name(): string {
        return 'MyChaincode';
    }
}

// Start the chaincode
const chaincode = new MyChaincode(logger);
const shim = require('fabric-shim');
shim.start(chaincode);
```

### Command Handler Example

```typescript
import { ITransportCommand } from '@ts-core/common';
import { TransportCommandAsync } from '@ts-core/common';

// Define the command
export class CreateUserCommand extends TransportCommandAsync<ICreateUserRequest, ICreateUserResponse> {
    constructor(request: ICreateUserRequest) {
        super('CreateUserCommand', request);
    }
}

// Handle the command in your handler
export class CreateUserHandler {
    async execute(command: CreateUserCommand): Promise<ICreateUserResponse> {
        const stub = command.stub;

        // Validate the request
        ValidateUtil.validate(command.request);

        // Access the authenticated user
        const userId = stub.user.id;

        // Save to state
        await stub.putState(`user_${userId}`, command.request, {
            isValidate: true,
            isTransform: true,
            isSortKeys: true
        });

        // Dispatch an event
        await stub.dispatch(new UserCreatedEvent({ userId }));

        return { success: true, userId };
    }
}
```

## Core Concepts

### 1. Transport Layer

The transport layer handles communication between clients and chaincode, managing:
- Command serialization/deserialization
- Signature validation
- The request/response lifecycle
- Error handling

```typescript
const transport = new TransportFabricChaincodeReceiver({
    // Crypto managers for signature validation
    cryptoManagers: [
        { algorithm: 'secp256k1', publicKey: 'key1' },
        { algorithm: 'ed25519', publicKey: 'key2' }
    ],

    // Commands that do not require signatures
    nonSignedCommands: ['getVersion', 'healthCheck'],

    // Custom stub factory (optional)
    stubFactory: (logger, stub, payload, transport) =>
        new CustomStub(logger, stub, payload.id, payload.options, transport),

    // Custom command factory (optional)
    commandFactory: (payload) =>
        new CustomCommand(payload.name, payload.request, payload.id)
});
```

### 2. Chaincode Lifecycle Events

Monitor chaincode execution with RxJS observables:

```typescript
chaincode.events.subscribe((event) => {
    switch (event.type) {
        case TransportFabricChaincodeEvent.INITED:
            console.log('Chaincode initialized');
            break;
        case TransportFabricChaincodeEvent.INVOKE_STARTED:
            console.log('Command execution started');
            break;
        case TransportFabricChaincodeEvent.INVOKE_COMPLETE:
            console.log('Command completed successfully');
            break;
        case TransportFabricChaincodeEvent.INVOKE_ERROR:
            console.error('Command error', event.data.response);
            break;
        case TransportFabricChaincodeEvent.INVOKE_FINISHED:
            console.log('Execution finished');
            break;
    }
});
```

### 3. State Management with StateProxy

StateProxy provides transactional behavior for state operations:

```typescript
import { StateProxy } from '@hlf-core/transport-chaincode';

// StateProxy groups state changes and commits them atomically
const proxy = new StateProxy(logger, getStateRawFunction);

// Operations are cached in memory
await proxy.putState('key1', 'value1');
await proxy.putState('key2', 'value2');
await proxy.removeState('key3');

// Read operations check the cache first
const value = await proxy.getState('key1'); // Returns from the cache

// Access pending operations
console.log(proxy.toPut);     // Map of pending writes
console.log(proxy.toRemove);  // Array of pending removals
```

### 4. Batch Processing

Execute multiple commands in a single blockchain transaction to increase throughput:

```typescript
import { TransportFabricChaincodeReceiverBatch } from '@hlf-core/transport-chaincode';

const transport = new TransportFabricChaincodeReceiverBatch({
    batch: {
        timeout: 5000,              // Min. time between batch executions (ms)
        algorithm: 'secp256k1',     // Required signature algorithm
        publicKey: 'batch-key'      // Required public key for batch commands
    },
    cryptoManagers: [/* ... */]
});

// Commands are automatically grouped and executed together
// when the batch command is invoked
```

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TransportFabricChaincode                 │
│  - Implements ChaincodeInterface (fabric-shim)              │
│  - Manages lifecycle (Init, Invoke)                         │
│  - Emits observable events                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            TransportFabricChaincodeReceiver                 │
│  - Parses incoming requests                                 │
│  - Validates signatures                                     │
│  - Manages nonce (replay protection)                        │
│  - Dispatches commands to handlers                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌──────────────────┐          ┌──────────────────────┐
│ TransportFabric  │          │   StateProxy         │
│ Stub             │          │  - Caches operations │
│  - State         │◄─────────┤  - Deferred writes   │
│    operations    │          │  - Atomic commit     │
│  - User context  │          └──────────────────────┘
│  - TX metadata   │
│  - Events        │
└──────────────────┘
```

### Request Flow

```
Client request
      │
      ▼
[Fabric Network]
      │
      ▼
TransportFabricChaincode.Invoke()
      │
      ▼
TransportFabricChaincodeReceiver.invoke()
      │
      ├──► Parse payload
      ├──► Create stub
      ├──► Validate signature
      │     └──► Check algorithm
      │     └──► Check public key
      │     └──► Validate nonce (replay protection)
      │     └──► Cryptographic verification
      │
      ├──► Create command wrapper
      ├──► Dispatch to handler
      │
      ▼
[Your command handler]
      │
      ├──► Execute business logic
      ├──► State operations
      ├──► Dispatch events
      │
      ▼
Response is sent back through Fabric
```

## API Reference

### Classes

#### `TransportFabricChaincode<T>`

The abstract base class for chaincode implementation.

**Type parameters:**
- `T` - The custom event type

**Methods:**
- `Init(stub: ChaincodeStub): Promise<ChaincodeResponse>` - Chaincode initialization
- `Invoke(stub: ChaincodeStub): Promise<ChaincodeResponse>` - Invocation handling

**Properties:**
- `events: Observable<ObservableData<T | TransportFabricChaincodeEvent>>` - The event stream
- `name: string` - The chaincode name (abstract, must be implemented)
- `internalLoggerLevel: LoggerLevel` - Sets the fabric-shim logging level

#### `TransportFabricChaincodeReceiver<T>`

Handles request processing and command dispatching.

**Constructor options:**
```typescript
interface ITransportFabricChaincodeSettings {
    cryptoManagers?: Array<ITransportCryptoManager>;
    nonSignedCommands?: Array<string>;
    stubFactory?: <U>(logger, stub, payload, transport) => IStub;
    commandFactory?: <U>(payload) => ITransportCommand<U>;
}
```

**Methods:**
- `invoke<U, V>(chaincode: ChaincodeStub): Promise<ITransportFabricResponsePayload<V>>`
- `complete<U, V>(command: ITransportCommand<U>, response?: V | Error): void`

#### `TransportFabricStub`

A wrapper around ChaincodeStub from fabric-shim with extended functionality.

**State operation methods:**
```typescript
// Get state with automatic deserialization
getState<U>(key: string, type?: ClassType<U>): Promise<U>

// Get raw state as a string
getStateRaw(key: string): Promise<string>

// Save state with validation and transformation
putState<U>(key: string, value: U, options: IPutStateOptions): Promise<U>

// Save raw state
putStateRaw(key: string, item: string): Promise<void>

// Check whether state exists
hasState(key: string): Promise<boolean>
hasNotState(key: string): Promise<boolean>

// Remove state
removeState(key: string): Promise<void>

// Range queries
getStateByRange(startKey: string, endKey: string): Promise<StateQueryIterator>
getStateByRangeWithPagination(startKey, endKey, pageSize, bookmark?): Promise<StateQueryResponse>
```

**Properties:**
```typescript
stub: ChaincodeStub          // The original stub from fabric-shim
requestId: string            // Unique request ID
user: IStubUser              // Information about the authenticated user
  └─ id: string
  └─ publicKey: string
transaction: IStubTransaction // Transaction metadata
  └─ hash: string
  └─ date: Date
```

#### `StateProxy`

Transactional state management with caching.

**Methods:**
```typescript
getState(key: string): Promise<string>
putState(key: string, item: string): void
removeState(key: string): void
checkKV(items: Array<IKeyValue>): void
```

**Properties:**
```typescript
toPut: Map<string, string>      // Pending writes
toRemove: Array<string>         // Pending removals
```

#### `TransportFabricChaincodeReceiverBatch`

Extends the receiver with batch-processing capabilities.

**Additional settings:**
```typescript
interface ITransportFabricSettingsBatch {
    timeout: number;          // Min. ms between batch executions
    algorithm: string;        // Required signature algorithm for batches
    publicKey: string;        // Required public key for batches
}
```

### Error Codes

```typescript
enum ErrorCode {
    // Signature errors
    COMMAND_SIGNATURE_INVALID
    COMMAND_SIGNATURE_NOT_FOUND
    COMMAND_SIGNATURE_ALGORITHM_NOT_FOUND
    COMMAND_SIGNATURE_ALGORITHM_UNKNOWN
    COMMAND_SIGNATURE_PUBLIC_KEY_NOT_FOUND

    // Nonce errors (replay protection)
    COMMAND_SIGNATURE_NONCE_NOT_FOUND
    COMMAND_SIGNATURE_NONCE_LESS_THAN_PREVIOUS
    COMMAND_SIGNATURE_NONCE_NOT_NUMERIC_STRING

    // Batch-processing errors
    COMMAND_BATCH_NO_COMMANDS_TO_BATCH
    COMMAND_BATCH_TIMEOUT_NOT_EXCEED
    COMMAND_BATCH_SIGNATURE_ALGORITHM_INVALID
    COMMAND_BATCH_SIGNATURE_PUBLIC_KEY_INVALID
}
```

## Advanced Usage

### Custom Stub Implementation

```typescript
import { TransportFabricStub } from '@hlf-core/transport-chaincode';

export class CustomStub extends TransportFabricStub {
    // Add custom methods
    async getUserBalance(userId: string): Promise<number> {
        const balance = await this.getState(`balance_${userId}`);
        return balance ? parseInt(balance) : 0;
    }

    // Override existing methods
    async putState<U>(key: string, value: U, options): Promise<U> {
        // Add custom logging
        this.logger.debug(`Writing to state: ${key}`);

        // Call the parent implementation
        return super.putState(key, value, options);
    }
}

// Use in the transport configuration
const transport = new TransportFabricChaincodeReceiver({
    stubFactory: (logger, stub, payload, transport) =>
        new CustomStub(logger, stub, payload.id, payload.options, transport)
});
```

### Seeded Chaincode

Initialize chaincode with default data:

```typescript
import {
    TransportFabricSeededChaincode,
    Seeder
} from '@hlf-core/transport-chaincode';

export class MySeeder extends Seeder {
    async seed(stub: ChaincodeStub): Promise<void> {
        // Initialize the default configuration
        await stub.putState('config', {
            version: '1.0.0',
            createdAt: new Date()
        });

        // Save the seed marker
        await this.put(stub);
    }
}

export class MyChaincode extends TransportFabricSeededChaincode<MySeeder> {
    constructor(logger: ILogger) {
        const seeder = new MySeeder();
        super(logger, transport, seeder);
    }

    public get name(): string {
        return 'MyChaincode';
    }
}
```

### Pagination Example

```typescript
import { IPageBookmark } from '@ts-core/common';

// Paginated query
async function getAllUsers(stub: TransportFabricStub) {
    const request: IPageBookmark = {
        pageSize: 100,
        pageBookmark: undefined  // Start from the beginning
    };

    const result = await stub.getPaginatedKV(
        request,
        'user_',      // Start key
        'user_￿' // End key
    );

    console.log('Users:', result.items);
    console.log('Has more:', !result.isAllLoaded);
    console.log('Next bookmark:', result.pageBookmark);

    // Load the next page
    if (!result.isAllLoaded) {
        request.pageBookmark = result.pageBookmark;
        const nextPage = await stub.getPaginatedKV(request, 'user_', 'user_￿');
    }
}
```

### Invoking Another Chaincode

```typescript
import { ITransportCommandInvokeOptions } from '@hlf-core/chaincode';

async function callOtherChaincode(stub: TransportFabricStub) {
    const command = new GetUserCommand({ userId: '123' });

    const options: ITransportCommandInvokeOptions = {
        chaincode: 'user-chaincode',
        channel: 'mychannel',
        userId: stub.user.id,
        signature: {
            algorithm: 'secp256k1',
            publicKey: stub.user.publicKey,
            nonce: '1234',
            value: 'signature-value'
        }
    };

    // Fire and forget (without waiting for a response)
    stub.invokeSend(command, options);

    // Wait for a response
    const response = await stub.invokeSendListen(command, options);
    console.log('Response:', response);
}
```

## Security

### Signature Validation

The library implements comprehensive cryptographic signature validation:

1. **Algorithm check**: Ensures the signature algorithm is in the list of allowed ones
2. **Public key validation**: Verifies that the public key is authorized
3. **Nonce management**: Prevents replay attacks by using monotonically increasing nonces
4. **Cryptographic verification**: Uses TransportCryptoManager to verify the signature

### Replay Attack Protection

Nonces are stored per user and must strictly increase:

```typescript
// Nonce storage key format
`→${userId}~nonce`

// Validation rules
1. Nonce must be a numeric string
2. Nonce must be greater than the previous nonce
3. Nonce is saved to state after successful validation
4. Readonly commands do not update the stored nonce
```

### Best Practices

1. **Always use signatures** in production - disable them only for specific commands
2. **Rotate keys regularly** - update the cryptoManagers configuration
3. **Monitor nonce gaps** - large gaps may indicate problems
4. **Validate all input data** - use class-validator decorators
5. **Sanitize state keys** - prevent key injection attacks

## Examples

### Complete Chaincode Example

```typescript
import { ILogger, LoggerWrapper } from '@ts-core/common';
import {
    TransportFabricChaincode,
    TransportFabricChaincodeReceiver,
    TransportFabricChaincodeEvent
} from '@hlf-core/transport-chaincode';

export class UserChaincode extends TransportFabricChaincode<UserEvent> {
    constructor(logger: ILogger) {
        const transport = new TransportFabricChaincodeReceiver({
            cryptoManagers: [
                { algorithm: 'secp256k1', publicKey: process.env.PUBLIC_KEY }
            ],
            nonSignedCommands: ['getUserById', 'healthCheck']
        });

        super(logger, transport);

        // Register command handlers
        this.transport.listen('CreateUserCommand', (command) =>
            new CreateUserHandler().execute(command)
        );
        this.transport.listen('UpdateUserCommand', (command) =>
            new UpdateUserHandler().execute(command)
        );

        // Monitor events
        this.events.subscribe((event) => {
            if (event.type === TransportFabricChaincodeEvent.INVOKE_ERROR) {
                this.error('Command error:', event.data.response);
            }
        });
    }

    public get name(): string {
        return 'UserChaincode';
    }
}

// Start the chaincode
const logger = new ConsoleLogger();
const chaincode = new UserChaincode(logger);

require('fabric-shim').start(chaincode);
```

### Testing with a Mock Stub

```typescript
import { ChaincodeStub } from 'fabric-shim';
import { TransportFabricRequestPayload } from '@hlf-core/transport-common';

// Create a mock stub for testing
const mockStub = {
    getState: jest.fn(),
    putState: jest.fn(),
    deleteState: jest.fn(),
    getTxID: () => 'mock-tx-id',
    getChannelID: () => 'mychannel',
    getTxTimestamp: () => ({ seconds: Date.now() / 1000, nanos: 0 }),
    getFunctionAndParameters: () => ({
        fcn: 'TRANSPORT_FABRIC_METHOD',
        params: [JSON.stringify({
            id: 'cmd-123',
            name: 'CreateUserCommand',
            request: { name: 'John' },
            options: {
                userId: 'user-123',
                signature: {
                    algorithm: 'secp256k1',
                    publicKey: 'mock-key',
                    nonce: '1',
                    value: 'mock-signature'
                }
            }
        })]
    })
} as any;

// Test the invocation
const response = await transport.invoke(mockStub);
expect(response.error).toBeNull();
```

## Contributing

We welcome contributions to the project! This library is part of the hlf-core ecosystem.

### Development Environment Setup

```bash
# Clone the repository
git clone https://github.com/ManhattanDoctor/hlf-core-transport-chaincode.git
cd hlf-core-transport-chaincode

# Install dependencies
npm install

# Build
make build

# Clean build artifacts
make clean
```

### Build Targets

- `make build` - Build the CommonJS and ESM modules
- `make clean` - Remove build artifacts
- `make publish` - Publish to npm
- `make publish_patch` - Increment the patch version and publish
- `make publish_minor` - Increment the minor version and publish
- `make publish_major` - Increment the major version and publish

### Code Style

Please ensure:
- Compliance with TypeScript strict mode
- Consistent naming conventions
- Exhaustive JSDoc comments for public APIs
- Unit tests for new features

## Related Packages

Part of the **hlf-core ecosystem**:

- [@hlf-core/chaincode](https://github.com/ManhattanDoctor/hlf-core-chaincode) - ORM-like entity management for Fabric
- [@hlf-core/transport-common](https://github.com/ManhattanDoctor/hlf-core-transport-common) - Common transport types
- [@hlf-core/transport](https://github.com/ManhattanDoctor/hlf-core-transport) - Client-side transport
- [@ts-core/common](https://github.com/ManhattanDoctor/ts-core-common) - Core TypeScript utilities

## License

ISC

## Author

**Renat Gubaev**
- Email: renat.gubaev@gmail.com
- GitHub: [@ManhattanDoctor](https://github.com/ManhattanDoctor)

## Links

- [GitHub Repository](https://github.com/ManhattanDoctor/hlf-core-transport-chaincode)
- [NPM Package](https://www.npmjs.com/package/@hlf-core/transport-chaincode)
- [Issue Tracker](https://github.com/ManhattanDoctor/hlf-core-transport-chaincode/issues)
- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)

## Support

If you have found a bug or have a suggestion for improvement, please create an issue in [GitHub Issues](https://github.com/ManhattanDoctor/hlf-core-transport-chaincode/issues).
