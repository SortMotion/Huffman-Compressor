import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { dispatch, useAppState } from '../../app/store';
import { isAbort, toUserMessage } from '../../app/errors';
import { fileNameFromTitle, formatBytes } from '../../app/utils';
import { MAX_INPUT_BYTES } from '../../contracts/constants';
import type { BookSummary, SearchResult } from '../../contracts/types';
import { downloadText, searchBooks } from '../../source';
import { Alert, Button, Card, HeroArt, ProgressBar } from '../ui';

const TOO_LARGE = toUserMessage({ name: 'FormatError', code: 'TOO_LARGE' });
const SEARCH_TIMEOUT_MS = 90_000;
const SUGGESTIONS = ['Don Quijote', 'Frankenstein', 'Pride and Prejudice', 'Alice in Wonderland'];

export function SourceScreen() {
  const status = useAppState((s) => s.status);
  const progress = useAppState((s) => s.progress);
  const source = useAppState((s) => s.source);
  const [downloading, setDownloading] = useState<BookSummary | null>(null);
  const downloadController = useRef<AbortController | null>(null);

  const loading = status === 'loading';

  async function loadLocalFile(file: File) {
    if (file.size > MAX_INPUT_BYTES) {
      dispatch({ type: 'FAILED', error: TOO_LARGE });
      return;
    }
    dispatch({ type: 'LOAD_START' });
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      dispatch({ type: 'SOURCE_LOADED', file: { name: file.name, bytes, origin: 'file' } });
    } catch (err) {
      dispatch({ type: 'FAILED', error: toUserMessage(err) });
    }
  }

  async function loadBook(book: BookSummary) {
    const controller = new AbortController();
    downloadController.current = controller;
    setDownloading(book);
    dispatch({ type: 'LOAD_START' });
    try {
      const bytes = await downloadText(book.downloadUrl, controller.signal, (loaded, total) =>
        dispatch({ type: 'LOAD_PROGRESS', progress: { loaded, total } })
      );
      dispatch({
        type: 'SOURCE_LOADED',
        file: { name: fileNameFromTitle(book.title), bytes, origin: 'gutenberg' },
      });
    } catch (err) {
      dispatch(
        isAbort(err) ? { type: 'CANCELLED' } : { type: 'FAILED', error: toUserMessage(err) }
      );
    } finally {
      downloadController.current = null;
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="animate-rise">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-fuchsia-300/80">
            01 — La fuente
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] text-white sm:text-7xl">
            El arte de decir <em className="text-gradient">más</em>
            <br />
            con menos bits.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-400">
            Cada letra tiene un peso. Huffman le da los códigos más cortos a las más frecuentes y
            empaqueta tu texto en un archivo <span className="font-mono text-zinc-200">.ycoma</span>
            . Elige un archivo o un libro clásico para empezar.
          </p>
          <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-zinc-600">
            Hasta {formatBytes(MAX_INPUT_BYTES)} · todo ocurre en tu navegador
          </p>
        </div>
        <HeroArt className="mx-auto w-full max-w-md drop-shadow-[0_0_60px_rgb(168_85_247/0.25)]" />
      </section>

      {source && !loading && (
        <Alert
          tone="info"
          title={`En la mesa: ${source.name}`}
          action={
            <Button size="sm" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'analyze' })}>
              Continuar →
            </Button>
          }
        >
          {formatBytes(source.bytes.length)}. Si eliges otro, lo reemplaza.
        </Alert>
      )}

      {loading && (
        <Card
          eyebrow="Descargando"
          title={downloading ? `«${downloading.title}»` : 'Leyendo archivo…'}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <ProgressBar
                value={progress?.loaded ?? 0}
                max={progress?.total ?? null}
                label={downloading ? 'Project Gutenberg' : 'Archivo local'}
                detail={
                  progress
                    ? `${formatBytes(progress.loaded)}${progress.total ? ` / ${formatBytes(progress.total)}` : ''}`
                    : undefined
                }
              />
            </div>
            {downloading && (
              <Button variant="secondary" onClick={() => downloadController.current?.abort()}>
                Cancelar
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <FilePicker disabled={loading} onFile={loadLocalFile} />
        </div>
        <div className="lg:col-span-3">
          <BookSearch disabled={loading} onPick={loadBook} />
        </div>
      </div>
    </div>
  );
}

function FilePicker({ disabled, onFile }: { disabled: boolean; onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  }

  return (
    <Card
      eyebrow="I · Tu archivo"
      title="Desde tu equipo"
      description="Cualquier texto: .txt, .md, .csv…"
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`group flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-4 py-12 text-center transition-all duration-300 ${
          dragging
            ? 'scale-[1.01] border-fuchsia-300/70 bg-fuchsia-400/[0.07] shadow-[inset_0_0_60px_rgb(232_121_249/0.15)]'
            : 'border-white/15 hover:border-white/30'
        }`}
      >
        <div
          className="font-mono text-xs leading-tight text-zinc-600 transition-colors group-hover:text-fuchsia-300/70"
          aria-hidden="true"
        >
          01001000
          <br />
          01010101
          <br />
          01000110
        </div>
        <p className="font-display text-xl italic text-zinc-300">Suelta aquí tu texto</p>
        <Button variant="secondary" disabled={disabled} onClick={() => input.current?.click()}>
          Elegir archivo
        </Button>
        <input
          ref={input}
          type="file"
          className="sr-only"
          aria-label="Archivo a comprimir"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
      </div>
    </Card>
  );
}

function BookSearch({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (book: BookSummary) => void;
}) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  async function search(text: string) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    // Gutendex a veces deja la petición colgada: se corta a los 90 s con un aviso claro
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      current.abort();
    }, SEARCH_TIMEOUT_MS);
    setSearching(true);
    setError(null);
    try {
      setResult(await searchBooks(text, current.signal));
    } catch (err) {
      if (timedOut) {
        setError('Gutendex no respondió en 90 segundos. Intenta de nuevo o sube un archivo local.');
      } else if (!isAbort(err)) {
        setError(toUserMessage(err).message);
      }
    } finally {
      clearTimeout(timer);
      if (controller.current === current) setSearching(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void search(query);
  }

  return (
    <Card
      eyebrow="II · La biblioteca"
      title="Project Gutenberg"
      description="Más de 70 000 libros de dominio público. Busca por título o autor."
    >
      <form onSubmit={onSubmit} className="flex gap-2" role="search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Un título, un autor…"
          aria-label="Buscar libro"
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/4 px-5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-fuchsia-300/50 focus:bg-white/6 focus:outline-none"
        />
        <Button type="submit" loading={searching} disabled={!query.trim()}>
          Buscar
        </Button>
      </form>

      {!result && !searching && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((title) => (
            <button
              key={title}
              type="button"
              onClick={() => {
                setQuery(title);
                void search(title);
              }}
              className="rounded-full border border-white/10 px-3 py-1 font-display text-sm italic text-zinc-400 transition-colors hover:border-fuchsia-300/40 hover:text-white"
            >
              {title}
            </button>
          ))}
        </div>
      )}

      {searching && (
        <p
          className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500"
          role="status"
        >
          Consultando el catálogo… Gutendex a veces tarda hasta un minuto.
        </p>
      )}

      {error && (
        <div className="mt-4">
          <Alert tone="error" title="No se pudo buscar">
            {error}
          </Alert>
        </div>
      )}

      {result && !error && (
        <div className="mt-5">
          <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
            {result.count === 0
              ? 'Sin libros con texto disponible'
              : `${result.count} coincidencias · mostrando ${result.results.length}`}
          </p>
          <ul className="max-h-96 space-y-1 overflow-y-auto pr-1">
            {result.results.map((book, i) => (
              <li
                key={book.id}
                className="animate-rise group flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/4"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="w-10 shrink-0 font-mono text-[0.65rem] text-zinc-600">
                  #{book.id}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg leading-tight text-zinc-100">
                    {book.title}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {book.authors.length ? book.authors.join('; ') : 'Autor desconocido'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => onPick(book)}
                >
                  Usar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
