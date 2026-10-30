import type {
  FrequencyTable,
  CompressResult,
  InspectResult,
  DecompressResult,
} from '../contracts/types';

/**
 * `analyze` copia los datos. `compress`, `inspect` y `decompress` **transfieren** el buffer
 * del `Uint8Array` recibido (queda vacío en el hilo principal) para no duplicar memoria;
 * si después se necesita, hay que pasar una copia (`data.slice()`).
 * Los errores llegan como `HuffmanError` o `FormatError`, con su `code`.
 */
export interface HuffmanClient {
  analyze(data: Uint8Array, signal?: AbortSignal): Promise<FrequencyTable>;
  compress(data: Uint8Array, fileName: string, signal?: AbortSignal): Promise<CompressResult>;
  inspect(file: Uint8Array, signal?: AbortSignal): Promise<InspectResult>;
  decompress(file: Uint8Array, signal?: AbortSignal): Promise<DecompressResult>;
  dispose(): void;
}

export { createHuffmanClient } from './client';
