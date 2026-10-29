    import type { CanonicalCode } from './canonical';
    import { BitWriter } from './bits';

    export function encode(data: Uint8Array, canonical: CanonicalCode): Uint8Array {
    const writer = new BitWriter();

    for (let i = 0; i < data.length; i++) {
        const symbol = data[i];
        const length = canonical.lengths[symbol];
        const code = canonical.codes[symbol];

        if (length === 0) {
        throw new Error(`INVALID_BITS: Símbolo ${symbol} sin código asignado`);
        }

        writer.writeBits(code, length);
    }

    return writer.flush();
    }