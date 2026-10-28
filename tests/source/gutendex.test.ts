import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickTextUrl, searchBooks } from '../../src/source/gutendex';
import { SourceError } from '../../src/contracts/errors';

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

async function expectSourceError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(SourceError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe('pickTextUrl', () => {
  it('prefiere UTF-8 sobre otros text/plain', () => {
    expect(
      pickTextUrl({
        'text/plain; charset=us-ascii': 'https://www.gutenberg.org/files/1/1.txt',
        'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/1/1-0.txt',
      })
    ).toBe('https://www.gutenberg.org/files/1/1-0.txt');
  });

  it('descarta archivos readme (caso real del libro 26301)', () => {
    expect(
      pickTextUrl({
        'text/plain; charset=us-ascii': 'https://www.gutenberg.org/files/26301/26301-readme.txt',
      })
    ).toBeUndefined();
    expect(
      pickTextUrl({
        'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/9/README.txt',
        'text/plain; charset=us-ascii': 'https://www.gutenberg.org/files/9/9.txt',
      })
    ).toBe('https://www.gutenberg.org/files/9/9.txt');
  });

  it('descarta zips y formatos que no son texto plano', () => {
    expect(
      pickTextUrl({
        'text/html': 'https://www.gutenberg.org/ebooks/1.html',
        'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/1/1-0.zip',
      })
    ).toBeUndefined();
    expect(pickTextUrl(undefined)).toBeUndefined();
  });
});

describe('searchBooks', () => {
  it('consulta el rewrite de Vercel filtrando por texto plano', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, next: null, previous: null, results: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await searchBooks('pride & prejudice', controller.signal);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/gutendex/books/?search=pride+%26+prejudice&mime_type=text%2Fplain');
    expect(init.signal).toBe(controller.signal);
  });

  it('mapea resultados y deja fuera libros sin texto utilizable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          count: 42,
          next: 'https://gutendex.com/books/?page=2',
          previous: null,
          results: [
            {
              id: 1342,
              title: 'Pride and Prejudice',
              authors: [{ name: 'Austen, Jane' }],
              formats: {
                'text/plain; charset=utf-8': 'https://www.gutenberg.org/ebooks/1342.txt.utf-8',
              },
            },
            {
              id: 2,
              title: 'Solo HTML',
              authors: [],
              formats: { 'text/html': 'https://x/2.html' },
            },
          ],
        })
      )
    );

    const result = await searchBooks('austen');
    expect(result.count).toBe(42);
    expect(result.next).toBe('https://gutendex.com/books/?page=2');
    expect(result.previous).toBeNull();
    expect(result.results).toEqual([
      {
        id: 1342,
        title: 'Pride and Prejudice',
        authors: ['Austen, Jane'],
        downloadUrl: 'https://www.gutenberg.org/ebooks/1342.txt.utf-8',
      },
    ]);
  });

  it('una consulta vacía no hace red', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await searchBooks('   ');
    expect(result).toEqual({ results: [], count: 0, next: null, previous: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('HTTP cuando el estado no es 2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 502 })));
    await expectSourceError(searchBooks('x'), 'HTTP');
  });

  it('NETWORK cuando fetch falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expectSourceError(searchBooks('x'), 'NETWORK');
  });

  it('ABORTED cuando se cancela', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expectSourceError(searchBooks('x'), 'ABORTED');
  });

  it('HTTP si el proxy devuelve HTML (rewrite inactivo)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<!doctype html><html></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        })
      )
    );
    await expectSourceError(searchBooks('x'), 'HTTP');
  });

  it('HTTP si el JSON no tiene la forma de Gutendex', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'Not found' })));
    await expectSourceError(searchBooks('x'), 'HTTP');
  });
});
