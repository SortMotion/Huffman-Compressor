import type { WorkerRequest } from '../contracts/types';
import { handleRequest } from './handler';

const ctx = self as unknown as Worker;

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { response, transfer } = await handleRequest(event.data);
  ctx.postMessage(response, transfer);
};
