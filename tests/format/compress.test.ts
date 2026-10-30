import { describe, it, expect } from 'vitest';
import { compress } from '../../src/format';
import { MAX_INPUT_BYTES } from '../../src/contracts/constants';
import { FormatError } from '../../src/contracts/errors';
import { example1, example2, example3, type Fixture } from '../../src/fixtures/sample';

const fixtures: Fixture[] = [example1, example2, example3];

describe('compress', () => {
  it.each(fixtures)('reproduce byte a byte el .ycoma de "$description"', async (fx) => {
    const result = await compress(fx.originalBytes, fx.originalName);
    expect(Array.from(result.file)).toEqual(Array.from(fx.compressedBytes));
    expect(Array.from(result.freqs)).toEqual(Array.from(fx.freqs));
    expect(Array.from(result.lengths)).toEqual(Array.from(fx.lengths));
    expect(result.codes).toEqual(fx.codes);
    expect(result.suggestedName).toBe(`${fx.originalName}.ycoma`);
  });

  it('calcula las estadísticas de un archivo que crece (abracadabra)', async () => {
    const { stats } = await compress(example1.originalBytes, example1.originalName);
    expect(stats).toMatchObject({
      originalBytes: 11,
      compressedBytes: 49,
      savedBytes: -38,
      symbolCount: 5,
      headerBytes: 36,
      tableBytes: 10,
      dataBytes: 3,
      totalBits: 23,
    });
    expect(stats.reductionPercent).toBeCloseTo(-345.45, 2);
    expect(stats.ratio).toBeCloseTo(49 / 11, 6);
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
