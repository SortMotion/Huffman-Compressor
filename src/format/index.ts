import type { CompressResult, DecompressResult, InspectResult } from '../contracts/types';

export declare function compress(input: Uint8Array, fileName: string): Promise<CompressResult>;
export declare function inspect(file: Uint8Array): InspectResult;
export declare function decompress(file: Uint8Array): Promise<DecompressResult>;
