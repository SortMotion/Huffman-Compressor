import { describe, it, expect } from 'vitest';
import { compress, decompress, inspect, isStored } from '../../src/format';
import { crc32Hex } from '../../src/format/crc32';
import { MAX_INPUT_BYTES, MAX_NAME_BYTES } from '../../src/contracts/constants';
import type { CompressResult } from '../../src/contracts/types';
import { example1, example2, example3 } from '../../src/fixtures/sample';
import {
  allByteValues,
  bookLikeText,
  fibonacciBytes,
  randomBytes,
  utf8NameOfBytes,
} from '../fixtures/generate';

/** Flujo completo sin UI: comprimir → inspeccionar → descomprimir. */
async function roundTrip(data: Uint8Array, name: string) {
  const compressed = await compress(data, name);
  const inspected = inspect(compressed.file);
  const restored = await decompress(compressed.file);
  return { compressed, inspected, restored };
}

/** Compara sin crear arreglos gigantes (Array.from de 20 MiB es lento). */
function firstDifference(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length) return Math.min(a.length, b.length);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return i;
  return -1;
}

function expectConsistent(
  {
    compressed,
    inspected,
    restored,
  }: {
    compressed: CompressResult;
    inspected: ReturnType<typeof inspect>;
    restored: Awaited<ReturnType<typeof decompress>>;
  },
  original: Uint8Array,
  name: string
) {
  const crc = crc32Hex(original);
  expect(firstDifference(restored.content, original)).toBe(-1);
  expect(restored).toMatchObject({ verified: true, expectedCrc32: crc, actualCrc32: crc });
  expect(restored.originalName).toBe(name);
  expect(inspected.header).toMatchObject({
    originalSize: original.length,
    crc32Hex: crc,
    originalName: name,
  });
  expect(inspected.stats).toEqual(compressed.stats);
  expect(compressed.stats.compressedBytes).toBe(compressed.file.length);
  expect(compressed.file.length).toBe(
    compressed.stats.headerBytes + compressed.stats.tableBytes + compressed.stats.dataBytes
  );
}

describe('Integración del formato .ycoma', () => {
  it.each([example2, example3])(
    'fixture "$description": archivo idéntico y restauración exacta',
    async (fx) => {
      const result = await roundTrip(fx.originalBytes, fx.originalName);
      expect(Array.from(result.compressed.file)).toEqual(Array.from(fx.compressedBytes));
      expectConsistent(result, fx.originalBytes, fx.originalName);
    }
  );

  it('abracadabra se guarda en modo almacenado y su fixture Huffman sigue siendo legible', async () => {
    const result = await roundTrip(example1.originalBytes, example1.originalName);
    expect(isStored(result.inspected.header)).toBe(true);
    expect(result.compressed.file.length).toBeLessThan(example1.compressedBytes.length);
    expectConsistent(result, example1.originalBytes, example1.originalName);

    const legacy = await decompress(example1.compressedBytes);
    expect(new TextDecoder().decode(legacy.content)).toBe('abracadabra');
  });

  it('nunca crece más que la cabecera, aunque los datos no se puedan comprimir', async () => {
    for (const data of [
      randomBytes(1),
      randomBytes(300, 3),
      allByteValues(4),
      randomBytes(1 << 16, 9),
    ]) {
      const name = 'difícil.bin';
      const { compressed, restored } = await roundTrip(data, name);
      const headerBytes = 21 + new TextEncoder().encode(name).length;
      expect(compressed.file.length).toBeLessThanOrEqual(headerBytes + data.length);
      expect(restored.verified).toBe(true);
    }
  });

  it.each([
    ['acentos y eñes', 'Canción de la cigüeña.txt'],
    ['emoji', 'notas 🙂📚.txt'],
    ['CJK', '源氏物語.txt'],
    ['mezcla', 'Ελληνικά – русский – עברית – 日本語.txt'],
    ['nombre vacío', ''],
    ['255 bytes exactos', utf8NameOfBytes(MAX_NAME_BYTES)],
  ])('nombres UTF-8 complejos: %s', async (_label, name) => {
    const data = new TextEncoder().encode('Texto de prueba con ñ, ü y 🙂.\n'.repeat(50));
    expectConsistent(await roundTrip(data, name), data, name);
  });

  it('rechaza nombres de 256 bytes UTF-8', async () => {
    await expect(
      compress(new Uint8Array([1]), utf8NameOfBytes(MAX_NAME_BYTES + 1))
    ).rejects.toMatchObject({
      name: 'FormatError',
      code: 'INVALID_NAME',
    });
  });

  it('contenido UTF-8 multibyte se restaura carácter por carácter', async () => {
    const text = 'Ñandú, pingüino y 日本語 🙂🎉 — «comillas» y saltos\r\n'.repeat(300);
    const data = new TextEncoder().encode(text);
    const { restored } = await roundTrip(data, 'utf8.txt');
    expect(new TextDecoder().decode(restored.content)).toBe(text);
  });

  it('las 256 posibilidades de byte en un diccionario Huffman', async () => {
    // Los 256 valores más muchos espacios: así Huffman sí ahorra y usa la tabla completa
    const data = new Uint8Array(256 + 5000).fill(32);
    data.set(allByteValues(1));
    const result = await roundTrip(data, 'binario.bin');
    expect(result.inspected.header.symbolCount).toBe(256);
    expectConsistent(result, data, 'binario.bin');
  });

  it('árbol más profundo que 15 niveles (Fibonacci) respeta el límite y restaura', async () => {
    const data = fibonacciBytes();
    const result = await roundTrip(data, 'fibonacci.txt');
    expect(Math.max(...result.compressed.lengths)).toBeLessThanOrEqual(15);
    expectConsistent(result, data, 'fibonacci.txt');
  });

  it('texto tipo libro (1 MiB) con caracteres raros comprime y restaura', async () => {
    const data = bookLikeText(1024 * 1024);
    const result = await roundTrip(data, 'libro.txt');
    expect(result.compressed.stats.reductionPercent).toBeGreaterThan(20);
    expectConsistent(result, data, 'libro.txt');
  });

  it('buffer en el límite máximo (20 MiB exactos)', async () => {
    const data = randomBytes(MAX_INPUT_BYTES, 42);
    const result = await roundTrip(data, 'limite.bin');
    expect(result.compressed.stats.originalBytes).toBe(MAX_INPUT_BYTES);
    expectConsistent(result, data, 'limite.bin');
  }, 120_000);

  it('un byte más que el límite se rechaza con TOO_LARGE', async () => {
    await expect(compress(new Uint8Array(MAX_INPUT_BYTES + 1), 'grande.bin')).rejects.toMatchObject(
      {
        name: 'FormatError',
        code: 'TOO_LARGE',
      }
    );
  });

  it('un archivo alterado se detecta: CRC distinto o error de decodificación', async () => {
    const data = bookLikeText(50_000, 2, 11);
    const { file } = await compress(data, 'alterado.txt');
    const outcomes = new Set<string>();
    for (const offset of [0.25, 0.5, 0.75]) {
      const bad = file.slice();
      bad[Math.floor(bad.length * offset)] ^= 0x5a;
      const outcome = await decompress(bad).then(
        (r) => (r.verified ? 'sin detectar' : 'crc'),
        (err: unknown) => (err as Error).name
      );
      outcomes.add(outcome);
    }
    expect(outcomes.has('sin detectar')).toBe(false);
  });
});
