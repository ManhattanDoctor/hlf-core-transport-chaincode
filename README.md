# @hlf-core/transport-chaincode

[![npm version](https://img.shields.io/npm/v/@hlf-core/transport-chaincode.svg)](https://www.npmjs.com/package/@hlf-core/transport-chaincode)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

> [English](./README.md) | **Русский**

Комплексный TypeScript фреймворк для создания безопасного и масштабируемого **chaincode для Hyperledger Fabric** с расширенными возможностями транспортного уровня, криптографической валидацией подписей, пакетной обработкой и событийно-ориентированной архитектурой.

## Содержание

- [Обзор](#обзор)
- [Возможности](#возможности)
- [Установка](#установка)
- [Быстрый старт](#быстрый-старт)
- [Основные концепции](#основные-концепции)
- [Архитектура](#архитектура)
- [Справочник API](#справочник-api)
- [Продвинутое использование](#продвинутое-использование)
- [Безопасность](#безопасность)
- [Примеры](#примеры)
- [Участие в разработке](#участие-в-разработке)
- [Лицензия](#лицензия)

## Обзор

`@hlf-core/transport-chaincode` является частью **экосистемы hlf-core** - коллекции взаимосвязанных библиотек, разработанных для упрощения разработки на Hyperledger Fabric. Эта библиотека предоставляет надежную абстракцию транспортного уровня для chaincode, обрабатывая команды, валидацию подписей, управление состоянием и пакетные операции.

### Ключевые преимущества

- **Фокус на бизнес-логике**: Фреймворк берет на себя аутентификацию, валидацию и управление состоянием
- **Типобезопасность**: Полная поддержка TypeScript с исчерпывающими определениями типов
- **Безопасность по умолчанию**: Встроенная криптографическая валидация подписей и защита от replay-атак
- **Оптимизация производительности**: Поддержка пакетной обработки для высоконагруженных сценариев
- **Событийно-ориентированность**: Observable паттерн для жизненного цикла chaincode и событий команд
- **Модульный дизайн**: Четкое разделение ответственности с расширяемой архитектурой

## Возможности

### 🔐 Безопасность и аутентификация

- **Криптографическая валидация подписей**: Проверка подписей команд с настраиваемыми алгоритмами
- **Защита от replay-атак**: Механизм на основе nonce предотвращает повторные атаки
- **Управление публичными ключами**: Гибкая система валидации публичных ключей
- **Команды без подписей**: Опциональная поддержка команд, не требующих подписей

### 📦 Обработка команд и событий

- **Асинхронная обработка команд**: Встроенная поддержка асинхронного выполнения команд
- **Паттерн Command Wrapper**: Чистая абстракция над ChaincodeStub из fabric-shim
- **Диспетчеризация событий**: Система событий на основе RxJS для жизненного цикла chaincode
- **Абстракция транспорта**: Единый интерфейс для запросов и ответов команд

### 🗄️ Управление состоянием

- **Паттерн State Proxy**: Транзакционное управление состоянием с отложенной записью
- **Автоматическая валидация**: Встроенная валидация с использованием декораторов class-validator
- **Операции ключ-значение**: Упрощенные операции get/put/remove
- **Поддержка пагинации**: Запрос больших наборов данных с закладками

### ⚡ Производительность

- **Пакетная обработка**: Выполнение нескольких команд в одной транзакции
- **Кеширование состояния**: Слой кеширования в памяти для операций с состоянием
- **Оптимизированная сериализация**: Эффективная трансформация JSON с class-transformer

### 🌱 Удобство разработки

- **Поддержка seeding**: Инициализация состояния chaincode начальными данными
- **Нативный TypeScript**: Написан на TypeScript с полной типобезопасностью
- **Двойная поддержка модулей**: Включены сборки CommonJS и ESM
- **Расширяемая архитектура**: Паттерны фабрик для кастомизации

## Установка

```bash
npm install @hlf-core/transport-chaincode
```

### Зависимости

```bash
npm install @hlf-core/chaincode @hlf-core/transport-common @ts-core/common fabric-shim
```

## Быстрый старт

### Базовая реализация Chaincode

```typescript
import { ILogger } from '@ts-core/common';
import { ChaincodeStub } from 'fabric-shim';
import {
    TransportFabricChaincode,
    TransportFabricChaincodeReceiver
} from '@hlf-core/transport-chaincode';

// Определите класс вашего chaincode
export class MyChaincode extends TransportFabricChaincode<void> {
    constructor(logger: ILogger) {
        const transport = new TransportFabricChaincodeReceiver({
            cryptoManagers: [{
                algorithm: 'secp256k1',
                publicKey: 'ваш-публичный-ключ'
            }],
            nonSignedCommands: ['healthCheck']
        });

        super(logger, transport);
    }

    public get name(): string {
        return 'MyChaincode';
    }
}

// Запустите chaincode
const chaincode = new MyChaincode(logger);
const shim = require('fabric-shim');
shim.start(chaincode);
```

### Пример обработчика команды

```typescript
import { ITransportCommand } from '@ts-core/common';
import { TransportCommandAsync } from '@ts-core/common';

// Определите команду
export class CreateUserCommand extends TransportCommandAsync<ICreateUserRequest, ICreateUserResponse> {
    constructor(request: ICreateUserRequest) {
        super('CreateUserCommand', request);
    }
}

// Обработайте команду в вашем обработчике
export class CreateUserHandler {
    async execute(command: CreateUserCommand): Promise<ICreateUserResponse> {
        const stub = command.stub;

        // Валидация запроса
        ValidateUtil.validate(command.request);

        // Доступ к аутентифицированному пользователю
        const userId = stub.user.id;

        // Сохранение в состояние
        await stub.putState(`user_${userId}`, command.request, {
            isValidate: true,
            isTransform: true,
            isSortKeys: true
        });

        // Отправка события
        await stub.dispatch(new UserCreatedEvent({ userId }));

        return { success: true, userId };
    }
}
```

## Основные концепции

### 1. Транспортный уровень

Транспортный уровень обрабатывает коммуникацию между клиентами и chaincode, управляя:
- Сериализацией/десериализацией команд
- Валидацией подписей
- Жизненным циклом запрос/ответ
- Обработкой ошибок

```typescript
const transport = new TransportFabricChaincodeReceiver({
    // Менеджеры криптографии для валидации подписей
    cryptoManagers: [
        { algorithm: 'secp256k1', publicKey: 'key1' },
        { algorithm: 'ed25519', publicKey: 'key2' }
    ],

    // Команды, не требующие подписей
    nonSignedCommands: ['getVersion', 'healthCheck'],

    // Кастомная фабрика stub (опционально)
    stubFactory: (logger, stub, payload, transport) =>
        new CustomStub(logger, stub, payload.id, payload.options, transport),

    // Кастомная фабрика команд (опционально)
    commandFactory: (payload) =>
        new CustomCommand(payload.name, payload.request, payload.id)
});
```

### 2. События жизненного цикла Chaincode

Мониторинг выполнения chaincode с помощью RxJS observables:

```typescript
chaincode.events.subscribe((event) => {
    switch (event.type) {
        case TransportFabricChaincodeEvent.INITED:
            console.log('Chaincode инициализирован');
            break;
        case TransportFabricChaincodeEvent.INVOKE_STARTED:
            console.log('Началось выполнение команды');
            break;
        case TransportFabricChaincodeEvent.INVOKE_COMPLETE:
            console.log('Команда успешно завершена');
            break;
        case TransportFabricChaincodeEvent.INVOKE_ERROR:
            console.error('Ошибка команды', event.data.response);
            break;
        case TransportFabricChaincodeEvent.INVOKE_FINISHED:
            console.log('Выполнение завершено');
            break;
    }
});
```

### 3. Управление состоянием с StateProxy

StateProxy обеспечивает транзакционное поведение для операций с состоянием:

```typescript
import { StateProxy } from '@hlf-core/transport-chaincode';

// StateProxy группирует изменения состояния и фиксирует их атомарно
const proxy = new StateProxy(logger, getStateRawFunction);

// Операции кешируются в памяти
await proxy.putState('key1', 'value1');
await proxy.putState('key2', 'value2');
await proxy.removeState('key3');

// Операции чтения сначала проверяют кеш
const value = await proxy.getState('key1'); // Возвращает из кеша

// Доступ к ожидающим операциям
console.log(proxy.toPut);     // Map ожидающих записей
console.log(proxy.toRemove);  // Array ожидающих удалений
```

### 4. Пакетная обработка

Выполнение нескольких команд в одной блокчейн-транзакции для повышения пропускной способности:

```typescript
import { TransportFabricChaincodeReceiverBatch } from '@hlf-core/transport-chaincode';

const transport = new TransportFabricChaincodeReceiverBatch({
    batch: {
        timeout: 5000,              // Мин. время между выполнением пакетов (мс)
        algorithm: 'secp256k1',     // Требуемый алгоритм подписи
        publicKey: 'batch-key'      // Требуемый публичный ключ для пакетных команд
    },
    cryptoManagers: [/* ... */]
});

// Команды автоматически группируются и выполняются вместе
// при вызове пакетной команды
```

## Архитектура

### Диаграмма компонентов

```
┌─────────────────────────────────────────────────────────────┐
│                    TransportFabricChaincode                 │
│  - Реализует ChaincodeInterface (fabric-shim)               │
│  - Управляет жизненным циклом (Init, Invoke)                │
│  - Генерирует observable события                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            TransportFabricChaincodeReceiver                 │
│  - Парсит входящие запросы                                  │
│  - Валидирует подписи                                       │
│  - Управляет nonce (защита от replay)                       │
│  - Диспетчеризует команды обработчикам                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌──────────────────┐          ┌──────────────────────┐
│ TransportFabric  │          │   StateProxy         │
│ Stub             │          │  - Кеширует операции │
│  - Операции с    │◄─────────┤  - Отложенная запись │
│    состоянием    │          │  - Атомарный commit  │
│  - User context  │          └──────────────────────┘
│  - TX метаданные │
│  - События       │
└──────────────────┘
```

### Поток запроса

```
Запрос клиента
      │
      ▼
[Сеть Fabric]
      │
      ▼
TransportFabricChaincode.Invoke()
      │
      ▼
TransportFabricChaincodeReceiver.invoke()
      │
      ├──► Парсинг payload
      ├──► Создание stub
      ├──► Валидация подписи
      │     └──► Проверка алгоритма
      │     └──► Проверка публичного ключа
      │     └──► Валидация nonce (защита от replay)
      │     └──► Криптографическая верификация
      │
      ├──► Создание wrapper команды
      ├──► Диспетчеризация обработчику
      │
      ▼
[Ваш обработчик команды]
      │
      ├──► Выполнение бизнес-логики
      ├──► Операции с состоянием
      ├──► Диспетчеризация событий
      │
      ▼
Ответ отправляется обратно через Fabric
```

## Справочник API

### Классы

#### `TransportFabricChaincode<T>`

Абстрактный базовый класс для реализации chaincode.

**Параметры типа:**
- `T` - Пользовательский тип события

**Методы:**
- `Init(stub: ChaincodeStub): Promise<ChaincodeResponse>` - Инициализация chaincode
- `Invoke(stub: ChaincodeStub): Promise<ChaincodeResponse>` - Обработка вызовов

**Свойства:**
- `events: Observable<ObservableData<T | TransportFabricChaincodeEvent>>` - Поток событий
- `name: string` - Имя chaincode (абстрактное, должно быть реализовано)
- `internalLoggerLevel: LoggerLevel` - Установка уровня логирования fabric-shim

#### `TransportFabricChaincodeReceiver<T>`

Обрабатывает обработку запросов и диспетчеризацию команд.

**Опции конструктора:**
```typescript
interface ITransportFabricChaincodeSettings {
    cryptoManagers?: Array<ITransportCryptoManager>;
    nonSignedCommands?: Array<string>;
    stubFactory?: <U>(logger, stub, payload, transport) => IStub;
    commandFactory?: <U>(payload) => ITransportCommand<U>;
}
```

**Методы:**
- `invoke<U, V>(chaincode: ChaincodeStub): Promise<ITransportFabricResponsePayload<V>>`
- `complete<U, V>(command: ITransportCommand<U>, response?: V | Error): void`

#### `TransportFabricStub`

Обертка вокруг ChaincodeStub из fabric-shim с расширенной функциональностью.

**Методы работы с состоянием:**
```typescript
// Получение состояния с автоматической десериализацией
getState<U>(key: string, type?: ClassType<U>): Promise<U>

// Получение сырого состояния как строки
getStateRaw(key: string): Promise<string>

// Сохранение состояния с валидацией и трансформацией
putState<U>(key: string, value: U, options: IPutStateOptions): Promise<U>

// Сохранение сырого состояния
putStateRaw(key: string, item: string): Promise<void>

// Проверка существования состояния
hasState(key: string): Promise<boolean>
hasNotState(key: string): Promise<boolean>

// Удаление состояния
removeState(key: string): Promise<void>

// Запросы по диапазону
getStateByRange(startKey: string, endKey: string): Promise<StateQueryIterator>
getStateByRangeWithPagination(startKey, endKey, pageSize, bookmark?): Promise<StateQueryResponse>
```

**Свойства:**
```typescript
stub: ChaincodeStub          // Оригинальный stub из fabric-shim
requestId: string            // Уникальный ID запроса
user: IStubUser              // Информация об аутентифицированном пользователе
  └─ id: string
  └─ publicKey: string
transaction: IStubTransaction // Метаданные транзакции
  └─ hash: string
  └─ date: Date
```

#### `StateProxy`

Транзакционное управление состоянием с кешированием.

**Методы:**
```typescript
getState(key: string): Promise<string>
putState(key: string, item: string): void
removeState(key: string): void
checkKV(items: Array<IKeyValue>): void
```

**Свойства:**
```typescript
toPut: Map<string, string>      // Ожидающие записи
toRemove: Array<string>         // Ожидающие удаления
```

#### `TransportFabricChaincodeReceiverBatch`

Расширяет receiver возможностями пакетной обработки.

**Дополнительные настройки:**
```typescript
interface ITransportFabricSettingsBatch {
    timeout: number;          // Мин. мс между выполнением пакетов
    algorithm: string;        // Требуемый алгоритм подписи для пакетов
    publicKey: string;        // Требуемый публичный ключ для пакетов
}
```

### Коды ошибок

```typescript
enum ErrorCode {
    // Ошибки подписи
    COMMAND_SIGNATURE_INVALID
    COMMAND_SIGNATURE_NOT_FOUND
    COMMAND_SIGNATURE_ALGORITHM_NOT_FOUND
    COMMAND_SIGNATURE_ALGORITHM_UNKNOWN
    COMMAND_SIGNATURE_PUBLIC_KEY_NOT_FOUND

    // Ошибки nonce (защита от replay)
    COMMAND_SIGNATURE_NONCE_NOT_FOUND
    COMMAND_SIGNATURE_NONCE_LESS_THAN_PREVIOUS
    COMMAND_SIGNATURE_NONCE_NOT_NUMERIC_STRING

    // Ошибки пакетной обработки
    COMMAND_BATCH_NO_COMMANDS_TO_BATCH
    COMMAND_BATCH_TIMEOUT_NOT_EXCEED
    COMMAND_BATCH_SIGNATURE_ALGORITHM_INVALID
    COMMAND_BATCH_SIGNATURE_PUBLIC_KEY_INVALID
}
```

## Продвинутое использование

### Кастомная реализация Stub

```typescript
import { TransportFabricStub } from '@hlf-core/transport-chaincode';

export class CustomStub extends TransportFabricStub {
    // Добавление кастомных методов
    async getUserBalance(userId: string): Promise<number> {
        const balance = await this.getState(`balance_${userId}`);
        return balance ? parseInt(balance) : 0;
    }

    // Переопределение существующих методов
    async putState<U>(key: string, value: U, options): Promise<U> {
        // Добавление кастомного логирования
        this.logger.debug(`Запись в состояние: ${key}`);

        // Вызов родительской реализации
        return super.putState(key, value, options);
    }
}

// Использование в конфигурации transport
const transport = new TransportFabricChaincodeReceiver({
    stubFactory: (logger, stub, payload, transport) =>
        new CustomStub(logger, stub, payload.id, payload.options, transport)
});
```

### Chaincode с начальными данными (Seeded)

Инициализация chaincode с данными по умолчанию:

```typescript
import {
    TransportFabricSeededChaincode,
    Seeder
} from '@hlf-core/transport-chaincode';

export class MySeeder extends Seeder {
    async seed(stub: ChaincodeStub): Promise<void> {
        // Инициализация конфигурации по умолчанию
        await stub.putState('config', {
            version: '1.0.0',
            createdAt: new Date()
        });

        // Сохранение маркера seed
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

### Пример пагинации

```typescript
import { IPageBookmark } from '@ts-core/common';

// Запрос с пагинацией
async function getAllUsers(stub: TransportFabricStub) {
    const request: IPageBookmark = {
        pageSize: 100,
        pageBookmark: undefined  // Начало с начала
    };

    const result = await stub.getPaginatedKV(
        request,
        'user_',      // Начальный ключ
        'user_\uffff' // Конечный ключ
    );

    console.log('Пользователи:', result.items);
    console.log('Есть еще:', !result.isAllLoaded);
    console.log('Следующая закладка:', result.pageBookmark);

    // Загрузка следующей страницы
    if (!result.isAllLoaded) {
        request.pageBookmark = result.pageBookmark;
        const nextPage = await stub.getPaginatedKV(request, 'user_', 'user_\uffff');
    }
}
```

### Вызов другого Chaincode

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
            value: 'значение-подписи'
        }
    };

    // Fire and forget (без ожидания ответа)
    stub.invokeSend(command, options);

    // Ожидание ответа
    const response = await stub.invokeSendListen(command, options);
    console.log('Ответ:', response);
}
```

## Безопасность

### Валидация подписей

Библиотека реализует комплексную криптографическую валидацию подписей:

1. **Проверка алгоритма**: Убеждается, что алгоритм подписи находится в списке разрешенных
2. **Валидация публичного ключа**: Проверяет, что публичный ключ авторизован
3. **Управление nonce**: Предотвращает replay-атаки используя монотонно возрастающие nonce
4. **Криптографическая верификация**: Использует TransportCryptoManager для проверки подписи

### Защита от Replay-атак

Nonce хранятся для каждого пользователя и должны строго возрастать:

```typescript
// Формат ключа хранения nonce
`→${userId}~nonce`

// Правила валидации
1. Nonce должен быть числовой строкой
2. Nonce должен быть больше предыдущего nonce
3. Nonce сохраняется в состояние после успешной валидации
4. Readonly команды не обновляют сохраненный nonce
```

### Лучшие практики

1. **Всегда используйте подписи** в production - отключайте только для конкретных команд
2. **Регулярно ротируйте ключи** - обновляйте конфигурацию cryptoManagers
3. **Мониторьте пропуски nonce** - большие пропуски могут указывать на проблемы
4. **Валидируйте все входные данные** - используйте декораторы class-validator
5. **Санитизируйте ключи состояния** - предотвращайте атаки инъекции ключей

## Примеры

### Полный пример Chaincode

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

        // Регистрация обработчиков команд
        this.transport.listen('CreateUserCommand', (command) =>
            new CreateUserHandler().execute(command)
        );
        this.transport.listen('UpdateUserCommand', (command) =>
            new UpdateUserHandler().execute(command)
        );

        // Мониторинг событий
        this.events.subscribe((event) => {
            if (event.type === TransportFabricChaincodeEvent.INVOKE_ERROR) {
                this.error('Ошибка команды:', event.data.response);
            }
        });
    }

    public get name(): string {
        return 'UserChaincode';
    }
}

// Запуск chaincode
const logger = new ConsoleLogger();
const chaincode = new UserChaincode(logger);

require('fabric-shim').start(chaincode);
```

### Тестирование с Mock Stub

```typescript
import { ChaincodeStub } from 'fabric-shim';
import { TransportFabricRequestPayload } from '@hlf-core/transport-common';

// Создание mock stub для тестирования
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
            request: { name: 'Иван' },
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

// Тестирование вызова
const response = await transport.invoke(mockStub);
expect(response.error).toBeNull();
```

## Участие в разработке

Мы приветствуем вклад в развитие проекта! Эта библиотека является частью экосистемы hlf-core.

### Настройка окружения разработки

```bash
# Клонирование репозитория
git clone https://github.com/ManhattanDoctor/hlf-core-transport-chaincode.git
cd hlf-core-transport-chaincode

# Установка зависимостей
npm install

# Сборка
make build

# Очистка артефактов сборки
make clean
```

### Цели сборки

- `make build` - Сборка модулей CommonJS и ESM
- `make clean` - Удаление артефактов сборки
- `make publish` - Публикация в npm
- `make publish_patch` - Увеличение patch версии и публикация
- `make publish_minor` - Увеличение minor версии и публикация
- `make publish_major` - Увеличение major версии и публикация

### Стиль кода

Пожалуйста, убедитесь в:
- Соответствии TypeScript strict mode
- Последовательных соглашениях об именовании
- Исчерпывающих JSDoc комментариях для публичных API
- Unit тестах для новых функций (TODO: тесты нужно добавить)

## Связанные библиотеки

Часть **экосистемы hlf-core**:

- [@hlf-core/chaincode](https://github.com/ManhattanDoctor/hlf-core-chaincode) - ORM-подобное управление сущностями для Fabric
- [@hlf-core/transport-common](https://github.com/ManhattanDoctor/hlf-core-transport-common) - Общие типы транспорта
- [@hlf-core/transport](https://github.com/ManhattanDoctor/hlf-core-transport) - Клиентский транспорт
- [@ts-core/common](https://github.com/ManhattanDoctor/ts-core-common) - Базовые TypeScript утилиты

## Лицензия

ISC License - см. файл LICENSE для деталей

## Автор

**Ренат Губаев**
- Email: renat.gubaev@gmail.com
- GitHub: [@ManhattanDoctor](https://github.com/ManhattanDoctor)

## Поддержка

- [Вопросы и проблемы](https://github.com/ManhattanDoctor/hlf-core-transport-chaincode/issues)
- [Обсуждения](https://github.com/ManhattanDoctor/hlf-core-transport-chaincode/discussions)

---

**Создано с ❤️ для сообщества Hyperledger Fabric**
