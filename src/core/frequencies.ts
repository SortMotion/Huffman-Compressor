import type { FrequencyTable } from '../contracts/types';
export function countFrequencies(data: Uint8Array): FrequencyTable {
  const frequencies = new Uint32Array(256);

  for (let i = 0; i < data.length; i++) {
    frequencies[data[i]]++;
  }

  return frequencies;
}
