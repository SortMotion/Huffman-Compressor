import { MAX_INPUT_BYTES } from '../contracts/constants';
import { SourceError } from '../contracts/errors';
import type { DownloadProgress } from '../contracts/types';
import { toSourceError } from './gutendex';

/** Reescrito por vercel.json hacia el mirror de Project Gutenberg (evita CORS). */
const PG_BASE = '/api/pg';
const MAX_REDIRECTS = 5;

function isGutenbergHost(hostname: string): boolean {
  return hostname === 'gutenberg.org' || hostname.endsWith('.gutenberg.org');
}

function parseGutenbergUrl(url: string | URL, base?: URL): URL {
  let parsed: URL;
  try {
    parsed = new URL(url, base);
  } catch {
    throw new SourceError('NO_TEXT', 'La URL del libro no es válida');
  }
  if (!isGutenbergHost(parsed.hostname)) {
    throw new SourceError('NO_TEXT', 'La URL del libro no pertenece a Project Gutenberg');
  }
  return parsed;
}

/** Convierte la URL original de Gutendex en una ruta servida por el rewrite de Vercel. */
export function toProxyUrl(url: string | URL): string {
  const parsed = parseGutenbergUrl(url);
  return `${PG_BASE}${parsed.pathname}${parsed.search}`;
}

/**
 * Ruta canónica del texto plano en el mirror (`/cache/epub/{id}/pg{id}.txt`), que es
 * a donde Gutenberg redirige `/ebooks/{id}.txt.utf-8` y similares. `null` si no hay id.
 */
export function canonicalTextUrl(url: URL): URL | null {
  const match = /^\/(?:ebooks|files|cache\/epub)\/(\d+)(?:[/.]|$)/.exec(url.pathname);
  if (!match) return null;
  const id = match[1];
  return new URL(`/cache/epub/${id}/pg${id}.txt`, url);
}

function tooLarge(): SourceError {
  return new SourceError('TOO_LARGE', 'El libro excede el límite de 20 MiB');
}

/**
 * Pide el recurso al proxy sin seguir redirecciones automáticamente: una redirección
 * del mirror apunta a gutenberg.org y el navegador la bloquearía por CORS. Cada salto
 * se vuelve a pedir a través de `/api/pg`. Si el navegador oculta el destino
 * (`opaqueredirect`), se usa la ruta canónica del libro.
 */
async function fetchThroughProxy(original: URL, signal?: AbortSignal): Promise<Response> {
  let upstream = original;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let response: Response;
    try {
      response = await fetch(toProxyUrl(upstream), { signal, redirect: 'manual' });
    } catch (err) {
      throw toSourceError(err);
    }

    const isRedirect =
      response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
    if (!isRedirect) return response;

    const location = response.headers.get('location');
    let next: URL | null;
    if (location) {
      try {
        next = parseGutenbergUrl(location, upstream);
      } catch {
        throw new SourceError('HTTP', 'El mirror redirigió a un host no permitido');
      }
    } else {
      next = canonicalTextUrl(upstream);
    }
    if (!next || next.href === upstream.href) {
      throw new SourceError('HTTP', 'No se pudo resolver la redirección del mirror');
    }
    upstream = next;
  }
  throw new SourceError('HTTP', 'Demasiadas redirecciones del mirror');
}

/** Descarga el texto en bloques, informando el progreso y abortando si pasa de 20 MiB. */
export async function downloadText(
  url: string,
  signal?: AbortSignal,
  onProgress?: DownloadProgress
): Promise<Uint8Array> {
  const response = await fetchThroughProxy(parseGutenbergUrl(url), signal);
  if (!response.ok) {
    throw new SourceError('HTTP', `El servidor respondió con el estado ${response.status}`);
  }
  // Si el rewrite no está activo, el servidor suele devolver index.html (fallback de la SPA).
  if (/text\/html/i.test(response.headers.get('content-type') ?? '')) {
    await response.body?.cancel().catch(() => undefined);
    throw new SourceError(
      'HTTP',
      `El proxy ${PG_BASE} devolvió HTML en lugar del texto; revisa el rewrite en vercel.json`
    );
  }

  const header = response.headers.get('content-length');
  const declared = header !== null && /^\d+$/.test(header) ? Number(header) : null;
  if (declared !== null && declared > MAX_INPUT_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw tooLarge();
  }

  try {
    if (!response.body) {
      const buffer = new Uint8Array(await response.arrayBuffer());
      if (buffer.length > MAX_INPUT_BYTES) throw tooLarge();
      onProgress?.(buffer.length, buffer.length);
      return buffer;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.length;
      if (loaded > MAX_INPUT_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw tooLarge();
      }
      chunks.push(value);
      onProgress?.(loaded, declared);
    }

    const out = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  } catch (err) {
    throw toSourceError(err);
  }
}
