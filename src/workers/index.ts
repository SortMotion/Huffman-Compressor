import type {
  FrequencyTable,
  CompressResult,
  InspectResult,
  DecompressResult
} from '../contracts/types';

export interface HuffmanClient {
  analyze(data: Uint8Array, signal?: AbortSignal): Promise<FrequencyTable>;
  compress(data: Uint8Array, fileName: string, signal?: AbortSignal): Promise<CompressResult>;
  inspect(file: Uint8Array, signal?: AbortSignal): Promise<InspectResult>;
  decompress(file: Uint8Array, signal?: AbortSignal): Promise<DecompressResult>;
  dispose(): void;
}

export declare function createHuffmanClient(): HuffmanClient;
