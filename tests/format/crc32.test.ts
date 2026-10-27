import { describe, it, expect } from 'vitest';
import { crc32, crc32Hex } from '../../src/format/crc32';
import { MAX_INPUT_BYTES } from '../../src/contracts/constants';
import { example1, example2, example3 } from '../../src/fixtures/sample';

const encoder = new TextEncoder();

describe('crc32', () => {
  it('vector estándar "123456789" = cbf43926', () => {
    expect(crc32Hex(encoder.encode('123456789'))).toBe('cbf43926');
  });

  it('entrada vacía = 0', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
    expect(crc32Hex(new Uint8Array(0))).toBe('00000000');
  });

  it('coincide con los fixtures del proyecto', () => {
    for (const fx of [example1, example2, example3]) {
      expect(crc32Hex(fx.originalBytes)).toBe(fx.crc32Hex);
    }
  });

  it('devuelve un entero sin signo de 32 bits', () => {
    const value = crc32(encoder.encode('a'));
    expect(value).toBe(0xe8b7be43);
    expect(value).toBeGreaterThanOrEqual(0);
  });

  it('rellena con ceros a la izquierda', () => {
    expect(crc32Hex(new Uint8Array([0x00]))).toBe('d202ef8d');
    expect(crc32Hex(example3.originalBytes)).toHaveLength(8);
  });

  it('permite encadenar bloques', () => {
    const a = encoder.encode('1234');
    const b = encoder.encode('56789');
    expect(crc32(b, crc32(a))).toBe(crc32(encoder.encode('123456789')));
  });

  it('procesa un buffer de 20 MiB sin problemas', () => {
    const big = new Uint8Array(MAX_INPUT_BYTES);
    for (let i = 0; i < big.length; i++) big[i] = i & 0xff;
    const start = performance.now();
    const value = crc32(big);
    const elapsed = performance.now() - start;
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(0xffffffff);
    expect(elapsed).toBeLessThan(2000);
  });
});
