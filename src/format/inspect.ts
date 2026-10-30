import { buildCanonicalCodes } from '../core';
import type { InspectResult } from '../contracts/types';
import { headerByteLength, parseHeader } from './header';
import { buildStats } from './stats';

/** Lee cabecera y diccionario de un `.ycoma` sin decodificar los datos. */
export function inspect(file: Uint8Array): InspectResult {
  const { header, lengths, dataOffset } = parseHeader(file);
  const dataBytes = file.subarray(dataOffset);
  return {
    header,
    lengths,
    codes: buildCanonicalCodes(lengths),
    dataBytes,
    stats: buildStats({
      originalBytes: header.originalSize,
      compressedBytes: file.length,
      nameBytes: dataOffset - headerByteLength(0, header.symbolCount),
      symbolCount: header.symbolCount,
      dataBytes: dataBytes.length,
      totalBits: header.totalBits,
    }),
  };
}
