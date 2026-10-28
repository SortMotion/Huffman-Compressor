import { SourceError } from '../contracts/errors';
import type { BookSummary, SearchResult } from '../contracts/types';

/** Reescrito por vercel.json hacia https://gutendex.com/ (evita CORS). */
const GUTENDEX_BASE = '/api/gutendex';

interface GutendexBook {
  id: number;
  title: string;
  authors?: { name: string }[];
  formats?: Record<string, string>;
}

interface GutendexResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

/** Traduce fallos de `fetch` a SourceError (ABORTED o NETWORK). */
export function toSourceError(err: unknown): SourceError {
  if (err instanceof SourceError) return err;
  if ((err as { name?: string } | null)?.name === 'AbortError') {
    return new SourceError('ABORTED', 'La operación fue cancelada');
  }
  return new SourceError('NETWORK', 'No se pudo conectar con el servidor');
}

/**
 * Elige la URL de texto plano de un libro: prefiere UTF-8, descarta .zip, archivos
 * readme (algunos libros solo exponen su readme como text/plain) y cualquier formato
 * que no sea text/plain. `undefined` si no hay texto utilizable.
 */
export function pickTextUrl(formats: Record<string, string> | undefined): string | undefined {
  if (!formats) return undefined;
  const candidates = Object.entries(formats).filter(
    ([mime, url]) => mime.startsWith('text/plain') && !/\.zip(\?|$)/i.test(url) && !isReadme(url)
  );
  const utf8 = candidates.find(([mime]) => /utf-?8/i.test(mime));
  return (utf8 ?? candidates[0])?.[1];
}

/** `true` si el nombre del archivo es un readme (p. ej. `26301-readme.txt`). */
function isReadme(url: string): boolean {
  const fileName = url.split(/[?#]/)[0].split('/').pop() ?? '';
  return /readme/i.test(fileName);
}

export async function searchBooks(query: string, signal?: AbortSignal): Promise<SearchResult> {
  const trimmed = query.trim();
  if (trimmed === '') {
    return { results: [], count: 0, next: null, previous: null };
  }

  const params = new URLSearchParams({ search: trimmed, mime_type: 'text/plain' });
  let response: Response;
  try {
    response = await fetch(`${GUTENDEX_BASE}/books/?${params}`, { signal });
  } catch (err) {
    throw toSourceError(err);
  }
  if (!response.ok) {
    throw new SourceError('HTTP', `Gutendex respondió con el estado ${response.status}`);
  }
  // Si el rewrite no está activo, el servidor suele devolver index.html (fallback de la SPA).
  if (!/json/i.test(response.headers.get('content-type') ?? '')) {
    throw new SourceError(
      'HTTP',
      `El proxy ${GUTENDEX_BASE} no devolvió JSON; revisa el rewrite en vercel.json`
    );
  }

  let body: GutendexResponse;
  try {
    body = (await response.json()) as GutendexResponse;
  } catch (err) {
    const converted = toSourceError(err);
    throw converted.code === 'ABORTED'
      ? converted
      : new SourceError('HTTP', 'Respuesta de Gutendex no válida');
  }
  if (!isGutendexResponse(body)) {
    throw new SourceError('HTTP', 'Respuesta de Gutendex con formato inesperado');
  }

  const results: BookSummary[] = [];
  for (const book of body.results) {
    const downloadUrl = pickTextUrl(book.formats);
    if (!downloadUrl) continue;
    results.push({
      id: book.id,
      title: book.title,
      authors: (book.authors ?? []).map((a) => a.name),
      downloadUrl,
    });
  }

  return {
    results,
    count: body.count,
    next: body.next ?? null,
    previous: body.previous ?? null,
  };
}

function isGutendexResponse(value: unknown): value is GutendexResponse {
  const v = value as Partial<GutendexResponse> | null;
  return (
    typeof v === 'object' && v !== null && typeof v.count === 'number' && Array.isArray(v.results)
  );
}
