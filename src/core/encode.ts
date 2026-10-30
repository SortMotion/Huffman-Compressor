import { BitWriter } from './bits';
import { HuffmanError } from '../contracts/errors';
import type { CodeTable, EncodeResult } from '../contracts/types';

export function encode(data: Uint8Array, codes: CodeTable): EncodeResult {
  const value = new Uint32Array(256);
  const length = new Uint8Array(256);

  for (let b = 0; b < 256; b++) {
    const code = codes[b];
    if (code !== undefined) {
      value[b] = parseInt(code, 2);
      length[b] = code.length;
    }
  }

  const writer = new BitWriter();
  let totalBits = 0;

  for (let i = 0; i < data.length; i++) {
    const len = length[data[i]];
    if (len === 0) {
      throw new HuffmanError('INVALID_TREE', `El byte ${data[i]} no tiene código`);
    }
    writer.writeBits(value[data[i]], len);
    totalBits += len;
  }

  return { bytes: writer.flush().slice(), totalBits };
}
