import { countFrequencies } from '../core/frequencies';
import type { WorkerRequest, WorkerResponse } from '../contracts/types';

const ctx = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;

  try {
    if (req.op === 'analyze') {
      const dataArray = new Uint8Array(req.data);
      const freqs = countFrequencies(dataArray);

      const response: WorkerResponse = {
        id: req.id,
        ok: true,
        op: 'analyze',
        freqs
      };

      ctx.postMessage(response, [freqs.buffer as ArrayBuffer]);
    }
  } catch (error) {
    const errRes: WorkerResponse = {
      id: req.id,
      ok: false,
      error: {
        name: 'Error',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }
    };
    ctx.postMessage(errRes);
  }
};
