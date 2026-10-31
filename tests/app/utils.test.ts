import { describe, it, expect } from 'vitest';
import {
  byteHex,
  byteLabel,
  fileNameFromTitle,
  formatBytes,
  formatPercent,
  stripExtension,
} from '../../src/app/utils';

describe('utilidades de formato', () => {
  it('formatBytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(20 * 1024 * 1024)).toBe('20.0 MB');
    expect(formatBytes(-38)).toBe('-38 B');
  });

  it('formatPercent muestra — cuando no hay valor', () => {
    expect(formatPercent(-345.454)).toBe('-345.5 %');
    expect(formatPercent(null)).toBe('—');
  });

  it('byteHex y byteLabel', () => {
    expect(byteHex(10)).toBe('0x0A');
    expect(byteLabel(65)).toBe('A');
    expect(byteLabel(32)).toBe('espacio');
    expect(byteLabel(10)).toBe('LF');
    expect(byteLabel(200)).toBe('·');
  });

  it('fileNameFromTitle limpia caracteres no válidos y respeta 255 bytes', () => {
    expect(fileNameFromTitle('Romeo and Juliet: A Tragedy')).toBe('Romeo and Juliet A Tragedy.txt');
    expect(fileNameFromTitle('   ')).toBe('libro.txt');
    const long = fileNameFromTitle('ñ'.repeat(300));
    expect(new TextEncoder().encode(long).length).toBeLessThanOrEqual(255);
    expect(long.endsWith('.txt')).toBe(true);
  });

  it('stripExtension', () => {
    expect(stripExtension('libro.txt.ycoma', '.ycoma')).toBe('libro.txt');
    expect(stripExtension('LIBRO.YCOMA', '.ycoma')).toBe('LIBRO');
    expect(stripExtension('libro.txt', '.ycoma')).toBe('libro.txt');
  });
});
