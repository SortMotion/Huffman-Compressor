import {
  ALPHABET_SIZE,
  FIXED_HEADER_SIZE,
  FORMAT_VERSION,
  MAGIC,
  MAX_CODE_LENGTH,
  MAX_FILE_BYTES,
  MAX_INPUT_BYTES,
  MAX_NAME_BYTES,
} from '../contracts/constants';
import { FormatError } from '../contracts/errors';
import type { CanonicalLengths, FileHeader } from '../contracts/types';

/*
 * Diseño de la cabecera (big-endian):
 *   0  magic          4 bytes  "HUF!"
 *   4  version        u8
 *   5  reservado      u8       siempre 0
 *   6  originalSize   u32
 *  10  symbolCount    u16
 *  12  totalBits      u32
 *  16  crc32          u32
 *  20  nameLength     u8
 *  21  originalName   nameLength bytes (UTF-8)
 *  ..  tabla          symbolCount pares (byte, longitud), ordenados por byte
 *  ..  datos          ceil(totalBits / 8) bytes
 */
const OFFSET_VERSION = 4;
const OFFSET_RESERVED = 5;
const OFFSET_ORIGINAL_SIZE = 6;
const OFFSET_SYMBOL_COUNT = 10;
const OFFSET_TOTAL_BITS = 12;
const OFFSET_CRC32 = 16;
const OFFSET_NAME_LENGTH = 20;

const CRC32_HEX = /^[0-9a-f]{8}$/;

export interface ParsedHeader {
  header: FileHeader;
  lengths: CanonicalLengths;
  /** Posición donde empiezan los bytes de datos codificados. */
  dataOffset: number;
}

/** Tamaño en bytes de la cabecera fija + nombre + tabla (21 + n + 2 * símbolos). */
export function headerByteLength(nameBytes: number, symbolCount: number): number {
  return FIXED_HEADER_SIZE + nameBytes + 2 * symbolCount;
}

/** Escribe cabecera, nombre y tabla de longitudes. Los datos los añade el llamador. */
export function serializeHeader(header: FileHeader, lengths: CanonicalLengths): Uint8Array {
  if (header.version !== FORMAT_VERSION) {
    throw new FormatError(
      'UNSUPPORTED_VERSION',
      `Versión de formato no soportada: ${header.version}`
    );
  }
  if (lengths.length !== ALPHABET_SIZE) {
    throw new FormatError('INCONSISTENT', 'La tabla de longitudes debe tener 256 entradas');
  }
  if (!CRC32_HEX.test(header.crc32Hex)) {
    throw new FormatError(
      'INCONSISTENT',
      'El CRC32 debe ser de 8 dígitos hexadecimales en minúscula'
    );
  }
  assertUint(header.originalSize, MAX_INPUT_BYTES, 'originalSize', 'TOO_LARGE');

  const nameBytes = new TextEncoder().encode(header.originalName);
  if (nameBytes.length > MAX_NAME_BYTES) {
    throw new FormatError('INVALID_NAME', `El nombre excede ${MAX_NAME_BYTES} bytes en UTF-8`);
  }

  const entries: number[] = [];
  for (let b = 0; b < ALPHABET_SIZE; b++) {
    const len = lengths[b];
    if (len === 0) continue;
    if (len > MAX_CODE_LENGTH) {
      throw new FormatError(
        'INCONSISTENT',
        `Longitud de código fuera de rango para el byte ${b}: ${len}`
      );
    }
    entries.push(b, len);
  }
  const symbolCount = entries.length / 2;
  if (symbolCount !== header.symbolCount) {
    throw new FormatError('INCONSISTENT', 'symbolCount no coincide con la tabla de longitudes');
  }
  assertUint(header.totalBits, MAX_INPUT_BYTES * MAX_CODE_LENGTH, 'totalBits', 'TOO_LARGE');
  assertConsistentCounts(header.originalSize, symbolCount, header.totalBits);

  const out = new Uint8Array(headerByteLength(nameBytes.length, symbolCount));
  const view = new DataView(out.buffer);
  out.set(MAGIC, 0);
  view.setUint8(OFFSET_VERSION, header.version);
  view.setUint8(OFFSET_RESERVED, 0);
  view.setUint32(OFFSET_ORIGINAL_SIZE, header.originalSize, false);
  view.setUint16(OFFSET_SYMBOL_COUNT, symbolCount, false);
  view.setUint32(OFFSET_TOTAL_BITS, header.totalBits, false);
  view.setUint32(OFFSET_CRC32, parseInt(header.crc32Hex, 16), false);
  view.setUint8(OFFSET_NAME_LENGTH, nameBytes.length);
  out.set(nameBytes, FIXED_HEADER_SIZE);
  out.set(entries, FIXED_HEADER_SIZE + nameBytes.length);
  return out;
}

