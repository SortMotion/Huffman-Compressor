import { FormatError, HuffmanError } from '../contracts/errors';
import type { SerializedError } from '../contracts/types';

/** Convierte un error en un objeto que puede viajar por `postMessage`. */
export function serializeError(err: unknown): SerializedError {
  if (err instanceof HuffmanError || err instanceof FormatError) {
    return { name: err.name as SerializedError['name'], code: err.code, message: err.message };
  }
  return { name: 'Error', message: err instanceof Error ? err.message : 'Error desconocido' };
}

/** Reconstruye en el hilo principal el error original, con su clase y su código. */
export function deserializeError(error: SerializedError): Error {
  if (error.name === 'HuffmanError') {
    return new HuffmanError(error.code as HuffmanError['code'], error.message);
  }
  if (error.name === 'FormatError') {
    return new FormatError(error.code as FormatError['code'], error.message);
  }
  return new Error(error.message);
}
