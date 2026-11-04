import { useEffect, useMemo, useState } from 'react';
import { getHuffmanClient } from '../../app/client';
import { dispatch, useAppState } from '../../app/store';
import { isAbort, toUserMessage } from '../../app/errors';
import { downloadBytes, formatBytes, formatNumber, stripExtension } from '../../app/utils';
import { FILE_EXTENSION, PREVIEW_CHARS } from '../../contracts/constants';
import { Alert, Button, Card, PageHeader, Spinner, Stat } from '../ui';

/** Primeros `PREVIEW_CHARS` caracteres (no bytes) del contenido, decodificado como UTF-8. */
function previewText(content: Uint8Array): { text: string; truncated: boolean } {
  // Un carácter UTF-8 ocupa como máximo 4 bytes
  const slice = content.subarray(0, PREVIEW_CHARS * 4);
  const chars = Array.from(new TextDecoder('utf-8').decode(slice));
  const truncated = chars.length > PREVIEW_CHARS || content.length > slice.length;
  return { text: chars.slice(0, PREVIEW_CHARS).join(''), truncated };
}

export function DecompressScreen() {
  const archive = useAppState((s) => s.archive);
  const decompressed = useAppState((s) => s.decompressed);
  const status = useAppState((s) => s.status);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!archive || decompressed) return;
    const controller = new AbortController();
    dispatch({ type: 'DECOMPRESS_START' });
    getHuffmanClient()
      .decompress(archive.bytes.slice(), controller.signal)
      .then((result) => dispatch({ type: 'DECOMPRESS_DONE', result }))
      .catch((err: unknown) => {
        if (!isAbort(err)) dispatch({ type: 'FAILED', error: toUserMessage(err) });
      });
    return () => controller.abort();
  }, [archive, decompressed, attempt]);

  const preview = useMemo(
    () => (decompressed ? previewText(decompressed.content) : null),
    [decompressed]
  );

  if (!archive) return null;

  const restoredName =
    decompressed?.originalName || stripExtension(archive.name, FILE_EXTENSION) || 'restaurado.txt';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="02 — Descompresión"
        title={
          <>
            Cada bit, <em className="text-gradient">de vuelta</em>
          </>
        }
        description={
          <>
            Restaura <span className="text-zinc-200">{archive.name}</span> y comprueba su integridad
            con CRC32.
          </>
        }
        actions={
          decompressed && (
            <Button onClick={() => downloadBytes(decompressed.content, restoredName, 'text/plain')}>
              ↓ Descargar original
            </Button>
          )
        }
      />

      {!decompressed && status !== 'error' && (
        <Card>
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <Spinner /> Descomprimiendo en el Web Worker…
          </div>
        </Card>
      )}

      {!decompressed && status === 'error' && (
        <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
          Reintentar
        </Button>
      )}

      {decompressed && preview && (
        <>
          {decompressed.verified ? (
            <Alert tone="success" title="Integridad verificada">
              El CRC32 del contenido restaurado coincide con el de la cabecera:{' '}
              <span className="font-mono text-emerald-200">{decompressed.actualCrc32}</span>.
            </Alert>
          ) : (
            <Alert tone="error" title="El CRC32 no coincide">
              Se esperaba <span className="font-mono">{decompressed.expectedCrc32}</span> y se
              obtuvo <span className="font-mono">{decompressed.actualCrc32}</span>. El archivo pudo
              dañarse: revisa el contenido antes de usarlo.
            </Alert>
          )}

          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Stat
              label="Restaurado"
              tone="brand"
              value={formatBytes(decompressed.content.length)}
              hint={`${formatNumber(decompressed.content.length)} bytes`}
            />
            <Stat
              label="Comprimido"
              value={formatBytes(archive.bytes.length)}
              hint={archive.name}
            />
            <Stat
              label="CRC32"
              tone={decompressed.verified ? 'good' : 'bad'}
              value={<span className="font-mono text-2xl">{decompressed.actualCrc32}</span>}
              hint={decompressed.verified ? 'coincide' : `esperado ${decompressed.expectedCrc32}`}
            />
          </dl>

          <Card
            eyebrow="Vista previa"
            title={restoredName}
            description={
              preview.truncated
                ? `Primeros ${formatNumber(PREVIEW_CHARS)} caracteres. Descarga el archivo para leerlo completo.`
                : 'Contenido completo.'
            }
          >
            <div className="relative">
              <textarea
                readOnly
                value={preview.text}
                aria-label="Vista previa del contenido"
                className="h-112 w-full resize-y rounded-2xl border border-white/6 bg-black/30 p-5 font-mono text-[0.8rem] leading-relaxed text-zinc-200 focus:border-fuchsia-300/40 focus:outline-none"
              />
              {preview.truncated && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-px bottom-px h-20 rounded-b-2xl bg-linear-to-t from-ink to-transparent"
                />
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
