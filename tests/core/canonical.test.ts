    import { describe, it, expect } from 'vitest';
    import { generateCanonicalCodes } from '../../src/core/canonical';
    import { MAX_CODE_LENGTH } from '../../src/contracts/constants';
    import type { CanonicalCode } from '../../src/contracts/types';

    describe('Canonical Codes', () => {
    it('debe generar códigos canónicos válidos respetando las restricciones de longitud', () => {
        const frequencies = new Uint32Array(256);
        frequencies[65] = 10;
        frequencies[66] = 5;
        frequencies[67] = 2;

        const canonical: CanonicalCode = generateCanonicalCodes(frequencies);

        expect(canonical).toBeDefined();
        expect(canonical.lengths).toBeInstanceOf(Uint8Array);
        expect(canonical.codes).toBeInstanceOf(Uint32Array);

        for (let i = 0; i < 256; i++) {
        expect(canonical.lengths[i]).toBeLessThanOrEqual(MAX_CODE_LENGTH);
        }
    });
    });