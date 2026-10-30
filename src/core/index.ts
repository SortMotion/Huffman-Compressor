    export interface StatsInput {
    originalSize: number;
    compressedPayloadSize: number;
    headerBytes: number;
    tableBytes?: number;
    }

    export interface StatsResult {
    bytesSaved: number;
    reductionPercent: number;
    ratio: number | null;
    headerBytes: number;
    tableBytes: number;
    totalCompressedSize: number;
    }

    export function computeStats(input: StatsInput): StatsResult | null {
    const { originalSize, compressedPayloadSize, headerBytes, tableBytes = 0 } = input;

    if (!originalSize || originalSize <= 0) {
        return null;
    }

    const totalCompressedSize = compressedPayloadSize + headerBytes;
    const bytesSaved = originalSize - totalCompressedSize;
    const reductionPercent = Number(((bytesSaved / originalSize) * 100).toFixed(2));
    
    const ratio = totalCompressedSize > 0 
        ? Number((originalSize / totalCompressedSize).toFixed(2)) 
        : null;

    return {
        bytesSaved,
        reductionPercent,
        ratio,
        headerBytes,
        tableBytes,
        totalCompressedSize,
    };
    }