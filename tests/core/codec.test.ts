    import { describe, it, expect } from 'vitest';
    import { countFrequencies } from '../../src/core/frequencies';
    import { buildCanonicalCodes, buildCanonicalLengths } from '../../src/core/canonical';
    import { encode } from '../../src/core/encode';
    import { decode } from '../../src/core/decode';
    import { example1, example2 } from '../../src/fixtures/sample';

    describe('Huffman Codec (encode y decode)', () => {
    it('round-trip', () => {
        const data = new TextEncoder().encode('huffman compression test data with repetitive patterns aaaaa bbbbb ccc');
        const lengths = buildCanonicalLengths(countFrequencies(data));
        const { bytes, totalBits } = encode(data, buildCanonicalCodes(lengths));
        expect(Array.from(decode(bytes, totalBits, lengths, data.length))).toEqual(Array.from(data));
    });

    it('TRUNCATED', () => {
        const data = new TextEncoder().encode('hello world');
        const lengths = buildCanonicalLengths(countFrequencies(data));
        const { bytes, totalBits } = encode(data, buildCanonicalCodes(lengths));
        expect(() => decode(bytes.subarray(0, 1), totalBits, lengths, data.length)).toThrow(
        expect.objectContaining({ code: 'TRUNCATED' })
        );
    });

    it('un solo símbolo repetido ("AAAAA")', () => {
        const data = new Uint8Array([65, 65, 65, 65, 65]);
        const lengths = buildCanonicalLengths(countFrequencies(data));
        const r = encode(data, buildCanonicalCodes(lengths));
        expect(r.totalBits).toBe(5);
        expect(Array.from(decode(r.bytes, r.totalBits, lengths, 5))).toEqual(Array.from(data));
    });

    it.each([example1, example2])('coincide con el fixture "$description"', (fx) => {
        const r = encode(fx.originalBytes, buildCanonicalCodes(fx.lengths));
        expect(r.totalBits).toBe(fx.totalBits);
    });
    });