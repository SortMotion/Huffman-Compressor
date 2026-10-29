    export interface StatsResult {
    bytesSaved: number;
    compressionPercentage: number;
    }

    export function computeStats(
    originalSize: number,
    compressedSize: number,
    headerSize: number
    ): StatsResult {
    const totalCompressedSize = compressedSize + headerSize;
    const bytesSaved = originalSize - totalCompressedSize;
    const compressionPercentage =
        originalSize === 0 ? 0 : (bytesSaved / originalSize) * 100;

    return {
        bytesSaved,
        compressionPercentage,
    };
    }