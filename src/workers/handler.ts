import { countFrequencies } from '../core';
import { compress, decompress, inspect } from '../format';
import type { WorkerRequest, WorkerResponse } from '../contracts/types';
import { serializeError } from './errors';

export interface HandledMessage {
  response: WorkerResponse;
  /** Buffers que se transfieren al hilo principal en lugar de copiarse. */
  transfer: ArrayBuffer[];
}

/** Ejecuta una petición del Worker. Nunca lanza: los errores viajan como `ok: false`. */
export async function handleRequest(req: WorkerRequest): Promise<HandledMessage> {
  try {
    const data = new Uint8Array(req.data);
    switch (req.op) {
      case 'analyze': {
        const freqs = countFrequencies(data);
        return {
          response: { id: req.id, ok: true, op: 'analyze', freqs },
          transfer: buffersOf(freqs),
        };
      }
      case 'compress': {
        const result = await compress(data, req.fileName);
        return {
          response: { id: req.id, ok: true, op: 'compress', result },
          transfer: buffersOf(result.file, result.freqs, result.lengths),
        };
      }
      case 'inspect': {
        const result = inspect(data);
        return {
          response: { id: req.id, ok: true, op: 'inspect', result },
          transfer: buffersOf(result.dataBytes, result.lengths),
        };
      }
      case 'decompress': {
        const result = await decompress(data);
        return {
          response: { id: req.id, ok: true, op: 'decompress', result },
          transfer: buffersOf(result.content),
        };
      }
      default: {
        const op = (req as { op?: unknown }).op;
        throw new Error(`Operación desconocida: ${String(op)}`);
      }
    }
  } catch (err) {
    return { response: { id: req.id, ok: false, error: serializeError(err) }, transfer: [] };
  }
}

/** Buffers sin repetir (transferir el mismo buffer dos veces lanza DataCloneError). */
function buffersOf(...views: ArrayBufferView[]): ArrayBuffer[] {
  const unique = new Set<ArrayBuffer>();
  for (const view of views) unique.add(view.buffer as ArrayBuffer);
  return [...unique];
}
