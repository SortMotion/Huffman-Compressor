    import type { CanonicalCode } from './canonical';
    import { BitReader } from './bits';

    export function decode(compressedData: Uint8Array, canonical: CanonicalCode, originalLength: number): Uint8Array {
    const reader = new BitReader(compressedData);
    const result = new Uint8Array(originalLength);

    for (let i = 0; i < originalLength; i++) {
        let currentCode = 0;
        let currentLength = 0;
        let found = false;

        while (currentLength < 15) {
        let bit: number;
        try {
            bit = reader.readBits(1);
        } catch {
            throw new Error('TRUNCATED: Flujo de bits terminado prematuramente');
        }

        currentCode = (currentCode << 1) | bit;
        currentLength++;

        for (let sym = 0; sym < 256; sym++) {
            if (canonical.lengths[sym] === currentLength && canonical.codes[sym] === currentCode) {
            result[i] = sym;
            found = true;
            break;
            }
        }

        if (found) {
            break;
        }
        }

        if (!found) {
        throw new Error('INVALID_BITS: Secuencia de bits no concuerda con el diccionario canónico');
        }
    }

    return result;
    }