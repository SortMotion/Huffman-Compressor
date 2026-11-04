import { useEffect, useMemo, useRef } from 'react';
import { getHuffmanClient } from '../../app/client';
import { dispatch, useAppState } from '../../app/store';
import { isAbort, toUserMessage } from '../../app/errors';
import { byteHex, byteLabel, formatBytes, formatNumber } from '../../app/utils';
import { FILE_EXTENSION, MAGIC, MAX_FILE_BYTES } from '../../contracts/constants';
import type { InspectResult } from '../../contracts/types';
import { Button, Card, PageHeader, Spinner, Stat } from '../ui';

const MAGIC_TEXT = String.fromCharCode(...MAGIC);
const MAGIC_HEX = MAGIC.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

export function InspectScreen() {
  const archive = useAppState((s) => s.archive);
  const inspected = useAppState((s) => s.inspected);
  const status = useAppState((s) => s.status);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!archive || inspected) return;
    const controller = new AbortController();
    dispatch({ type: 'INSPECT_START' });
    getHuffmanClient()
      .inspect(archive.bytes.slice(), controller.signal)
      .then((result) => dispatch({ type: 'INSPECT_DONE', result }))
      .catch((err: unknown) => {
        if (!isAbort(err)) dispatch({ type: 'FAILED', error: toUserMessage(err) });
      });
    return () => controller.abort();
  }, [archive, inspected]);

  async function onFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      dispatch({
        type: 'FAILED',
        error: toUserMessage({ name: 'FormatError', code: 'TOO_LARGE' }),
      });
      return;
    }
    dispatch({ type: 'LOAD_START' });
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      dispatch({ type: 'ARCHIVE_LOADED', file: { name: file.name, bytes, origin: 'file' } });
    } catch (err) {
      dispatch({ type: 'FAILED', error: toUserMessage(err) });
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="01 — Inspección"
        title={
          <>
            Abrir el <em className="text-gradient">.ycoma</em> sin romperlo
          </>
        }
        description="Lee la cabecera y el diccionario sin descomprimir los datos."
        actions={
          <>
            {archive && (
              <Button
                variant="secondary"
                onClick={() => input.current?.click()}
                disabled={status === 'loading'}
              >
                Elegir otro
              </Button>
            )}
            {inspected && (
              <Button onClick={() => dispatch({ type: 'NAVIGATE', screen: 'decompress' })}>
                Descomprimir →
              </Button>
            )}
          </>
        }
      />
      <input
        ref={input}
        type="file"
        accept={FILE_EXTENSION}
        className="sr-only"
        aria-label="Archivo .ycoma"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = '';
        }}
      />

      {(!archive || (!inspected && status === 'error')) && (
        <Card>
          <div className="flex flex-col items-center gap-5 py-12 text-center">
            <p className="font-mono text-4xl tracking-[0.3em] text-gradient" aria-hidden="true">
              {MAGIC_TEXT}
            </p>
            <p className="max-w-sm font-display text-2xl italic text-zinc-300">
              Elige un archivo {FILE_EXTENSION} para leer su anatomía.
            </p>
            <Button onClick={() => input.current?.click()}>Elegir archivo .ycoma</Button>
          </div>
        </Card>
      )}

      {archive && !inspected && status !== 'error' && (
        <Card>
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <Spinner /> Leyendo la cabecera de {archive.name}…
          </div>
        </Card>
      )}

      {archive && inspected && <InspectReport name={archive.name} result={inspected} />}
    </div>
  );
}

function InspectReport({ name, result }: { name: string; result: InspectResult }) {
  const { header, stats, codes, dataBytes } = result;
  const stored = header.originalSize > 0 && header.symbolCount === 0;

  const entries = useMemo(() => {
    const list: { byte: number; code: string }[] = [];
    codes.forEach((code, byte) => {
      if (code !== undefined) list.push({ byte, code });
    });
    return list.sort((a, b) => a.code.length - b.code.length || a.byte - b.byte);
  }, [codes]);

  const preview = Array.from(dataBytes.subarray(0, 48), (b) =>
    b.toString(16).padStart(2, '0')
  ).join(' ');

  const fields: [string, string][] = [
    ['Firma', `${MAGIC_TEXT}  ·  ${MAGIC_HEX}`],
    ['Versión', String(header.version)],
    [
      'Modo',
      stored ? 'Almacenado (sin comprimir)' : header.originalSize ? 'Huffman canónico' : 'Vacío',
    ],
    ['Nombre original', header.originalName || '(sin nombre)'],
    ['Tamaño original', `${formatNumber(header.originalSize)} bytes`],
    ['CRC32', header.crc32Hex],
    ['Bits totales', formatNumber(header.totalBits)],
    ['Símbolos', String(header.symbolCount)],
  ];

  return (
    <>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Archivo" value={formatBytes(stats.compressedBytes)} hint={name} />
        <Stat label="Cabecera" value={`${stats.headerBytes} B`} hint="21 fijos + nombre" />
        <Stat
          label="Diccionario"
          value={`${stats.tableBytes} B`}
          hint={`${header.symbolCount} × 2 bytes`}
        />
        <Stat
          label="Datos"
          value={formatBytes(stats.dataBytes)}
          hint={`${formatNumber(stats.totalBits)} bits`}
        />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card eyebrow="Cabecera" title="Metadatos">
          <dl className="divide-y divide-white/5 text-sm">
            {fields.map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2 py-2.5">
                <dt className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                  {label}
                </dt>
                <dd className="break-all text-right font-mono text-zinc-100">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6">
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
              Primeros bytes de datos
            </p>
            <p className="break-all rounded-2xl border border-white/6 bg-black/30 p-4 font-mono text-xs leading-relaxed text-fuchsia-200/80">
              {preview || '(sin datos)'}
              {dataBytes.length > 48 && <span className="text-zinc-600"> …</span>}
            </p>
          </div>
        </Card>

        <Card
          eyebrow="Diccionario"
          title="Pares (byte, longitud)"
          description="Y el código canónico que se reconstruye con ellos."
        >
          {entries.length === 0 ? (
            <p className="text-sm leading-relaxed text-zinc-400">
              {stored
                ? 'Este archivo está en modo almacenado: guarda los datos tal cual, así que no necesita diccionario.'
                : 'El archivo original estaba vacío.'}
            </p>
          ) : (
            <div className="max-h-120 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-ink-2/95 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-zinc-500 backdrop-blur">
                  <tr>
                    <th className="px-2 py-2 font-normal">Byte</th>
                    <th className="px-2 py-2 text-right font-normal">Long.</th>
                    <th className="px-2 py-2 font-normal">Código</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {entries.map(({ byte, code }) => (
                    <tr key={byte} className="hover:bg-white/3">
                      <td className="px-2 py-1.5">
                        <span className="font-display text-base italic text-white">
                          {byteLabel(byte)}
                        </span>{' '}
                        <span className="font-mono text-[0.65rem] text-zinc-600">
                          {byteHex(byte)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-zinc-400">
                        {code.length}
                      </td>
                      <td className="break-all px-2 py-1.5 font-mono text-xs text-amber-200/90">
                        {code}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
