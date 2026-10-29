    export class BitWriter {
    private buffer: Uint8Array;
    private byteOffset = 0;
    private currentByte = 0;
    private bitCount = 0;

    constructor(initialCapacity = 65536) {
        this.buffer = new Uint8Array(initialCapacity);
    }

    private ensureCapacity(): void {
        if (this.byteOffset >= this.buffer.length) {
        const newBuffer = new Uint8Array(this.buffer.length * 2);
        newBuffer.set(this.buffer);
        this.buffer = newBuffer;
        }
    }

    public writeBits(value: number, nBits: number): void {
        if (nBits <= 0 || nBits > 31) {
        throw new Error('nBits debe estar entre 1 y 31');
        }

        for (let i = nBits - 1; i >= 0; i--) {
        const bit = (value >> i) & 1;
        this.currentByte = (this.currentByte << 1) | bit;
        this.bitCount++;

        if (this.bitCount === 8) {
            this.ensureCapacity();
            this.buffer[this.byteOffset++] = this.currentByte;
            this.currentByte = 0;
            this.bitCount = 0;
        }
        }
    }

    public flush(): Uint8Array {
        if (this.bitCount > 0) {
        this.currentByte <<= (8 - this.bitCount);
        this.ensureCapacity();
        this.buffer[this.byteOffset++] = this.currentByte;
        this.currentByte = 0;
        this.bitCount = 0;
        }
        return this.buffer.subarray(0, this.byteOffset);
    }
    }

    export class BitReader {
    private data: Uint8Array;
    private byteOffset = 0;
    private bitOffset = 0;

    constructor(data: Uint8Array) {
        this.data = data;
    }

    public readBits(nBits: number): number {
        if (nBits <= 0 || nBits > 31) {
        throw new Error('nBits debe estar entre 1 y 31');
        }

        let result = 0;

        for (let i = 0; i < nBits; i++) {
        if (this.byteOffset >= this.data.length) {
            throw new Error('Lectura fuera de los límites del buffer');
        }

        const currentByte = this.data[this.byteOffset];
        const bit = (currentByte >> (7 - this.bitOffset)) & 1;

        result = (result << 1) | bit;

        this.bitOffset++;
        if (this.bitOffset === 8) {
            this.bitOffset = 0;
            this.byteOffset++;
        }
        }

        return result;
    }
    }