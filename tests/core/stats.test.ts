    import { describe, it, expect } from 'vitest';
    import { computeStats } from '../../src/core/stats';

    describe('computeStats', () => {
    it('debe calcular correctamente los bytes ahorrados y un porcentaje positivo de compresión', () => {
        const stats = computeStats(100, 40, 10);

        expect(stats.bytesSaved).toBe(50);
        expect(stats.compressionPercentage).toBe(50);
    });

    it('debe permitir porcentajes negativos si el archivo comprimido es más grande que el original', () => {
        const stats = computeStats(100, 120, 10);

        expect(stats.bytesSaved).toBe(-30);
        expect(stats.compressionPercentage).toBe(-30);
    });

    it('debe manejar un tamaño original de 0 evitando divisiones por cero', () => {
        const stats = computeStats(0, 0, 0);

        expect(stats.bytesSaved).toBe(0);
        expect(stats.compressionPercentage).toBe(0);
    });
    });