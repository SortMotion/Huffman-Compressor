import { MAX_NAME_BYTES } from '../../contracts/constants';

const UNITS = ['B', 'KB', 'MB', 'GB'];

/** 1536 → "1.5 KB" (base 1024). */
export function formatBytes(bytes: number): string {
  const sign = bytes < 0 ? '-' : '';
  let value = Math.abs(bytes);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${sign}${value.toFixed(digits)} ${UNITS[unit]}`;
}

/** Porcentaje con un decimal; `null` se muestra como "—" (entrada vacía). */
export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)} %`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('es-MX');
}

/** 65 → "0x41". */
export function byteHex(byte: number): string {
  return `0x${byte.toString(16).padStart(2, '0').toUpperCase()}`;
}

const CONTROL_NAMES: Record<number, string> = {
  0: 'NUL',
  9: 'TAB',
  10: 'LF',
  13: 'CR',
  27: 'ESC',
  32: 'espacio',
  127: 'DEL',
};

/** Representación legible de un byte: el carácter ASCII, su nombre o "·" si no es imprimible. */
export function byteLabel(byte: number): string {
  if (CONTROL_NAMES[byte]) return CONTROL_NAMES[byte];
  if (byte > 32 && byte < 127) return String.fromCharCode(byte);
  return '·';
}

/** Descarga un buffer en memoria como archivo, usando la descarga nativa del navegador. */
export function downloadBytes(
  bytes: Uint8Array,
  fileName: string,
  type = 'application/octet-stream'
): void {
  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Convierte un título en un nombre de archivo válido que, con su extensión,
 * no pase de los 255 bytes UTF-8 que admite la cabecera .ycoma.
 */
export function fileNameFromTitle(title: string, extension = '.txt'): string {
  const clean =
    title
      .replace(/[\\/:*?"<>|\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'libro';
  const encoder = new TextEncoder();
  const budget = MAX_NAME_BYTES - encoder.encode(extension).length;
  let name = '';
  for (const char of clean) {
    if (encoder.encode(name + char).length > budget) break;
    name += char;
  }
  return name.trim() + extension;
}

/** Quita una extensión del nombre, si la tiene (sin distinguir mayúsculas). */
export function stripExtension(name: string, extension: string): string {
  return name.toLowerCase().endsWith(extension.toLowerCase())
    ? name.slice(0, -extension.length)
    : name;
}
