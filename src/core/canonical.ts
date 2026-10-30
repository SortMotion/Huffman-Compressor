    import { MAX_CODE_LENGTH } from '../contracts/constants';
    import type { CanonicalLengths, CodeTable, FrequencyTable } from '../contracts/types';

    interface HuffmanNode {
    symbol?: number;
    freq: number;
    left?: HuffmanNode;
    right?: HuffmanNode;
    }

    export function generateCanonicalCodes(freqs: FrequencyTable): {
    lengths: CanonicalLengths;
    codes: Uint32Array;
    } {
    const nodes: HuffmanNode[] = [];

    for (let i = 0; i < 256; i++) {
        if (freqs[i] > 0) {
        nodes.push({ symbol: i, freq: freqs[i] });
        }
    }

    const lengths = new Uint8Array(256);
    const codes = new Uint32Array(256);

    if (nodes.length === 0) {
        return { lengths, codes };
    }

    if (nodes.length === 1) {
        lengths[nodes[0].symbol!] = 1;
        codes[nodes[0].symbol!] = 0;
        return { lengths, codes };
    }

    nodes.sort((a, b) => a.freq - b.freq);

    while (nodes.length > 1) {
        const left = nodes.shift()!;
        const right = nodes.shift()!;
        const parent: HuffmanNode = {
        freq: left.freq + right.freq,
        left,
        right,
        };
        let inserted = false;
        for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].freq >= parent.freq) {
            nodes.splice(i, 0, parent);
            inserted = true;
            break;
        }
        }
        if (!inserted) {
        nodes.push(parent);
        }
    }

    const assignDepths = (node: HuffmanNode, depth: number) => {
        if (node.symbol !== undefined) {
        lengths[node.symbol] = Math.min(depth, MAX_CODE_LENGTH);
        return;
        }
        if (node.left) assignDepths(node.left, depth + 1);
        if (node.right) assignDepths(node.right, depth + 1);
    };

    assignDepths(nodes[0], 0);

    const blCount = new Uint16Array(MAX_CODE_LENGTH + 1);
    for (let i = 0; i < 256; i++) {
        if (lengths[i] > 0) {
        blCount[lengths[i]]++;
        }
    }

    const nextCode = new Uint32Array(MAX_CODE_LENGTH + 1);
    let code = 0;
    for (let bits = 1; bits <= MAX_CODE_LENGTH; bits++) {
        code = (code + blCount[bits - 1]) << 1;
        nextCode[bits] = code;
    }

    const entries: { symbol: number; length: number }[] = [];
    for (let i = 0; i < 256; i++) {
        if (lengths[i] > 0) {
        entries.push({ symbol: i, length: lengths[i] });
        }
    }

    entries.sort((a, b) => a.length - b.length || a.symbol - b.symbol);

    for (const entry of entries) {
        const len = entry.length;
        codes[entry.symbol] = nextCode[len]++;
    }

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
