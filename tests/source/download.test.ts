import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadText, toProxyUrl } from '../../src/source/download';
import { MAX_INPUT_BYTES } from '../../src/contracts/constants';
import { SourceError } from '../../src/contracts/errors';

const BOOK_URL = 'https://www.gutenberg.org/ebooks/1342.txt.utf-8';

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(chunks[i++]);
      else controller.close();
    },
  });
}

const streamResponse = (chunks: Uint8Array[], headers?: Record<string, string>) =>
  new Response(streamOf(chunks), { status: 200, headers });

afterEach(() => {
  vi.unstubAllGlobals();
});

async function expectSourceError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(SourceError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe('toProxyUrl', () => {
  it('reescribe URLs de gutenberg.org hacia /api/pg', () => {
    expect(toProxyUrl(BOOK_URL)).toBe('/api/pg/ebooks/1342.txt.utf-8');
    expect(toProxyUrl('https://gutenberg.org/files/1/1-0.txt?x=1')).toBe('/api/pg/files/1/1-0.txt?x=1');
  });

  it('rechaza hosts ajenos y URLs inválidas', () => {
    expect(() => toProxyUrl('https://evil.example/ebooks/1.txt')).toThrow(SourceError);
    expect(() => toProxyUrl('https://notgutenberg.org/x')).toThrow(SourceError);
    expect(() => toProxyUrl('no es url')).toThrow(SourceError);
  });
});

describe('downloadText', () => {
  it('une los bloques y reporta progreso con el total conocido', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        streamResponse([new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])], { 'content-length': '5' })
      );
    vi.stubGlobal('fetch', fetchMock);
    const onProgress = vi.fn();

    const data = await downloadText(BOOK_URL, undefined, onProgress);

    expect(Array.from(data)).toEqual([1, 2, 3, 4, 5]);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/pg/ebooks/1342.txt.utf-8');
    expect(onProgress.mock.calls).toEqual([
      [3, 5],
      [5, 5],
    ]);
  });

  it('el total es null si no hay content-length', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([new Uint8Array([9])])));
    const onProgress = vi.fn();
    await downloadText(BOOK_URL, undefined, onProgress);
    expect(onProgress).toHaveBeenCalledWith(1, null);
  });

  it('TOO_LARGE por content-length declarado', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          streamResponse([new Uint8Array(1)], { 'content-length': String(MAX_INPUT_BYTES + 1) })
        )
    );
    await expectSourceError(downloadText(BOOK_URL), 'TOO_LARGE');
  });

  it('TOO_LARGE aunque el servidor no declare tamaño', async () => {
    const half = new Uint8Array(MAX_INPUT_BYTES / 2 + 1);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([half, half])));
    await expectSourceError(downloadText(BOOK_URL), 'TOO_LARGE');
  });

  it('acepta exactamente 20 MiB', async () => {
    const full = new Uint8Array(MAX_INPUT_BYTES);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([full])));
    const data = await downloadText(BOOK_URL);
    expect(data.length).toBe(MAX_INPUT_BYTES);
  });

  it('HTTP cuando el estado no es 2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no', { status: 404 })));
    await expectSourceError(downloadText(BOOK_URL), 'HTTP');
  });

  it('NETWORK cuando fetch falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expectSourceError(downloadText(BOOK_URL), 'NETWORK');
  });

  it('ABORTED si se cancela antes de responder', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expectSourceError(downloadText(BOOK_URL), 'ABORTED');
  });

  it('ABORTED si se cancela a mitad de la descarga', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(abort);
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    await expectSourceError(downloadText(BOOK_URL), 'ABORTED');
  });
});
