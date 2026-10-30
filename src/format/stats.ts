import { FIXED_HEADER_SIZE } from '../contracts/constants';
import type { CompressionStats } from '../contracts/types';

interface Sizes {
  originalBytes: number;
  compressedBytes: number;
  nameBytes: number;
  symbolCount: number;
  dataBytes: number;
  totalBits: number;
}

/** Desglose de tamaños de un `.ycoma` (D20: `savedBytes` puede ser negativo). */
export function buildStats(sizes: Sizes): CompressionStats {
  const { originalBytes, compressedBytes } = sizes;
  const savedBytes = originalBytes - compressedBytes;
  const empty = originalBytes === 0;
  return {
    originalBytes,
    compressedBytes,
    savedBytes,
    reductionPercent: empty ? null : (savedBytes / originalBytes) * 100,
    ratio: empty ? null : compressedBytes / originalBytes,
    symbolCount: sizes.symbolCount,
    headerBytes: FIXED_HEADER_SIZE + sizes.nameBytes,
    tableBytes: 2 * sizes.symbolCount,
    dataBytes: sizes.dataBytes,
    totalBits: sizes.totalBits,
  };
}

export function countSymbols(lengths: Uint8Array): number {
  let count = 0;
  for (let b = 0; b < lengths.length; b++) {
    if (lengths[b] > 0) count++;
  }
  return count;
}
