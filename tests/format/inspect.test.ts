import { describe, it, expect } from 'vitest';
import { inspect } from '../../src/format';
import { FormatError } from '../../src/contracts/errors';
import { example1, example2, example3, type Fixture } from '../../src/fixtures/sample';

const fixtures: Fixture[] = [example1, example2, example3];

describe('inspect', () => {
  it.each(fixtures)('lee cabecera y diccionario de "$description"', (fx) => {
    const result = inspect(fx.compressedBytes);
    expect(result.header).toEqual({
      version: 1,
      originalSize: fx.originalBytes.length,
      symbolCount: fx.lengths.filter((l) => l > 0).length,
      totalBits: fx.totalBits,
      crc32Hex: fx.crc32Hex,
      originalName: fx.originalName,
    });
    expect(Array.from(result.lengths)).toEqual(Array.from(fx.lengths));
    expect(result.codes).toEqual(fx.codes);
    expect(result.dataBytes.length).toBe(Math.ceil(fx.totalBits / 8));
    expect(result.stats.compressedBytes).toBe(fx.compressedBytes.length);
  });

  it('da las mismas estadísticas que compress', () => {
    const { stats } = inspect(example1.compressedBytes);
    expect(stats).toMatchObject({ savedBytes: -38, headerBytes: 36, tableBytes: 10, dataBytes: 3 });
  });

  it('no decodifica los datos: acepta datos que no corresponden al CRC', () => {
    const file = example1.compressedBytes.slice();
    file[file.length - 2] ^= 0xff; // datos alterados, cabecera intacta
    expect(inspect(file).header.crc32Hex).toBe(example1.crc32Hex);
  });

  it('propaga los errores de formato (BAD_MAGIC)', () => {
    const file = example1.compressedBytes.slice();
    file[0] = 0;
    expect(() => inspect(file)).toThrow(FormatError);
  });
});
