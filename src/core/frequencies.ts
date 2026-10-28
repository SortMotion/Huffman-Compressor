export type FrequencyTable = Uint32Array;
export function calculateFrequencies(data: Uint8Array): FrequencyTable {
    const frequencies = new Uint32Array(256);

    for (let i = 0; i < data.length; i++) {
        frequencies[data[i]]++;
    }

    let total = 0;
    for (let i = 0; i < 256; i++) {
        total += frequencies[i];
    }

    if (total !== data.length) {
        throw new Error(`Frequency sum mismatch: expected ${data.length}, got ${total}`);
    }

    return frequencies;
    }