/**
 * Generadores deterministas de datos de prueba para las pruebas de integración.
 * Usan un PRNG con semilla para que cada ejecución produzca exactamente los mismos bytes.
 */

/** PRNG lineal congruencial (32 bits) con semilla fija. */
export function createRandom(seed = 1): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 2 ** 32;
  };
}

/** Bytes uniformes en [0, 255]: el peor caso para Huffman (casi no comprime). */
export function randomBytes(length: number, seed = 1): Uint8Array {
  const random = createRandom(seed);
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) out[i] = Math.floor(random() * 256);
  return out;
}

/** Las 256 posibilidades de byte, cada una al menos una vez. */
export function allByteValues(repeat = 1): Uint8Array {
  const out = new Uint8Array(256 * repeat);
  for (let i = 0; i < out.length; i++) out[i] = i % 256;
  return out;
}

/**
 * Texto parecido a un libro: ~90 caracteres con distribución de Zipf más algunos
 * caracteres que aparecen una sola vez. Genera árboles de más de 15 niveles.
 */
export function bookLikeText(length: number, rareSymbols = 6, seed = 7): Uint8Array {
  const random = createRandom(seed);
  const weights: number[] = [];
  let total = 0;
  for (let k = 1; k <= 90; k++) {
    const w = 1 / k ** 1.3;
    weights.push(w);
    total += w;
  }
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    let r = random() * total;
    let k = 0;
    while (r > weights[k] && k < weights.length - 1) {
      r -= weights[k];
      k++;
    }
    out[i] = 32 + k;
  }
  for (let j = 0; j < rareSymbols && j < length; j++) {
    out[Math.floor((j + 1) * (length / (rareSymbols + 1)))] = 200 + j;
  }
  return out;
}

/** Frecuencias de Fibonacci: fuerzan un árbol de Huffman más profundo que 15 niveles. */
export function fibonacciBytes(symbols = 22): Uint8Array {
  const parts: number[] = [];
  let a = 1;
  let b = 1;
  for (let s = 0; s < symbols; s++) {
    for (let k = 0; k < a; k++) parts.push(65 + s);
    [a, b] = [b, a + b];
  }
  return new Uint8Array(parts);
}

/** Nombre UTF-8 de exactamente `bytes` bytes (usa 'ñ', de 2 bytes, y una 'a' si es impar). */
export function utf8NameOfBytes(bytes: number): string {
  return 'ñ'.repeat(Math.floor(bytes / 2)) + (bytes % 2 ? 'a' : '');
}
