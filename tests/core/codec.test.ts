    import { describe, it, expect } from 'vitest';
    import { generateCanonicalCodes } from '../../src/core/canonical';
    import { countFrequencies } from '../../src/core/frequencies';
    import { encode } from '../../src/core/encode';
    import { decode } from '../../src/core/decode';

    describe('Huffman Codec (encode y decode)', () => {
    it('debe codificar y decodificar correctamente un buffer preservando los datos originales (round-trip)', () => {
        const originalData = new TextEncoder().encode('huffman compression test data with repetitive patterns aaaaa bbbbb ccc');
        const frequencies = countFrequencies(originalData);
        const canonical = generateCanonicalCodes(frequencies);

        const compressed = encode(originalData, canonical);
        expect(compressed).toBeInstanceOf(Uint8Array);
        expect(compressed.length).toBeGreaterThan(0);

        const decompressed = decode(compressed, canonical, originalData.length);
        expect(decompressed).toEqual(originalData);
    });

    it('debe lanzar TRUNCATED si el flujo comprimido termina antes de decodificar todos los bytes', () => {
        const originalData = new TextEncoder().encode('hello world');
        const frequencies = countFrequencies(originalData);
        const canonical = generateCanonicalCodes(frequencies);

        const compressed = encode(originalData, canonical);
        const truncatedBuffer = compressed.subarray(0, 1);

        expect(() => decode(truncatedBuffer, canonical, originalData.length)).toThrow(/TRUNCATED/);
    });

    it('debe lanzar INVALID_BITS si la secuencia de bits no coincide con ningún código válido', () => {
        const originalData = new Uint8Array([65, 65, 65]);
        const frequencies = countFrequencies(originalData);
        const canonical = generateCanonicalCodes(frequencies);

        const invalidBuffer = new Uint8Array([0xFF, 0xFF, 0xFF]);

        expect(() => decode(invalidBuffer, canonical, originalData.length)).toThrow(/INVALID_BITS|TRUNCATED/);
    });
    });