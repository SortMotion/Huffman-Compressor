import { buildCanonicalCodes, buildCanonicalLengths, countFrequencies, encode } from '../core';
import {
  ALPHABET_SIZE,
  FILE_EXTENSION,
  FORMAT_VERSION,
  MAX_INPUT_BYTES,
} from '../contracts/constants';
import { FormatError } from '../contracts/errors';
import type { CanonicalLengths, CodeTable, CompressResult } from '../contracts/types';
import { crc32Hex } from './crc32';
import { headerByteLength, serializeHeader } from './header';
import { buildStats, countSymbols } from './stats';

/**
 * Comprime `input` y ensambla el archivo `.ycoma` completo (cabecera + tabla + datos).
 * Si la codificación Huffman no ahorra espacio (archivos pequeños o casi aleatorios),
 * guarda los datos tal cual en modo almacenado, sin tabla.
 */
export async function compress(input: Uint8Array, fileName: string): Promise<CompressResult> {
  if (input.length > MAX_INPUT_BYTES) {
    throw new FormatError('TOO_LARGE', 'El archivo excede el tamaño máximo de 20 MiB');
  }

  const freqs = countFrequencies(input);
  const huffmanLengths = buildCanonicalLengths(freqs);
  const huffmanCodes = buildCanonicalCodes(huffmanLengths);
  const encoded = encode(input, huffmanCodes);
  const huffmanSymbols = countSymbols(huffmanLengths);

  const nameBytes = new TextEncoder().encode(fileName).length;
  const huffmanSize = headerByteLength(nameBytes, huffmanSymbols) + encoded.bytes.length;
  const storedSize = headerByteLength(nameBytes, 0) + input.length;
  const stored = input.length > 0 && storedSize < huffmanSize;

  const lengths: CanonicalLengths = stored ? new Uint8Array(ALPHABET_SIZE) : huffmanLengths;
  const codes: CodeTable = stored ? new Array(ALPHABET_SIZE).fill(undefined) : huffmanCodes;
  const data = stored ? input : encoded.bytes;
  const totalBits = stored ? input.length * 8 : encoded.totalBits;
  const symbolCount = stored ? 0 : huffmanSymbols;

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

  const file = new Uint8Array(head.length + data.length);
  file.set(head, 0);
  file.set(data, head.length);

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
      dataBytes: data.length,
      totalBits,
    }),
  };
}
