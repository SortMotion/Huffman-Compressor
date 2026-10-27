export const FILE_EXTENSION = '.ycoma';
export const MAGIC = [0x48, 0x55, 0x46, 0x21] as const;
export const FORMAT_VERSION = 1;
export const FIXED_HEADER_SIZE = 21;
export const ALPHABET_SIZE = 256;
export const MAX_CODE_LENGTH = 15;
export const MAX_NAME_BYTES = 255;
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_FILE_BYTES =
  FIXED_HEADER_SIZE + MAX_NAME_BYTES + 2 * ALPHABET_SIZE +
  Math.ceil((MAX_INPUT_BYTES * MAX_CODE_LENGTH) / 8);
export const PREVIEW_CHARS = 5000;
