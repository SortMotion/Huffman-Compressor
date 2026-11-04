import { useEffect, useState } from 'react';
import { getHuffmanClient } from '../../app/client';
import { dispatch, useAppState } from '../../app/store';
import { isAbort, toUserMessage } from '../../app/errors';
import { downloadBytes, formatBytes, formatNumber, formatPercent } from '../../app/utils';
import type { CompressionStats } from '../../contracts/types';
import { Alert, Button, Card, PageHeader, Spinner, Stat } from '../ui';

/** Modo almacenado: el .ycoma guarda los datos tal cual porque Huffman no ahorraba. */
function isStoredStats(stats: CompressionStats): boolean {
  return stats.originalBytes > 0 && stats.symbolCount === 0;
}

export function CompressScreen() {
  const source = useAppState((s) => s.source);
  const compressed = useAppState((s) => s.compressed);
  const status = useAppState((s) => s.status);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!source || compressed) return;
    const controller = new AbortController();
    dispatch({ type: 'COMPRESS_START' });
    // compress transfiere el buffer al Worker: se manda una copia para conservar el original
    getHuffmanClient()
      .compress(source.bytes.slice(), source.name, controller.signal)
      .then((result) => dispatch({ type: 'COMPRESS_DONE', result }))
      .catch((err: unknown) => {
        if (!isAbort(err)) dispatch({ type: 'FAILED', error: toUserMessage(err) });
      });
    return () => controller.abort();
  }, [source, compressed, attempt]);

  if (!source) return null;

  const stored = compressed ? isStoredStats(compressed.stats) : false;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="04 — Compresión"
        title={
          <>
            Tu texto, <em className="text-gradient">{stored ? 'intacto' : 'condensado'}</em>
          </>
        }
        description={
          <>
            El resultado de comprimir <span className="text-zinc-200">{source.name}</span> en
            formato .ycoma.
          </>
        }
        actions={
          compressed && (
            <>
              <Button
                variant="secondary"
                onClick={() =>
                  dispatch({
                    type: 'ARCHIVE_LOADED',
                    file: {
                      name: compressed.suggestedName,
                      bytes: compressed.file.slice(),
                      origin: 'file',
                    },
                  })
                }
              >
                Inspeccionar
              </Button>
              <Button onClick={() => downloadBytes(compressed.file, compressed.suggestedName)}>
                ↓ Descargar .ycoma
              </Button>
            </>
          )
        }
      />

      {!compressed && status !== 'error' && (
        <Card>
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <Spinner /> Comprimiendo en el Web Worker…
          </div>
        </Card>
      )}

      {!compressed && status === 'error' && (
        <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
          Reintentar compresión
        </Button>
      )}

      {compressed && (
        <CompressionReport stats={compressed.stats} fileName={compressed.suggestedName} />
      )}
    </div>
  );
}

