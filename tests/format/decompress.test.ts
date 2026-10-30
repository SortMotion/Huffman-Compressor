import { describe, it, expect } from 'vitest';
import { compress, decompress } from '../../src/format';
import { example1, example2, example3, type Fixture } from '../../src/fixtures/sample';

const fixtures: Fixture[] = [example1, example2, example3];

describe('decompress', () => {
  it.each(fixtures)('restaura "$description" y verifica el CRC32', async (fx) => {
    const result = await decompress(fx.compressedBytes);
    expect(Array.from(result.content)).toEqual(Array.from(fx.originalBytes));
    expect(result).toMatchObject({
      verified: true,
      expectedCrc32: fx.crc32Hex,
      actualCrc32: fx.crc32Hex,
      originalName: fx.originalName,
    });
  });

  it('ida y vuelta con texto UTF-8 y nombre complejo', async () => {
    const text = 'Él dijo: «¡Hola, mundo!» 🙂 — 日本語\n'.repeat(500);
    const name = 'café – 日本 🙂.txt';
    const { file } = await compress(new TextEncoder().encode(text), name);
    const result = await decompress(file);
    expect(new TextDecoder().decode(result.content)).toBe(text);
    expect(result.originalName).toBe(name);
    expect(result.verified).toBe(true);
  });

  it('marca verified: false si el CRC32 no coincide, sin lanzar', async () => {
    const file = example1.compressedBytes.slice();
    file[17] ^= 0x01; // altera el CRC guardado en la cabecera
    const result = await decompress(file);
    expect(result.verified).toBe(false);
    expect(result.actualCrc32).toBe(example1.crc32Hex);
    expect(result.expectedCrc32).not.toBe(example1.crc32Hex);
  });

  it('detecta datos alterados', async () => {
    const { file } = await compress(new TextEncoder().encode('abcdefgh'.repeat(100)), 'x.txt');
    file[file.length - 10] ^= 0x10;
    // Según dónde caiga el bit, decode falla (HuffmanError) o el CRC32 no coincide
    const outcome = await decompress(file).then(
      (result) => result.verified,
      (err: unknown) => (err as Error).name
    );
    expect([false, 'HuffmanError']).toContain(outcome);
  });

  it('rechaza archivos truncados con FormatError', async () => {
    const cut = example1.compressedBytes.subarray(0, 40);
    await expect(decompress(cut)).rejects.toMatchObject({ name: 'FormatError', code: 'TRUNCATED' });
  });
});
