import { describe, it, expect } from 'vitest';
import { MAX_FILE_BYTES } from '../src/contracts/constants';
import { HuffmanError, FormatError, SourceError } from '../src/contracts/errors';

describe('Contratos: Constantes', () => {
  it('MAX_FILE_BYTES debe ser exactamente 39,322,388', () => {
    // Verificación matemática estricta según plan técnico D21
    // 21 (cabecera) + 255 (nombre) + 512 (tabla) + ceil((20971520 * 15) / 8) (datos)
    expect(MAX_FILE_BYTES).toBe(39322388);
  });
});

describe('Contratos: Clases de Error', () => {
  it('HuffmanError mantiene prototipo, nombre y código', () => {
    const err = new HuffmanError('INVALID_TREE', 'El árbol es inválido');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(HuffmanError);
    expect(err.name).toBe('HuffmanError');
    expect(err.code).toBe('INVALID_TREE');
    expect(err.message).toBe('El árbol es inválido');
  });

  it('FormatError mantiene prototipo, nombre y código', () => {
    const err = new FormatError('BAD_MAGIC', 'Firma mágica incorrecta');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FormatError);
    expect(err.name).toBe('FormatError');
    expect(err.code).toBe('BAD_MAGIC');
    expect(err.message).toBe('Firma mágica incorrecta');
  });

  it('SourceError mantiene prototipo, nombre y código', () => {
    const err = new SourceError('NO_TEXT', 'El libro no tiene texto');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SourceError);
    expect(err.name).toBe('SourceError');
    expect(err.code).toBe('NO_TEXT');
    expect(err.message).toBe('El libro no tiene texto');
  });
});
