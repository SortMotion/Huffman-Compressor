import { describe, it, expect } from 'vitest';
import { handleRequest } from '../../src/workers/handler';
import { deserializeError, serializeError } from '../../src/workers/errors';
import { FormatError, HuffmanError } from '../../src/contracts/errors';
import type { WorkerRequest } from '../../src/contracts/types';
import { example1, example2 } from '../../src/fixtures/sample';

const bufferOf = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer as ArrayBuffer;

describe('handleRequest', () => {
  it('analyze devuelve frecuencias y transfiere su buffer', async () => {
    const { response, transfer } = await handleRequest({
      id: 1,
      op: 'analyze',
      data: bufferOf(example1.originalBytes),
    });
    expect(response).toMatchObject({ id: 1, ok: true, op: 'analyze' });
    if (response.ok && response.op === 'analyze') {
      expect(Array.from(response.freqs)).toEqual(Array.from(example1.freqs));
      expect(transfer).toEqual([response.freqs.buffer]);
    }
  });

  it('compress transfiere archivo, frecuencias y longitudes sin repetir buffers', async () => {
    const { response, transfer } = await handleRequest({
      id: 2,
      op: 'compress',
      data: bufferOf(example2.originalBytes),
      fileName: example2.originalName,
    });
    expect(response.ok).toBe(true);
    if (response.ok && response.op === 'compress') {
      expect(Array.from(response.result.file)).toEqual(Array.from(example2.compressedBytes));
      expect(transfer).toHaveLength(3);
      expect(new Set(transfer).size).toBe(3);
    }
  });

  it('inspect y decompress responden con su resultado', async () => {
    const inspected = await handleRequest({
      id: 3,
      op: 'inspect',
      data: bufferOf(example1.compressedBytes),
    });
    expect(inspected.response).toMatchObject({ id: 3, ok: true, op: 'inspect' });

    const restored = await handleRequest({
      id: 4,
      op: 'decompress',
      data: bufferOf(example1.compressedBytes),
    });
    expect(restored.response).toMatchObject({ id: 4, ok: true, op: 'decompress' });
    if (restored.response.ok && restored.response.op === 'decompress') {
      expect(new TextDecoder().decode(restored.response.result.content)).toBe('abracadabra');
    }
  });

  it('convierte los errores en respuestas ok: false con nombre y código', async () => {
    const bad = example1.compressedBytes.slice();
    bad[0] = 0;
    const { response, transfer } = await handleRequest({
      id: 5,
      op: 'decompress',
      data: bad.buffer as ArrayBuffer,
    });
    expect(response).toEqual({
      id: 5,
      ok: false,
      error: { name: 'FormatError', code: 'BAD_MAGIC', message: expect.any(String) },
    });
    expect(transfer).toEqual([]);
  });

  it('responde a operaciones desconocidas en lugar de quedarse callado', async () => {
    const req = { id: 6, op: 'borrar', data: new ArrayBuffer(0) } as unknown as WorkerRequest;
    const { response } = await handleRequest(req);
    expect(response).toMatchObject({ id: 6, ok: false, error: { name: 'Error' } });
  });
});

describe('serializeError / deserializeError', () => {
  it('conserva clase y código de HuffmanError y FormatError', () => {
    const huffman = deserializeError(serializeError(new HuffmanError('TRUNCATED', 'corto')));
    expect(huffman).toBeInstanceOf(HuffmanError);
    expect(huffman).toMatchObject({ code: 'TRUNCATED', message: 'corto' });

    const format = deserializeError(serializeError(new FormatError('TOO_LARGE', 'grande')));
    expect(format).toBeInstanceOf(FormatError);
    expect(format).toMatchObject({ code: 'TOO_LARGE' });
  });

  it('los demás errores llegan como Error genérico', () => {
    expect(serializeError(new TypeError('x'))).toEqual({ name: 'Error', message: 'x' });
    expect(serializeError('raro')).toEqual({ name: 'Error', message: 'Error desconocido' });
  });
});
