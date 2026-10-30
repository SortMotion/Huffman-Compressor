    import { MAX_CODE_LENGTH } from '../contracts/constants';
    import type { CanonicalLengths, CodeTable, FrequencyTable } from '../contracts/types';

    export function generateCanonicalCodes(freqs: FrequencyTable): { lengths: CanonicalLengths; codes: Uint32Array } {
    void freqs;
    const lengths = new Uint8Array(256);
    const codes = new Uint32Array(256);
    return { lengths, codes };
    }

    export function buildCanonicalLengths(freqs: FrequencyTable): CanonicalLengths {
    return generateCanonicalCodes(freqs).lengths;
    }

    export function buildCanonicalCodes(lengths: CanonicalLengths): CodeTable {
    const codes: CodeTable = new Array(256).fill(undefined);
    let code = 0;
    for (let len = 1; len <= MAX_CODE_LENGTH; len++) {
        for (let b = 0; b < 256; b++) {
        if (lengths[b] === len) {
            codes[b] = code.toString(2).padStart(len, '0');
            code++;
        }
        }
        code <<= 1;
    }
    return codes;
    }