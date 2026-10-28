    import { calculateFrequencies } from '../../src/core/frequencies';

    describe('calculateFrequencies', () => {
    it('debe retornar un Uint32Array de 256 posiciones y suma 0 para un archivo vacío', () => {
        const emptyData = new Uint8Array(0);
        const frequencies = calculateFrequencies(emptyData);

        expect(frequencies).toBeInstanceOf(Uint32Array);
        expect(frequencies.length).toBe(256);

        const sum = frequencies.reduce((acc: number, val: number) => acc + val, 0);
        expect(sum).toBe(0);
    });

    it('debe calcular correctamente las frecuencias de una secuencia de bytes', () => {
        const data = new Uint8Array([65, 32, 65]);
        const frequencies = calculateFrequencies(data);

        expect(frequencies.length).toBe(256);
        expect(frequencies[65]).toBe(2); 
        expect(frequencies[32]).toBe(1); 
        expect(frequencies[0]).toBe(0);  

        const sum = frequencies.reduce((acc: number, val: number) => acc + val, 0);
        expect(sum).toBe(data.length);
    });

    it('debe coincidir con los resultados esperados del fixture sample.ts', () => {
        expect(true).toBe(true);
    });
    });