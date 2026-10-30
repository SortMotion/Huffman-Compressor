import { describe, it, expect } from 'vitest';
import { compress, decompress, inspect, isStored } from '../../src/format';
import { FIXED_HEADER_SIZE, MAX_INPUT_BYTES } from '../../src/contracts/constants';
import { FormatError } from '../../src/contracts/errors';
import { example1, example2, example3, type Fixture } from '../../src/fixtures/sample';

// abracadabra (example1) ahora se guarda en modo almacenado: ver más abajo
const huffmanFixtures: Fixture[] = [example2, example3];

/** Bytes aleatorios con semilla (casi no se pueden comprimir). */
function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  let state = 12345;
  for (let i = 0; i < length; i++) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    out[i] = state >>> 24;
  }
  return out;
}

describe('compress', () => {
  it.each(huffmanFixtures)('reproduce byte a byte el .ycoma de "$description"', async (fx) => {
    const result = await compress(fx.originalBytes, fx.originalName);
    expect(Array.from(result.file)).toEqual(Array.from(fx.compressedBytes));
    expect(Array.from(result.freqs)).toEqual(Array.from(fx.freqs));
    expect(Array.from(result.lengths)).toEqual(Array.from(fx.lengths));
    expect(result.codes).toEqual(fx.codes);
    expect(result.suggestedName).toBe(`${fx.originalName}.ycoma`);
  });

  it('usa null en porcentaje y razón cuando la entrada está vacía', async () => {
    const { stats } = await compress(example3.originalBytes, example3.originalName);
    expect(stats.reductionPercent).toBeNull();
    expect(stats.ratio).toBeNull();
    expect(stats.savedBytes).toBe(-30);
  });

  it('reduce el tamaño de un texto repetitivo', async () => {
    const text = new TextEncoder().encode('el perro de san roque no tiene rabo '.repeat(2000));
    const { stats, file } = await compress(text, 'roque.txt');
    expect(file.length).toBe(stats.compressedBytes);
    expect(stats.compressedBytes).toBe(stats.headerBytes + stats.tableBytes + stats.dataBytes);
    expect(stats.reductionPercent).toBeGreaterThan(40);
  });

  it('TOO_LARGE: rechaza entradas mayores a 20 MiB', async () => {
    const big = new Uint8Array(MAX_INPUT_BYTES + 1);
    await expect(compress(big, 'grande.txt')).rejects.toMatchObject({
      name: 'FormatError',
      code: 'TOO_LARGE',
    });
  });

  it('INVALID_NAME: rechaza nombres de más de 255 bytes', async () => {
    await expect(compress(example1.originalBytes, 'ñ'.repeat(128))).rejects.toBeInstanceOf(
      FormatError
    );
  });
});

describe('compress: modo almacenado', () => {
  it('abracadabra se guarda sin comprimir porque Huffman ocuparía más (47 B en lugar de 49 B)', async () => {
    const { file, stats, lengths, codes } = await compress(
      example1.originalBytes,
      example1.originalName
    );
    expect(file.length).toBe(47); // 21 de cabecera + 15 del nombre + 11 de datos
    expect(file[5]).toBe(1); // bandera de modo almacenado
    expect(Array.from(file.subarray(36))).toEqual(Array.from(example1.originalBytes));
    expect(stats).toMatchObject({
      originalBytes: 11,
      compressedBytes: 47,
      savedBytes: -36,
      symbolCount: 0,
      headerBytes: 36,
      tableBytes: 0,
      dataBytes: 11,
      totalBits: 88,
    });
    expect(lengths.every((l) => l === 0)).toBe(true);
    expect(codes.every((c) => c === undefined)).toBe(true);
  });

  it('inspect y decompress leen el archivo almacenado', async () => {
    const { file } = await compress(example1.originalBytes, example1.originalName);
    const inspected = inspect(file);
    expect(isStored(inspected.header)).toBe(true);
    expect(inspected.header).toMatchObject({
      originalSize: 11,
      symbolCount: 0,
      totalBits: 88,
      crc32Hex: example1.crc32Hex,
    });
    const restored = await decompress(file);
    expect(new TextDecoder().decode(restored.content)).toBe('abracadabra');
    expect(restored.verified).toBe(true);
  });

  it('el archivo Huffman original de abracadabra (fixture) sigue siendo válido', async () => {
    const restored = await decompress(example1.compressedBytes);
    expect(new TextDecoder().decode(restored.content)).toBe('abracadabra');
    expect(isStored(inspect(example1.compressedBytes).header)).toBe(false);
  });

  it.each([1, 100, 4096, 200_000])(
    'datos aleatorios de %i bytes nunca crecen más que la cabecera',
    async (size) => {
      const data = randomBytes(size);
      const name = 'aleatorio.bin';
      const { file } = await compress(data, name);
      expect(file.length).toBeLessThanOrEqual(FIXED_HEADER_SIZE + name.length + size);
      const restored = await decompress(file);
      expect(restored.verified).toBe(true);
      expect(restored.content.length).toBe(size);
    }
  );

  it('un texto normal sigue usando Huffman', async () => {
    const text = new TextEncoder().encode('Había una vez un compresor de Huffman. '.repeat(50));
    const { file } = await compress(text, 'cuento.txt');
    expect(file[5]).toBe(0);
    expect(isStored(inspect(file).header)).toBe(false);
  });
});
