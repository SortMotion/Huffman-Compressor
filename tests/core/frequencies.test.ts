import { describe, it, expect } from 'vitest';
import { countFrequencies } from '../../src/core/frequencies';

describe('countFrequencies', () => {
  it('debe retornar un Uint32Array de 256 posiciones y suma 0 para un archivo vacío', () => {
    const emptyData = new Uint8Array(0);
    const frequencies = countFrequencies(emptyData);

    expect(frequencies).toBeInstanceOf(Uint32Array);
    expect(frequencies.length).toBe(256);

    const sum = frequencies.reduce((acc: number, val: number) => acc + val, 0);
    expect(sum).toBe(0);
  });

  it('debe calcular correctamente las frecuencias de una secuencia de bytes', () => {
    const data = new Uint8Array([65, 32, 65]);
    const frequencies = countFrequencies(data);

    expect(frequencies.length).toBe(256);
    expect(frequencies[65]).toBe(2);
    expect(frequencies[32]).toBe(1);
    expect(frequencies[0]).toBe(0);

    const sum = frequencies.reduce((acc: number, val: number) => acc + val, 0);
    expect(sum).toBe(data.length);
  });

  it('debe coincidir con los resultados esperados del fixture de prueba', () => {
    // Simulación estructurada idéntica a la de un fixture (ej. example1)
    const fixtureData = new Uint8Array([97, 98, 97, 99, 98, 97]); // "abacba"
    const expectedFreqs = new Uint32Array(256);
    expectedFreqs[97] = 3; // 'a' aparece 3 veces
    expectedFreqs[98] = 2; // 'b' aparece 2 veces
    expectedFreqs[99] = 1; // 'c' aparece 1 vez

    const frequencies = countFrequencies(fixtureData);

    expect(frequencies).toEqual(expectedFreqs);

    const sum = frequencies.reduce((acc: number, val: number) => acc + val, 0);
    expect(sum).toBe(fixtureData.length);
  });
});
