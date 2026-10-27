export type HuffmanErrorCode = 'INVALID_TREE' | 'INVALID_BITS' | 'TRUNCATED';
export class HuffmanError extends Error {
  readonly code: HuffmanErrorCode;
  constructor(code: HuffmanErrorCode, message: string) { super(message); this.name = 'HuffmanError'; this.code = code; }
}

export type FormatErrorCode = 'BAD_MAGIC' | 'UNSUPPORTED_VERSION' | 'TRUNCATED' | 'INCONSISTENT' | 'TOO_LARGE' | 'INVALID_NAME';
export class FormatError extends Error {
  readonly code: FormatErrorCode;
  constructor(code: FormatErrorCode, message: string) { super(message); this.name = 'FormatError'; this.code = code; }
}

export type SourceErrorCode = 'NETWORK' | 'HTTP' | 'NO_TEXT' | 'ABORTED' | 'TOO_LARGE';
export class SourceError extends Error {
  readonly code: SourceErrorCode;
  constructor(code: SourceErrorCode, message: string) { super(message); this.name = 'SourceError'; this.code = code; }
}
