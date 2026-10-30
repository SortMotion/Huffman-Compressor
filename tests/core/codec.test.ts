    import { describe, it, expect } from 'vitest';
    import { generateCanonicalCodes } from '../../src/core/canonical';
    import { countFrequencies } from '../../src/core/frequencies';
    import { encode } from '../../src/core/encode';
    import { decode } from '../../src/core/decode';
    import type { CodeTable } from '../../src/contracts/types';

    describe('Huffman Codec (encode y decode)', () => {
    it('debe codificar y decodificar correctamente un buffer preservando los datos originales (round-trip)', () => {
        const originalData = new TextEncoder().encode('huffman compression test data with repetitive patterns aaaaa bbbbb ccc');
        const frequencies = countFrequencies(originalData);
        const canonical = generateCanonicalCodes(frequencies);

        const compressed = encode(originalData, canonical.codes as unknown as CodeTable);
        expect(compressed.bytes).toBeInstanceOf(Uint8Array);
        expect(compressed.bytes.length).toBeGreaterThan(0);

        const decompressed = decode(compressed.bytes, compressed.totalBits, canonical.lengths, originalData.length);
        expect(decompressed).toEqual(originalData);
    });

    it('debe lanzar TRUNCATED si el flujo comprimido termina antes de decodificar todos los bytes', () => {
        const originalData = new TextEncoder().encode('hello world');
        const frequencies = countFrequencies(originalData);
        const canonical = generateCanonicalCodes(frequencies);

        const compressed = encode(originalData, canonical.codes as unknown as CodeTable);
        const truncatedBuffer = compressed.bytes.subarray(0, 1);

        let errorCode = '';
        try {
        decode(truncatedBuffer, compressed.totalBits, canonical.lengths, originalData.length);
        } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error) {
            errorCode = String((error as { code: unknown }).code);
        }
        }
        expect(errorCode).toBe('TRUNCATED');
    });

    it('debe lanzar INVALID_BITS o TRUNCATED si la secuencia de bits no coincide con ningún código válido', () => {
        const originalData = new Uint8Array([65, 65, 65]);
        const frequencies = countFrequencies(originalData);
        const canonical = generateCanonicalCodes(frequencies);

        const invalidBuffer = new Uint8Array([0xFF, 0xFF, 0xFF]);

        let errorCode = '';
        try {
        decode(invalidBuffer, 24, canonical.lengths, originalData.length);
        } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error) {
            errorCode = String((error as { code: unknown }).code);
        }
        }
        expect(['INVALID_BITS', 'TRUNCATED']).toContain(errorCode);
    });
    });