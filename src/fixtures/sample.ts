import type { CanonicalLengths, CodeTable, FrequencyTable } from '../contracts/types';

export interface Fixture {
  description: string;
  originalName: string;
  originalText: string;
  originalBytes: Uint8Array;
  compressedBytes: Uint8Array;
  freqs: FrequencyTable;
  lengths: CanonicalLengths;
  codes: CodeTable;
  totalBits: number;
  crc32Hex: string;
}

const encoder = new TextEncoder();

// Utilidad interna para convertir de hex a Uint8Array
const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.replace(/\s+/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
};

// Ejemplo 1: "abracadabra", nombre abracadabra.txt
const freqs1 = new Uint32Array(256);
freqs1[0x61] = 5; // a
freqs1[0x72] = 2; // r
freqs1[0x62] = 2; // b
freqs1[0x63] = 1; // c
freqs1[0x64] = 1; // d

const lengths1 = new Uint8Array(256);
lengths1[0x61] = 1;
lengths1[0x72] = 2;
lengths1[0x62] = 3;
lengths1[0x63] = 4;
lengths1[0x64] = 4;

const codes1: CodeTable = new Array(256).fill(undefined);
codes1[0x61] = '0';
codes1[0x72] = '10';
codes1[0x62] = '110';
codes1[0x63] = '1110';
codes1[0x64] = '1111';

export const example1: Fixture = {
  description: 'Múltiples símbolos',
  originalName: 'abracadabra.txt',
  originalText: 'abracadabra',
  originalBytes: encoder.encode('abracadabra'),
  compressedBytes: hexToBytes(`
    48 55 46 21 01 00 00 00 00 0b 00 05 00 00 00 17
    17 ea f9 b7 0f 61 62 72 61 63 61 64 61 62 72 61
    2e 74 78 74 61 01 62 03 63 04 64 04 72 02 69 cf 68
  `),
  freqs: freqs1,
  lengths: lengths1,
  codes: codes1,
  totalBits: 23,
  crc32Hex: '17eaf9b7',
};

// Ejemplo 2: "aaaa", nombre a.txt (un solo símbolo)
const freqs2 = new Uint32Array(256);
freqs2[0x61] = 4;

const lengths2 = new Uint8Array(256);
lengths2[0x61] = 1;

const codes2: CodeTable = new Array(256).fill(undefined);
codes2[0x61] = '0';

export const example2: Fixture = {
  description: 'Un solo símbolo',
  originalName: 'a.txt',
  originalText: 'aaaa',
  originalBytes: encoder.encode('aaaa'),
  compressedBytes: hexToBytes(`
    48 55 46 21 01 00 00 00 00 04 00 01 00 00 00 04
    ad 98 e5 45 05 61 2e 74 78 74 61 01 00
  `),
  freqs: freqs2,
  lengths: lengths2,
  codes: codes2,
  totalBits: 4,
  crc32Hex: 'ad98e545',
};

// Ejemplo 3: entrada vacía, nombre vacio.txt
export const example3: Fixture = {
  description: 'Entrada vacía',
  originalName: 'vacio.txt',
  originalText: '',
  originalBytes: new Uint8Array(0),
  compressedBytes: hexToBytes(`
    48 55 46 21 01 00 00 00 00 00 00 00 00 00 00 00
    00 00 00 00 09 76 61 63 69 6f 2e 74 78 74
  `),
  freqs: new Uint32Array(256),
  lengths: new Uint8Array(256),
  codes: new Array(256).fill(undefined),
  totalBits: 0,
  crc32Hex: '00000000',
};
