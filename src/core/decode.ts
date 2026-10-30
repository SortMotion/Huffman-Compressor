import { MAX_CODE_LENGTH } from '../contracts/constants';
import { HuffmanError } from '../contracts/errors';
import type { CanonicalLengths } from '../contracts/types';

export function decode(
  bytes: Uint8Array,
  totalBits: number,
  lengths: CanonicalLengths,
  originalSize: number
): Uint8Array {
  if (bytes.length < Math.ceil(totalBits / 8)) {
    throw new HuffmanError('TRUNCATED', 'Faltan bytes de datos');
  }

  const count = new Uint16Array(MAX_CODE_LENGTH + 1);
  for (let b = 0; b < 256; b++) {
    if (lengths[b] > 0) count[lengths[b]]++;
  }

  const next = new Uint16Array(MAX_CODE_LENGTH + 2);
  for (let len = 1; len <= MAX_CODE_LENGTH; len++) {
    next[len + 1] = next[len] + count[len];
  }

  const symbols = new Uint8Array(256);
  for (let len = 1; len <= MAX_CODE_LENGTH; len++) {
    for (let b = 0; b < 256; b++) {
      if (lengths[b] === len) {
        symbols[next[len]++] = b;
      }
    }
  }

  const out = new Uint8Array(originalSize);
  let bitPos = 0;

  for (let i = 0; i < originalSize; i++) {
    let code = 0;
    let first = 0;
    let index = 0;

    for (let len = 1; ; len++) {
      if (len > MAX_CODE_LENGTH) {
        throw new HuffmanError('INVALID_BITS', 'Código inválido');
      }
      if (bitPos >= totalBits) {
        throw new HuffmanError('TRUNCATED', 'El flujo de bits terminó antes de tiempo');
      }

      code |= (bytes[bitPos >> 3] >> (7 - (bitPos & 7))) & 1;
      bitPos++;

      const c = count[len];
      if (code - first < c) {
        out[i] = symbols[index + code - first];
        break;
      }

      index += c;
      first = (first + c) << 1;
      code <<= 1;
    }
  }

  return out;
}