function CompressionReport({ stats, fileName }: { stats: CompressionStats; fileName: string }) {
  const stored = isStoredStats(stats);
  const saved = stats.savedBytes > 0;
  const overhead = stats.headerBytes + stats.tableBytes;
  const ratio = stats.ratio ?? 1;
  const parts = [
    { label: 'Cabecera', bytes: stats.headerBytes, color: 'bg-amber-300' },
    { label: 'Diccionario', bytes: stats.tableBytes, color: 'bg-fuchsia-400' },
    {
      label: stored ? 'Datos (sin comprimir)' : 'Datos',
      bytes: stats.dataBytes,
      color: 'bg-indigo-400',
    },
  ];

  return (
    <>
      {stored ? (
        <Alert tone="info" title="Guardado en modo almacenado">
          Con {formatNumber(stats.originalBytes)} bytes, el diccionario de Huffman ocuparía más de
          lo que ahorra, así que el .ycoma guarda tus datos tal cual. Solo se agrega la cabecera (
          {formatNumber(stats.headerBytes)} B): es lo mínimo que puede ocupar el formato. Con textos
          de unos cuantos KB, Huffman ya reduce el tamaño.
        </Alert>
      ) : !saved ? (
        <Alert
          tone="warning"
          title={`La cabecera pesa más que el ahorro (+${formatBytes(-stats.savedBytes)})`}
        >
          Huffman sí redujo los datos, pero la cabecera y el diccionario ({formatNumber(overhead)}{' '}
          B) no alcanzan a compensarse en un archivo tan pequeño.
        </Alert>
      ) : null}

      <Card className="p-0!">
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-zinc-500">
              {stored ? 'Modo almacenado' : saved ? 'Reducción' : 'Diferencia'}
            </p>
            <p
              className={`mt-2 font-display text-7xl leading-none tabular-nums sm:text-8xl ${saved ? 'text-gradient' : 'text-zinc-200'}`}
            >
              {saved ? '−' : '+'}
              {formatPercent(
                stats.reductionPercent === null ? null : Math.abs(stats.reductionPercent)
              )}
            </p>
            <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display text-2xl text-zinc-300">
              <span>{formatBytes(stats.originalBytes)}</span>
              <span className="font-mono text-base text-fuchsia-300">→</span>
              <span className="text-white">{formatBytes(stats.compressedBytes)}</span>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
                {fileName}
              </span>
            </p>
          </div>
          <SizeOrbs original={stats.originalBytes} compressed={stats.compressedBytes} />
        </div>

        <div className="border-t border-white/6 p-6 sm:px-10">
          <p className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
            Anatomía del .ycoma · {formatNumber(stats.compressedBytes)} bytes
          </p>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
            {parts.map((part) => (
              <div
                key={part.label}
                className={`${part.color} transition-all`}
                style={{ width: `${(part.bytes / Math.max(1, stats.compressedBytes)) * 100}%` }}
                title={`${part.label}: ${formatNumber(part.bytes)} B`}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-400">
            {parts.map((part) => (
              <li key={part.label} className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${part.color}`} aria-hidden="true" />
                {part.label}
                <span className="font-mono text-zinc-200">{formatNumber(part.bytes)} B</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Original"
          value={formatBytes(stats.originalBytes)}
          hint={`${formatNumber(stats.originalBytes)} bytes`}
        />
        <Stat
          label=".ycoma"
          value={formatBytes(stats.compressedBytes)}
          hint={`${formatNumber(stats.compressedBytes)} bytes`}
        />
        <Stat
          label={saved ? 'Ahorro' : 'Aumento'}
          tone={saved ? 'good' : 'default'}
          value={formatBytes(Math.abs(stats.savedBytes))}
          hint={saved ? 'menos que el original' : 'por la cabecera'}
        />
        <Stat label="Razón" value={ratio.toFixed(3)} hint="comprimido ÷ original" />
      </dl>
    </>
  );
}

/** Dos círculos cuya área es proporcional al tamaño original y al comprimido. */
function SizeOrbs({ original, compressed }: { original: number; compressed: number }) {
  const max = Math.max(original, compressed, 1);
  const size = 200;
  const rOriginal = (size / 2 - 4) * Math.sqrt(original / max);
  const rCompressed = (size / 2 - 4) * Math.sqrt(compressed / max);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto size-44 sm:size-52" aria-hidden="true">
      <defs>
        <radialGradient id="orb" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fdf4ff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#e879f9" stopOpacity="0.85" />
          <stop offset="1" stopColor="#4f46e5" stopOpacity="0.9" />
        </radialGradient>
        <filter id="orb-glow" filterUnits="userSpaceOnUse" x="0" y="0" width={size} height={size}>
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={rOriginal}
        fill="none"
        stroke="white"
        strokeOpacity={0.25}
        strokeDasharray="3 5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={rCompressed}
        fill="#e879f9"
        opacity={0.45}
        filter="url(#orb-glow)"
      />
      <circle cx={size / 2} cy={size / 2} r={rCompressed} fill="url(#orb)" />
    </svg>
  );
}
