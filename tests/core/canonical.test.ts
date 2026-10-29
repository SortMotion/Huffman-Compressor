    import { describe, it, expect } from 'vitest';
    import { generateCanonicalCodes } from '../../src/core/canonical';

    describe('generateCanonicalCodes', () => {
    it('debe manejar correctamente el caso de borde de 0 símbolos (archivo vacío)', () => {
        const frequencies = new Uint32Array(256);
        const result = generateCanonicalCodes(frequencies);

        expect(result.lengths).toBeInstanceOf(Uint8Array);
        expect(result.lengths.every((l) => l === 0)).toBe(true);
        expect(result.codes.every((c) => c === 0)).toBe(true);
    });

    it('debe manejar correctamente el caso de borde de 1 solo símbolo', () => {
        const frequencies = new Uint32Array(256);
        frequencies[65] = 10;

        const result = generateCanonicalCodes(frequencies);

        expect(result.lengths[65]).toBe(1);
        expect(result.codes[65]).toBe(0);
    });

    it('debe generar códigos canónicos válidos cumpliendo la desigualdad de Kraft y límite de 15 bits', () => {
        const frequencies = new Uint32Array(256);
        frequencies[97] = 5;
        frequencies[98] = 3;
        frequencies[99] = 1;

        const result = generateCanonicalCodes(frequencies);

        for (let i = 0; i < 256; i++) {
        if (frequencies[i] > 0) {
            expect(result.lengths[i]).toBeGreaterThan(0);
            expect(result.lengths[i]).toBeLessThanOrEqual(15);
        } else {
            expect(result.lengths[i]).toBe(0);
        }
        }

        let kraftSum = 0;
        for (let i = 0; i < 256; i++) {
        if (result.lengths[i] > 0) {
            kraftSum += Math.pow(2, -result.lengths[i]);
        }
        }
        expect(kraftSum).toBeLessThanOrEqual(1);
    });

    it('debe aplicar desempate determinista ante frecuencias iguales', () => {
        const frequencies = new Uint32Array(256);
        frequencies[10] = 2;
        frequencies[5] = 2;

        const result1 = generateCanonicalCodes(frequencies);
        const result2 = generateCanonicalCodes(frequencies);

        expect(result1.lengths).toEqual(result2.lengths);
        expect(result1.codes).toEqual(result2.codes);
    });

    it('debe limitar correctamente árboles con profundidad natural mayor a 15 niveles usando frecuencias tipo Fibonacci', () => {
        const frequencies = new Uint32Array(256);
        let a = 1;
        let b = 1;
        
        for (let i = 0; i < 256; i++) {
        frequencies[i] = a;
        const next = a + b;
        a = b;
        b = next;
        }

        const result = generateCanonicalCodes(frequencies);

        let kraftSum = 0;
        for (let i = 0; i < 256; i++) {
        if (frequencies[i] > 0) {
            expect(result.lengths[i]).toBeGreaterThan(0);
            expect(result.lengths[i]).toBeLessThanOrEqual(15);
            kraftSum += Math.pow(2, -result.lengths[i]);
        }
        }

        expect(kraftSum).toBeLessThanOrEqual(1.00001);
    });
    });