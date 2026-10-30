import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHuffmanClient, type HuffmanClient } from '../../src/workers';
import { handleRequest } from '../../src/workers/handler';
import { FormatError } from '../../src/contracts/errors';
import type { WorkerRequest, WorkerResponse } from '../../src/contracts/types';
import { example1, example2 } from '../../src/fixtures/sample';

/** Worker falso: clona con transferencia (como el navegador) y responde con el handler real. */
class FakeWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(message: WorkerRequest, transfer: Transferable[] = []): void {
    const received = structuredClone(message, { transfer });
    void handleRequest(received).then(({ response, transfer: back }) => {
      const data = structuredClone(response, { transfer: back });
      this.onmessage?.({ data } as MessageEvent<WorkerResponse>);
    });
  }

  terminate(): void {}
}

describe('createHuffmanClient', () => {
  let client: HuffmanClient;

  beforeEach(() => {
    vi.stubGlobal('Worker', FakeWorker);
    client = createHuffmanClient();
  });

  afterEach(() => {
    client.dispose();
    vi.unstubAllGlobals();
  });

  it('analyze copia los datos: el arreglo original sigue usable', async () => {
    const data = example1.originalBytes.slice();
    const freqs = await client.analyze(data);
    expect(Array.from(freqs)).toEqual(Array.from(example1.freqs));
    expect(data.length).toBe(11);
  });

  it('compress → inspect → decompress de punta a punta', async () => {
    const compressed = await client.compress(example2.originalBytes.slice(), 'a.txt');
    expect(Array.from(compressed.file)).toEqual(Array.from(example2.compressedBytes));
    expect(compressed.suggestedName).toBe('a.txt.ycoma');

    const inspected = await client.inspect(compressed.file.slice());
    expect(inspected.header.crc32Hex).toBe(example2.crc32Hex);

    const restored = await client.decompress(compressed.file);
    expect(new TextDecoder().decode(restored.content)).toBe('aaaa');
    expect(restored.verified).toBe(true);
  });

  it('compress transfiere el buffer de entrada (queda vacío)', async () => {
    const data = example1.originalBytes.slice();
    await client.compress(data, 'a.txt');
    expect(data.length).toBe(0);
  });

  it('rechaza con FormatError y su código', async () => {
    const bad = example1.compressedBytes.slice();
    bad[0] = 0;
    const error = await client.decompress(bad).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(FormatError);
    expect(error).toMatchObject({ code: 'BAD_MAGIC' });
  });

  it('respeta un AbortSignal ya cancelado', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      client.analyze(example1.originalBytes.slice(), controller.signal)
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
