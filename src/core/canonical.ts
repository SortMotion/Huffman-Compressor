    import type { FrequencyTable } from '../contracts/types';

    export interface CanonicalCode {
    lengths: Uint8Array;
    codes: Uint32Array;
    }

    interface HuffmanNode {
    symbol: number | null;
    frequency: number;
    left: HuffmanNode | null;
    right: HuffmanNode | null;
    }

    export function generateCanonicalCodes(frequencies: FrequencyTable): CanonicalCode {
    const activeSymbols: { symbol: number; frequency: number }[] = [];

    for (let i = 0; i < frequencies.length; i++) {
        if (frequencies[i] > 0) {
        activeSymbols.push({ symbol: i, frequency: frequencies[i] });
        }
    }

    const lengths = new Uint8Array(256);
    const codes = new Uint32Array(256);

    if (activeSymbols.length === 0) {
        return { lengths, codes };
    }

    if (activeSymbols.length === 1) {
        const sym = activeSymbols[0].symbol;
        lengths[sym] = 1;
        codes[sym] = 0;
        return { lengths, codes };
    }

    const nodes: HuffmanNode[] = activeSymbols.map((item) => ({
        symbol: item.symbol,
        frequency: item.frequency,
        left: null,
        right: null,
    }));

    function sortNodes() {
        nodes.sort((a, b) => {
        if (a.frequency !== b.frequency) {
            return a.frequency - b.frequency;
        }
        return getMinSymbol(a) - getMinSymbol(b);
        });
    }

    function getMinSymbol(node: HuffmanNode): number {
        if (node.symbol !== null) return node.symbol;
        const leftMin = node.left ? getMinSymbol(node.left) : Infinity;
        const rightMin = node.right ? getMinSymbol(node.right) : Infinity;
        return Math.min(leftMin, rightMin);
    }

    while (nodes.length > 1) {
        sortNodes();
        const left = nodes.shift()!;
        const right = nodes.shift()!;

        const parent: HuffmanNode = {
        symbol: null,
        frequency: left.frequency + right.frequency,
        left,
        right,
        };
        nodes.push(parent);
    }

    const root = nodes[0];

    const rawLengths = new Map<number, number>();
    function computeDepths(node: HuffmanNode, depth: number) {
        if (node.symbol !== null) {
        rawLengths.set(node.symbol, depth);
        return;
        }
        if (node.left) computeDepths(node.left, depth + 1);
        if (node.right) computeDepths(node.right, depth + 1);
    }
    computeDepths(root, 0);

    const symbolEntries = Array.from(rawLengths.entries()).map(([symbol, len]) => ({
        symbol,
        length: Math.min(len, 15),
    }));

    packageLimitLengths(symbolEntries, 15);

    for (const entry of symbolEntries) {
        lengths[entry.symbol] = entry.length;
    }

    let kraftSum = 0;
    for (const entry of symbolEntries) {
        kraftSum += Math.pow(2, -entry.length);
    }
    if (kraftSum > 1.00001) {
        throw new Error(`Kraft inequality violated: sum is ${kraftSum}`);
    }

    symbolEntries.sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.symbol - b.symbol;
    });

    let currentCode = 0;
    let currentLength = symbolEntries[0].length;

    for (const entry of symbolEntries) {
        while (currentLength < entry.length) {
        currentCode <<= 1;
        currentLength++;
        }
        codes[entry.symbol] = currentCode;
        currentCode++;
    }

    return { lengths, codes };
    }

    function packageLimitLengths(entries: { symbol: number; length: number }[], maxBits: number) {
    entries.sort((a, b) => b.length - a.length);
    
    let excess = 0;
    for (const entry of entries) {
        if (entry.length > maxBits) {
        excess += entry.length - maxBits;
        entry.length = maxBits;
        }
    }

    if (excess > 0) {
        entries.sort((a, b) => a.length - b.length);
        while (excess > 0) {
        let adjusted = false;
        for (const entry of entries) {
            if (entry.length < maxBits) {
            entry.length++;
            excess--;
            adjusted = true;
            break;
            }
        }
        if (!adjusted) break;
        }
    }
    }