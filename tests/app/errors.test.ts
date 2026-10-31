import { describe, it, expect } from 'vitest';
import { isAbort, toUserMessage } from '../../src/app/errors';
import { FormatError, HuffmanError, SourceError } from '../../src/contracts/errors';

describe('toUserMessage', () => {
  it.each([
    [new FormatError('BAD_MAGIC', 'x'), 'No es un archivo .ycoma'],
    [new FormatError('TOO_LARGE', 'x'), 'Archivo demasiado grande'],
    [new FormatError('TRUNCATED', 'x'), 'Archivo incompleto'],
    [new HuffmanError('TRUNCATED', 'x'), 'Datos incompletos'],
    [new HuffmanError('INVALID_BITS', 'x'), 'Datos dañados'],
    [new SourceError('NO_TEXT', 'x'), 'Libro sin texto plano'],
    [new SourceError('NETWORK', 'x'), 'Sin conexión'],
  ])('traduce %o', (error, title) => {
    expect(toUserMessage(error).title).toBe(title);
  });

  it('funciona con errores que solo tienen name y code (llegados del Worker)', () => {
    expect(toUserMessage({ name: 'FormatError', code: 'INCONSISTENT' }).title).toBe(
      'Archivo dañado'
    );
  });

  it('el límite de tamaño aparece en el mensaje', () => {
    expect(toUserMessage(new FormatError('TOO_LARGE', 'x')).message).toContain('20.0 MB');
  });

  it('cancelaciones', () => {
    expect(toUserMessage(new DOMException('x', 'AbortError')).title).toBe('Operación cancelada');
  });

  it('errores desconocidos usan su mensaje o uno genérico', () => {
    expect(toUserMessage(new Error('falló algo'))).toEqual({
      title: 'Ocurrió un error',
      message: 'falló algo',
    });
    expect(toUserMessage(42).title).toBe('Ocurrió un error');
  });
});

describe('isAbort', () => {
  it('reconoce AbortError y SourceError ABORTED', () => {
    expect(isAbort(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isAbort(new SourceError('ABORTED', 'x'))).toBe(true);
    expect(isAbort(new SourceError('NETWORK', 'x'))).toBe(false);
    expect(isAbort(null)).toBe(false);
  });
});