/**
 * Lee y valida cabecera, nombre y tabla. Exige que el archivo termine exactamente
 * donde acaban los datos (`ceil(totalBits / 8)` bytes tras la tabla).
 */
export function parseHeader(file: Uint8Array): ParsedHeader {
  if (file.length > MAX_FILE_BYTES) {
    throw new FormatError('TOO_LARGE', 'El archivo excede el tamaño máximo permitido');
  }
  if (file.length < FIXED_HEADER_SIZE) {
    throw new FormatError('TRUNCATED', 'El archivo es más corto que la cabecera fija');
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (file[i] !== MAGIC[i]) {
      throw new FormatError('BAD_MAGIC', 'Firma de archivo incorrecta');
    }
  }

  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  const version = view.getUint8(OFFSET_VERSION);
  if (version !== FORMAT_VERSION) {
    throw new FormatError('UNSUPPORTED_VERSION', `Versión de formato no soportada: ${version}`);
  }
  if (view.getUint8(OFFSET_RESERVED) !== 0) {
    throw new FormatError('INCONSISTENT', 'El byte reservado debe ser 0');
  }

  const originalSize = view.getUint32(OFFSET_ORIGINAL_SIZE, false);
  const symbolCount = view.getUint16(OFFSET_SYMBOL_COUNT, false);
  const totalBits = view.getUint32(OFFSET_TOTAL_BITS, false);
  const crc32Hex = view.getUint32(OFFSET_CRC32, false).toString(16).padStart(8, '0');
  const nameLength = view.getUint8(OFFSET_NAME_LENGTH);

  if (originalSize > MAX_INPUT_BYTES) {
    throw new FormatError('TOO_LARGE', 'El tamaño original excede el máximo permitido');
  }
  if (symbolCount > ALPHABET_SIZE) {
    throw new FormatError('INCONSISTENT', `symbolCount fuera de rango: ${symbolCount}`);
  }
  assertConsistentCounts(originalSize, symbolCount, totalBits);

  const tableOffset = FIXED_HEADER_SIZE + nameLength;
  const dataOffset = tableOffset + 2 * symbolCount;
  if (file.length < dataOffset) {
    throw new FormatError('TRUNCATED', 'El archivo termina antes de la tabla de longitudes');
  }

  let originalName: string;
  try {
    originalName = new TextDecoder('utf-8', { fatal: true }).decode(
      file.subarray(FIXED_HEADER_SIZE, tableOffset)
    );
  } catch {
    throw new FormatError('INVALID_NAME', 'El nombre original no es UTF-8 válido');
  }

  const lengths: CanonicalLengths = new Uint8Array(ALPHABET_SIZE);
  let previousSymbol = -1;
  for (let i = 0; i < symbolCount; i++) {
    const symbol = file[tableOffset + 2 * i];
    const len = file[tableOffset + 2 * i + 1];
    if (symbol <= previousSymbol) {
      throw new FormatError('INCONSISTENT', 'La tabla debe estar ordenada por byte, sin repetidos');
    }
    if (len < 1 || len > MAX_CODE_LENGTH) {
      throw new FormatError(
        'INCONSISTENT',
        `Longitud de código inválida para el byte ${symbol}: ${len}`
      );
    }
    lengths[symbol] = len;
    previousSymbol = symbol;
  }

  const dataBytes = Math.ceil(totalBits / 8);
  const expectedLength = dataOffset + dataBytes;
  if (file.length < expectedLength) {
    throw new FormatError('TRUNCATED', 'El archivo termina antes de los datos codificados');
  }
  if (file.length > expectedLength) {
    throw new FormatError('INCONSISTENT', 'Hay bytes sobrantes tras los datos codificados');
  }

  return {
    header: { version, originalSize, symbolCount, totalBits, crc32Hex, originalName },
    lengths,
    dataOffset,
  };
}

function assertUint(
  value: number,
  max: number,
  field: string,
  code: 'TOO_LARGE' | 'INCONSISTENT'
): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new FormatError('INCONSISTENT', `${field} debe ser un entero no negativo`);
  }
  if (value > max) {
    throw new FormatError(code, `${field} excede el máximo permitido`);
  }
}

/** Relaciones que deben cumplirse entre tamaño original, símbolos y bits totales. */
function assertConsistentCounts(
  originalSize: number,
  symbolCount: number,
  totalBits: number
): void {
  if (originalSize === 0) {
    if (symbolCount !== 0 || totalBits !== 0) {
      throw new FormatError('INCONSISTENT', 'Una entrada vacía no admite símbolos ni bits');
    }
    return;
  }
  if (symbolCount === 0) {
    throw new FormatError('INCONSISTENT', 'Hay datos pero la tabla de símbolos está vacía');
  }
  if (totalBits < originalSize || totalBits > originalSize * MAX_CODE_LENGTH) {
    throw new FormatError('INCONSISTENT', 'totalBits es incompatible con el tamaño original');
  }
}
