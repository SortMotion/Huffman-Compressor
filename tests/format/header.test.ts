import { describe, it, expect } from 'vitest';
import { parseHeader, serializeHeader, headerByteLength } from '../../src/format/header';
import { FormatError } from '../../src/contracts/errors';
import type { FileHeader } from '../../src/contracts/types';
import { example1, example2, example3, type Fixture } from '../../src/fixtures/sample';

const fixtures: Fixture[] = [example1, example2, example3];

function headerOf(fx: Fixture): FileHeader {
  return {
    version: 1,
    originalSize: fx.originalBytes.length,
    symbolCount: fx.lengths.filter((l) => l > 0).length,
    totalBits: fx.totalBits,
    crc32Hex: fx.crc32Hex,
    originalName: fx.originalName,
  };
}

function expectFormatError(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(FormatError);
    expect((err as FormatError).code).toBe(code);
    return;
  }
  throw new Error(`Se esperaba FormatError ${code}`);
}

describe('serializeHeader', () => {
  it.each(fixtures)('reproduce byte a byte la cabecera de "$description"', (fx) => {
    const bytes = serializeHeader(headerOf(fx), fx.lengths);
    const nameLen = new TextEncoder().encode(fx.originalName).length;
    const symbols = headerOf(fx).symbolCount;
    expect(bytes.length).toBe(headerByteLength(nameLen, symbols));
    expect(Array.from(bytes)).toEqual(Array.from(fx.compressedBytes.subarray(0, bytes.length)));
  });

  it('rechaza nombres de más de 255 bytes UTF-8', () => {
    const header = { ...headerOf(example1), originalName: 'ñ'.repeat(128) }; // 256 bytes
    expectFormatError(() => serializeHeader(header, example1.lengths), 'INVALID_NAME');
  });

  it('acepta nombres UTF-8 complejos', () => {
    const originalName = '日本語 – café 🙂.txt';
    const header = { ...headerOf(example1), originalName };
    const bytes = serializeHeader(header, example1.lengths);
    const file = new Uint8Array(bytes.length + 3);
    file.set(bytes);
    expect(parseHeader(file).header.originalName).toBe(originalName);
  });

  it('rechaza symbolCount que no coincide con la tabla', () => {
    const header = { ...headerOf(example1), symbolCount: 4 };
    expectFormatError(() => serializeHeader(header, example1.lengths), 'INCONSISTENT');
  });

  it('rechaza versiones distintas de 1', () => {
    const header = { ...headerOf(example1), version: 2 };
    expectFormatError(() => serializeHeader(header, example1.lengths), 'UNSUPPORTED_VERSION');
  });

  it('rechaza CRC32 mal formado', () => {
    const header = { ...headerOf(example1), crc32Hex: '17EAF9B7' };
    expectFormatError(() => serializeHeader(header, example1.lengths), 'INCONSISTENT');
  });
});

describe('parseHeader', () => {
  it.each(fixtures)('lee los fixtures: "$description"', (fx) => {
    const parsed = parseHeader(fx.compressedBytes);
    expect(parsed.header).toEqual(headerOf(fx));
    expect(Array.from(parsed.lengths)).toEqual(Array.from(fx.lengths));
    const nameLen = new TextEncoder().encode(fx.originalName).length;
    expect(parsed.dataOffset).toBe(headerByteLength(nameLen, parsed.header.symbolCount));
  });

  it('funciona con subarrays que tienen byteOffset', () => {
    const padded = new Uint8Array(example1.compressedBytes.length + 7);
    padded.set(example1.compressedBytes, 7);
    const parsed = parseHeader(padded.subarray(7));
    expect(parsed.header.crc32Hex).toBe(example1.crc32Hex);
  });

  it('BAD_MAGIC', () => {
    const bad = example1.compressedBytes.slice();
    bad[0] = 0x00;
    expectFormatError(() => parseHeader(bad), 'BAD_MAGIC');
  });

  it('UNSUPPORTED_VERSION', () => {
    const bad = example1.compressedBytes.slice();
    bad[4] = 2;
    expectFormatError(() => parseHeader(bad), 'UNSUPPORTED_VERSION');
  });

  it('byte reservado distinto de cero', () => {
    const bad = example1.compressedBytes.slice();
    bad[5] = 1;
    expectFormatError(() => parseHeader(bad), 'INCONSISTENT');
  });

  it('TRUNCATED: menos que la cabecera fija', () => {
    expectFormatError(() => parseHeader(example1.compressedBytes.subarray(0, 10)), 'TRUNCATED');
  });

  it('TRUNCATED: corta dentro del nombre o la tabla', () => {
    expectFormatError(() => parseHeader(example1.compressedBytes.subarray(0, 30)), 'TRUNCATED');
  });

  it('TRUNCATED: falta un byte de datos', () => {
    const cut = example1.compressedBytes.subarray(0, example1.compressedBytes.length - 1);
    expectFormatError(() => parseHeader(cut), 'TRUNCATED');
  });

  it('INCONSISTENT: bytes sobrantes tras los datos', () => {
    const extra = new Uint8Array(example1.compressedBytes.length + 1);
    extra.set(example1.compressedBytes);
    expectFormatError(() => parseHeader(extra), 'INCONSISTENT');
  });

  it('INCONSISTENT: tabla desordenada', () => {
    const bad = example1.compressedBytes.slice();
    const tableStart = 21 + 15;
    bad[tableStart] = 0x7a; // 'z' antes de 'b'
    expectFormatError(() => parseHeader(bad), 'INCONSISTENT');
  });

  it('INCONSISTENT: longitud de código 0 o mayor que 15', () => {
    const zero = example1.compressedBytes.slice();
    zero[21 + 15 + 1] = 0;
    expectFormatError(() => parseHeader(zero), 'INCONSISTENT');
    const big = example1.compressedBytes.slice();
    big[21 + 15 + 1] = 16;
    expectFormatError(() => parseHeader(big), 'INCONSISTENT');
  });

  it('INCONSISTENT: entrada vacía con símbolos', () => {
    const bad = example3.compressedBytes.slice();
    bad[11] = 1;
    expectFormatError(() => parseHeader(bad), 'INCONSISTENT');
  });

  it('INCONSISTENT: totalBits menor que originalSize', () => {
    const bad = example1.compressedBytes.slice();
    bad[15] = 5; // totalBits = 5 < 11
    expectFormatError(() => parseHeader(bad), 'INCONSISTENT');
  });

  it('TOO_LARGE: originalSize mayor a 20 MiB', () => {
    const bad = example1.compressedBytes.slice();
    bad[6] = 0x7f;
    expectFormatError(() => parseHeader(bad), 'TOO_LARGE');
  });

  it('INVALID_NAME: bytes UTF-8 inválidos', () => {
    const bad = example1.compressedBytes.slice();
    bad[21] = 0xff;
    expectFormatError(() => parseHeader(bad), 'INVALID_NAME');
  });

  it('ida y vuelta con los fixtures completos', () => {
    for (const fx of fixtures) {
      const head = serializeHeader(headerOf(fx), fx.lengths);
      const parsed = parseHeader(fx.compressedBytes);
      expect(parsed.dataOffset).toBe(head.length);
    }
  });
});
