import type {
  WorkerRequest,
  WorkerResponse,
  FrequencyTable,
  CompressResult,
  InspectResult,
  DecompressResult,
} from '../contracts/types';
import type { HuffmanClient } from './index';
import { deserializeError } from './errors';

type PromiseResolver = (value: unknown) => void;
type PromiseRejecter = (reason: Error) => void;

interface PendingRequest {
  resolve: PromiseResolver;
  reject: PromiseRejecter;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type WorkerPayload = DistributiveOmit<WorkerRequest, 'id'>;

const getTransferableBuffer = (data: Uint8Array, forceCopy = false): ArrayBuffer => {
  if (forceCopy || data.byteOffset !== 0 || data.byteLength !== data.buffer.byteLength) {
    return data.slice().buffer as ArrayBuffer;
  }
  return data.buffer as ArrayBuffer;
};

export function createHuffmanClient(): HuffmanClient {
  const worker = new Worker(new URL('./huffman.worker.ts', import.meta.url), {
    type: 'module',
  });

  let nextId = 1;
  const pendingRequests = new Map<number, PendingRequest>();

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const res = event.data;
    const handlers = pendingRequests.get(res.id);

    if (!handlers) return;

    pendingRequests.delete(res.id);

    if (res.ok) {
      if (res.op === 'analyze') handlers.resolve(res.freqs);
      else if (res.op === 'compress') handlers.resolve(res.result);
      else if (res.op === 'inspect') handlers.resolve(res.result);
      else if (res.op === 'decompress') handlers.resolve(res.result);
    } else {
      handlers.reject(deserializeError(res.error));
    }
  };

  worker.onerror = (error) => {
    console.error('Fallo crítico del Web Worker:', error);

    const workerError = new Error('El Web Worker falló inesperadamente.');
    for (const pending of pendingRequests.values()) {
      pending.reject(workerError);
    }
    pendingRequests.clear();
  };

  const sendRequest = <T>(
    payload: WorkerPayload,
    transfer: Transferable[],
    signal?: AbortSignal
  ): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const id = nextId++;

      if (signal?.aborted) {
        return reject(new DOMException('Operación cancelada', 'AbortError'));
      }

      const onAbort = () => {
        pendingRequests.delete(id);
        reject(new DOMException('Operación cancelada', 'AbortError'));
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      pendingRequests.set(id, {
        resolve: (value: unknown) => {
          signal?.removeEventListener('abort', onAbort);
          resolve(value as T);
        },
        reject: (err: Error) => {
          signal?.removeEventListener('abort', onAbort);
          reject(err);
        },
      });

      const fullRequest = { ...payload, id } as WorkerRequest;
      worker.postMessage(fullRequest, transfer);
    });
  };

  return {
    analyze(data: Uint8Array, signal?: AbortSignal): Promise<FrequencyTable> {
      const buffer = getTransferableBuffer(data, true);
      return sendRequest<FrequencyTable>({ op: 'analyze', data: buffer }, [buffer], signal);
    },
    compress(data: Uint8Array, fileName: string, signal?: AbortSignal): Promise<CompressResult> {
      const buffer = getTransferableBuffer(data);
      return sendRequest<CompressResult>(
        { op: 'compress', data: buffer, fileName },
        [buffer],
        signal
      );
    },
    inspect(file: Uint8Array, signal?: AbortSignal): Promise<InspectResult> {
      const buffer = getTransferableBuffer(file);
      return sendRequest<InspectResult>({ op: 'inspect', data: buffer }, [buffer], signal);
    },
    decompress(file: Uint8Array, signal?: AbortSignal): Promise<DecompressResult> {
      const buffer = getTransferableBuffer(file);
      return sendRequest<DecompressResult>({ op: 'decompress', data: buffer }, [buffer], signal);
    },
    dispose() {
      worker.terminate();
      pendingRequests.clear();
    },
  };
}
