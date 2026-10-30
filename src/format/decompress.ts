import { decode } from '../core';
import type { DecompressResult } from '../contracts/types';
import { crc32Hex } from './crc32';
import { parseHeader } from './header';

/**
 * Restaura el contenido original de un `.ycoma`. Un CRC32 distinto no lanza:
 * se informa con `verified: false` para que la interfaz decida qué mostrar.
 */
export async function decompress(file: Uint8Array): Promise<DecompressResult> {
  const { header, lengths, dataOffset } = parseHeader(file);
  const content = decode(file.subarray(dataOffset), header.totalBits, lengths, header.originalSize);
  const actualCrc32 = crc32Hex(content);
  return {
    content,
    verified: actualCrc32 === header.crc32Hex,
    expectedCrc32: header.crc32Hex,
    actualCrc32,
    originalName: header.originalName,
  };
}
