const POLYNOMIAL = 0xedb88320;

const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? POLYNOMIAL ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/**
 * CRC-32 (IEEE 802.3, polinomio reflejado 0xEDB88320) en una sola pasada.
 * Devuelve un entero sin signo de 32 bits. `previous` permite encadenar bloques:
 * crc32(b, crc32(a)) === crc32(concat(a, b)).
 */
export function crc32(data: Uint8Array, previous = 0): number {
  let crc = ~previous >>> 0;
  for (let i = 0; i < data.length; i++) {
    crc = TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return ~crc >>> 0;
}

/** 8 dígitos hexadecimales en minúscula, con ceros a la izquierda. */
export function crc32Hex(data: Uint8Array): string {
  return crc32(data).toString(16).padStart(8, '0');
}
