import { MAX_INPUT_BYTES } from '../contracts/constants';
import { SourceError } from '../contracts/errors';
import type { DownloadProgress } from '../contracts/types';
import { toSourceError } from './gutendex';

/** Reescrito por vercel.json hacia el mirror de Project Gutenberg (evita CORS). */
const PG_BASE = '/api/pg';

/** Convierte la URL original de Gutendex en una ruta servida por el rewrite de Vercel. */
export function toProxyUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SourceError('NO_TEXT', 'La URL del libro no es válida');
  }
  if (parsed.hostname !== 'gutenberg.org' && !parsed.hostname.endsWith('.gutenberg.org')) {
    throw new SourceError('NO_TEXT', 'La URL del libro no pertenece a Project Gutenberg');
  }
  return `${PG_BASE}${parsed.pathname}${parsed.search}`;
}

function tooLarge(): SourceError {
  return new SourceError('TOO_LARGE', 'El libro excede el límite de 20 MiB');
}

/** Descarga el texto en bloques, informando el progreso y abortando si pasa de 20 MiB. */
export async function downloadText(
  url: string,
  signal?: AbortSignal,
  onProgress?: DownloadProgress
): Promise<Uint8Array> {
  const proxyUrl = toProxyUrl(url);

  let response: Response;
  try {
    response = await fetch(proxyUrl, { signal });
  } catch (err) {
    throw toSourceError(err);
  }
  if (!response.ok) {
    throw new SourceError('HTTP', `El servidor respondió con el estado ${response.status}`);
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
