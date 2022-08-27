import { ITransportFabricResponsePayload } from '@hlf-core/transport-common';
import { ExtendedError } from '@ts-core/common';

export interface ITransportFabricBatchDto {
    [key: string]: ITransportFabricResponsePayload | ExtendedError;
}
