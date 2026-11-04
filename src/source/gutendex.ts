import { SourceError } from '../contracts/errors';
import type { BookSummary, SearchResult } from '../contracts/types';

/**
 * Gutendex permite CORS (`Access-Control-Allow-Origin: *`), así que el navegador lo
 * consulta directo. No se usa el proxy de Vercel: Cloudflare, delante de gutendex.com,
 * responde con un desafío anti-bots ("Just a moment…") a las peticiones de los
 * servidores de Vercel.
 */
const GUTENDEX_BASE = 'https://gutendex.com';

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
  // Gutendex no distingue mayúsculas, pero su caché (Cloudflare, 4 h) sí: normalizar
  // hace que más búsquedas respondan al instante en lugar de tardar ~1 minuto.
  const normalized = query.trim().replace(/\s+/g, ' ').toLowerCase();
  if (normalized === '') {
    return { results: [], count: 0, next: null, previous: null };
  }

  const params = new URLSearchParams({ search: normalized, mime_type: 'text/plain' });
  let response: Response;
  try {
    response = await fetch(`${GUTENDEX_BASE}/books/?${params}`, { signal });
  } catch (err) {
    throw toSourceError(err);
  }
  if (!response.ok) {
    throw new SourceError('HTTP', `Gutendex respondió con el estado ${response.status}`);
  }
  // Una página HTML suele ser el desafío de Cloudflare o una página de error del servicio
  if (!/json/i.test(response.headers.get('content-type') ?? '')) {
    throw new SourceError('HTTP', 'Gutendex no devolvió JSON (servicio caído o bloqueado)');
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
