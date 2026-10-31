import { describe, it, expect } from 'vitest';
import { BitWriter, BitReader } from '../../src/core/bits';

describe('BitWriter y BitReader (MSB-first)', () => {
  it('debe escribir y leer correctamente una secuencia de bits de vuelta (round-trip)', () => {
    const writer = new BitWriter();

    writer.writeBits(0b101, 3);
    writer.writeBits(0b1111, 4);
    writer.writeBits(0b0, 1);
    writer.writeBits(0xab, 8);

    const buffer = writer.flush();

    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);

    const reader = new BitReader(buffer);

    expect(reader.readBits(3)).toBe(0b101);
    expect(reader.readBits(4)).toBe(0b1111);
    expect(reader.readBits(1)).toBe(0b0);
    expect(reader.readBits(8)).toBe(0xab);
  });

  it('debe manejar correctamente el alineamiento y el relleno (flush) al final del byte', () => {
    const writer = new BitWriter();
    writer.writeBits(1, 1);

    const buffer = writer.flush();
    expect(buffer.length).toBe(1);
    expect(buffer[0]).toBe(0b10000000);

    const reader = new BitReader(buffer);
    expect(reader.readBits(1)).toBe(1);
  });

  it('debe lanzar un error si se intenta leer más allá del tamaño del buffer', () => {
    const writer = new BitWriter();
    writer.writeBits(5, 3);
    const buffer = writer.flush();

    const reader = new BitReader(buffer);
    expect(reader.readBits(3)).toBe(5);

    expect(() => reader.readBits(1)).toThrow();
  });
});
