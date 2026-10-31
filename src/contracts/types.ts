export type Byte = number;

/** Longitud 256. Índice = valor del byte, valor = cantidad de apariciones. */
export type FrequencyTable = Uint32Array;

/** Longitud 256. Índice = valor del byte, valor = longitud en bits. 0 = ausente; 1..15 = presente. */
export type CanonicalLengths = Uint8Array;

/** Longitud 256. Códigos como texto '0'/'1'. `undefined` si el byte no aparece. */
export type CodeTable = (string | undefined)[];

/** Nodo para representación estructurada del árbol en la interfaz. */
export interface TreeNode {
  isLeaf: boolean;
  byte?: Byte;
  bitLength?: number;
  left?: TreeNode; // rama "0"
  right?: TreeNode; // rama "1"
}

export interface EncodeResult {
  bytes: Uint8Array; // longitud = ceil(totalBits / 8); bits de relleno en 0
  totalBits: number;
}

export interface StatsInput {
  originalBytes: number;
  compressedBytes: number;
  symbolCount: number;
  headerBytes: number;
  tableBytes: number;
  dataBytes: number;
  totalBits: number;
}

export interface CompressionStats {
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number; // puede ser negativo (D20)
  reductionPercent: number | null; // null si originalBytes = 0
  ratio: number | null; // compressedBytes / originalBytes; null si originalBytes = 0
  symbolCount: number;
  headerBytes: number; // 21 + n
  tableBytes: number; // 2 * symbolCount
  dataBytes: number; // ceil(totalBits / 8)
  totalBits: number;
}

export interface FileHeader {
  version: number;
  originalSize: number;
  symbolCount: number;
  totalBits: number;
  crc32Hex: string; // 8 dígitos hex en minúscula
  originalName: string;
}

export interface CompressResult {
  file: Uint8Array;
  suggestedName: string; // originalName + FILE_EXTENSION
  freqs: FrequencyTable;
  lengths: CanonicalLengths;
  codes: CodeTable;
  stats: CompressionStats;
}

export interface InspectResult {
  header: FileHeader;
  lengths: CanonicalLengths;
  codes: CodeTable;
  dataBytes: Uint8Array;
  stats: CompressionStats;
}

export interface DecompressResult {
  content: Uint8Array;
  verified: boolean; // false si el CRC32 no coincide (no lanza)
  expectedCrc32: string;
  actualCrc32: string;
  originalName: string;
}

export interface BookSummary {
  id: number;
  title: string;
  authors: string[];
  downloadUrl: string; // URL original de Gutendex (D3); downloadText la traduce
}

export interface SearchResult {
  results: BookSummary[]; // solo libros con texto utilizable (D3)
  count: number; // total de coincidencias según Gutendex
  next: string | null; // v1 solo muestra la primera página
  previous: string | null;
}

export type DownloadProgress = (loaded: number, total: number | null) => void;

/** Protocolo del Worker (D18). */
export type WorkerRequest =
  | { id: number; op: 'analyze'; data: ArrayBuffer }
  | { id: number; op: 'compress'; data: ArrayBuffer; fileName: string }
  | { id: number; op: 'inspect'; data: ArrayBuffer }
  | { id: number; op: 'decompress'; data: ArrayBuffer };

export interface SerializedError {
  name: 'HuffmanError' | 'FormatError' | 'Error';
  code?: string;
  message: string;
}

export type WorkerResponse =
  | { id: number; ok: true; op: 'analyze'; freqs: FrequencyTable }
  | { id: number; ok: true; op: 'compress'; result: CompressResult }
  | { id: number; ok: true; op: 'inspect'; result: InspectResult }
  | { id: number; ok: true; op: 'decompress'; result: DecompressResult }
  | { id: number; ok: false; error: SerializedError };
