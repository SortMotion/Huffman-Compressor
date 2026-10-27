import type { CanonicalLengths, CodeTable, EncodeResult, FrequencyTable, StatsInput, CompressionStats } from '../contracts/types';

export declare function countFrequencies(data: Uint8Array): FrequencyTable;
export declare function buildCanonicalLengths(freqs: FrequencyTable): CanonicalLengths;
export declare function buildCanonicalCodes(lengths: CanonicalLengths): CodeTable;
export declare function encode(data: Uint8Array, codes: CodeTable): EncodeResult;
export declare function decode(bytes: Uint8Array, totalBits: number, lengths: CanonicalLengths, originalSize: number): Uint8Array;
export declare function computeStats(input: StatsInput): CompressionStats;
