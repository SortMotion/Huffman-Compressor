import { buildCanonicalCodes, buildCanonicalLengths, countFrequencies, encode } from '../core';
import { FILE_EXTENSION, FORMAT_VERSION, MAX_INPUT_BYTES } from '../contracts/constants';
import { FormatError } from '../contracts/errors';
import type { CompressResult } from '../contracts/types';
import { crc32Hex } from './crc32';
import { headerByteLength, serializeHeader } from './header';
import { buildStats, countSymbols } from './stats';

/** Comprime `input` y ensambla el archivo `.ycoma` completo (cabecera + tabla + datos). */
export async function compress(input: Uint8Array, fileName: string): Promise<CompressResult> {
  if (input.length > MAX_INPUT_BYTES) {
    throw new FormatError('TOO_LARGE', 'El archivo excede el tamaño máximo de 20 MiB');
  }

  const freqs = countFrequencies(input);
  const lengths = buildCanonicalLengths(freqs);
  const codes = buildCanonicalCodes(lengths);
  const { bytes, totalBits } = encode(input, codes);
  const symbolCount = countSymbols(lengths);

  const head = serializeHeader(
    {
      version: FORMAT_VERSION,
      originalSize: input.length,
      symbolCount,
      totalBits,
      crc32Hex: crc32Hex(input),
      originalName: fileName,
    },
    lengths
  );

  const file = new Uint8Array(head.length + bytes.length);
  file.set(head, 0);
  file.set(bytes, head.length);

  const nameBytes = head.length - headerByteLength(0, symbolCount);
  return {
    file,
    suggestedName: fileName + FILE_EXTENSION,
    freqs,
    lengths,
    codes,
    stats: buildStats({
      originalBytes: input.length,
      compressedBytes: file.length,
      nameBytes,
      symbolCount,
      dataBytes: bytes.length,
      totalBits,
    }),
  };
}
