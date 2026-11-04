import { useEffect, useMemo, useState } from 'react';
import { getHuffmanClient } from '../../app/client';
import { dispatch, useAppState } from '../../app/store';
import { isAbort, toUserMessage } from '../../app/errors';
import { byteHex, byteLabel, formatBytes, formatNumber, formatPercent } from '../../app/utils';
import type { FrequencyTable } from '../../contracts/types';
import { Button, Card, PageHeader, Spinner, Stat } from '../ui';

type SortKey = 'byte' | 'count';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;
const SPECTRUM_SIZE = 32;

interface Row {
  byte: number;
  count: number;
}

export function AnalyzeScreen() {
  const source = useAppState((s) => s.source);
  const freqs = useAppState((s) => s.freqs);
  const status = useAppState((s) => s.status);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!source || freqs) return;
    const controller = new AbortController();
    dispatch({ type: 'ANALYZE_START' });
    getHuffmanClient()
      .analyze(source.bytes, controller.signal)
      .then((result) => dispatch({ type: 'ANALYZE_DONE', freqs: result }))
      .catch((err: unknown) => {
        if (!isAbort(err)) dispatch({ type: 'FAILED', error: toUserMessage(err) });
      });
    return () => controller.abort();
  }, [source, freqs, attempt]);

  if (!source) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="02 — Frecuencias"
        title={
          <>
            El peso de cada <em className="text-gradient">letra</em>
          </>
        }
        description={
          <>
            Cuántas veces aparece cada byte en <span className="text-zinc-200">{source.name}</span>.
            Los más frecuentes recibirán los códigos más cortos.
          </>
        }
        actions={
          <Button disabled={!freqs} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'tree' })}>
            Construir el árbol →
          </Button>
        }
      />

      {!freqs && status !== 'error' && (
        <Card>
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <Spinner /> Contando bytes en el Web Worker…
          </div>
        </Card>
      )}

      {!freqs && status === 'error' && (
        <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
          Reintentar análisis
        </Button>
      )}

      {freqs && <FrequencyReport freqs={freqs} total={source.bytes.length} />}
    </div>
  );
}

function FrequencyReport({ freqs, total }: { freqs: FrequencyTable; total: number }) {
  const [sortKey, setSortKey] = useState<SortKey>('count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const list: Row[] = [];
    for (let byte = 0; byte < 256; byte++) {
      if (freqs[byte] > 0) list.push({ byte, count: freqs[byte] });
    }
    return list;
  }, [freqs]);

  const byCount = useMemo(
    () => [...rows].sort((a, b) => b.count - a.count || a.byte - b.byte),
    [rows]
  );

  const sorted = useMemo(() => {
    const factor = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) =>
      sortKey === 'byte'
        ? (a.byte - b.byte) * factor
        : (a.count - b.count) * factor || a.byte - b.byte
    );
  }, [rows, sortKey, sortDir]);

  const entropy = useMemo(() => {
    let h = 0;
    for (const { count } of rows) {
      const p = count / total;
      h -= p * Math.log2(p);
    }
    return h;
  }, [rows, total]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const top = byCount[0] ?? null;
  const spectrum = byCount.slice(0, SPECTRUM_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir(key === 'count' ? 'desc' : 'asc');
    }
    setPage(0);
  }

  return (
    <>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tamaño" value={formatBytes(total)} hint={`${formatNumber(total)} bytes`} />
        <Stat label="Símbolos" value={rows.length} hint="distintos, de 256 posibles" />
        <Stat
          label="El más frecuente"
          tone="brand"
          value={top ? byteLabel(top.byte) : '—'}
          hint={
            top ? `${byteHex(top.byte)} · ${formatPercent((top.count / total) * 100)}` : undefined
          }
        />
        <Stat
          label="Entropía"
          value={entropy.toFixed(2)}
          hint={`bits por byte · mínimo ≈ ${formatBytes(Math.ceil((entropy * total) / 8))}`}
        />
      </dl>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-400">El archivo está vacío: no hay bytes que contar.</p>
        </Card>
      ) : (
        <>
          <Card
            eyebrow="Espectro"
            title="Los 32 símbolos más frecuentes"
            description="La altura de cada barra es su frecuencia."
          >
            <div
              className="flex h-56 items-end gap-.75 sm:gap-1.5"
              role="img"
              aria-label="Histograma de frecuencias"
            >
              {spectrum.map(({ byte, count }, i) => (
                <div
                  key={byte}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <div
                    className="w-full origin-bottom rounded-t-md bg-linear-to-t from-indigo-500/70 via-fuchsia-400/80 to-amber-200 opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_24px_rgb(232_121_249/0.6)]"
                    style={{
                      height: `${Math.max(2, (count / (top?.count ?? 1)) * 100)}%`,
                      animation: `rise 0.6s ${i * 25}ms both cubic-bezier(.2,.7,.2,1)`,
                    }}
                    title={`${byteLabel(byte)} · ${formatNumber(count)}`}
                  />
                  <span className="max-w-full truncate font-mono text-[0.6rem] text-zinc-500 group-hover:text-white">
                    {byte === 32 ? '␣' : byteLabel(byte)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card
            eyebrow="Tabla"
            title="Todos los símbolos"
            description="Haz clic en una columna para ordenar."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/8 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-zinc-500">
                  <tr>
                    <SortHeader
                      label="Byte"
                      active={sortKey === 'byte'}
                      dir={sortDir}
                      onClick={() => toggleSort('byte')}
                    />
                    <th className="px-3 py-3 font-normal">Carácter</th>
                    <SortHeader
                      label="Frecuencia"
                      active={sortKey === 'count'}
                      dir={sortDir}
                      onClick={() => toggleSort('count')}
                      align="right"
                    />
                    <th className="px-3 py-3 text-right font-normal">%</th>
                    <th className="hidden w-1/3 px-3 py-3 sm:table-cell" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {visible.map(({ byte, count }) => {
                    const percent = (count / total) * 100;
                    return (
                      <tr key={byte} className="transition-colors hover:bg-white/3">
                        <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">
                          {byteHex(byte)}
                        </td>
                        <td className="px-3 py-2.5 font-display text-lg italic text-white">
                          {byteLabel(byte)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-zinc-200">
                          {formatNumber(count)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-500">
                          {formatPercent(percent, 2)}
                        </td>
                        <td className="hidden px-3 py-2.5 sm:table-cell">
                          <div className="h-1 rounded-full bg-white/5">
                            <div
                              className="bg-brand h-full rounded-full"
                              style={{ width: `${(count / (top?.count ?? 1)) * 100}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                Página {page + 1} / {pages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  ← Anterior
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= pages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

interface SortHeaderProps {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: 'left' | 'right';
}

function SortHeader({ label, active, dir, onClick, align = 'left' }: SortHeaderProps) {
  return (
    <th
      className={`px-3 py-3 font-normal ${align === 'right' ? 'text-right' : ''}`}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 uppercase transition-colors hover:text-white ${active ? 'text-fuchsia-200' : ''}`}
      >
        {label}
        <span aria-hidden="true" className={active ? '' : 'opacity-30'}>
          {active && dir === 'asc' ? '↑' : '↓'}
        </span>
      </button>
    </th>
  );
}
