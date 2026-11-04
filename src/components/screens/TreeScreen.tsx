import { useMemo } from 'react';
import { dispatch, useAppState } from '../../app/store';
import { byteHex, byteLabel, formatNumber } from '../../app/utils';
import { buildCanonicalCodes, buildCanonicalLengths } from '../../core';
import { CanonicalTree, HuffmanBuilder } from '../algorithm';
import { Button, Card, PageHeader, Stat } from '../ui';

interface Entry {
  byte: number;
  code: string;
  count: number;
}

export function TreeScreen() {
  const freqs = useAppState((s) => s.freqs);

  const { lengths, codes, entries, totalBits, totalBytes } = useMemo(() => {
    if (!freqs) {
      return { lengths: new Uint8Array(256), codes: [], entries: [], totalBits: 0, totalBytes: 0 };
    }
    const lengths = buildCanonicalLengths(freqs);
    const codes = buildCanonicalCodes(lengths);
    const entries: Entry[] = [];
    let totalBits = 0;
    let totalBytes = 0;
    for (let byte = 0; byte < 256; byte++) {
      const code = codes[byte];
      if (code === undefined) continue;
      entries.push({ byte, code, count: freqs[byte] });
      totalBits += code.length * freqs[byte];
      totalBytes += freqs[byte];
    }
    // Orden canónico: por longitud y luego por byte
    entries.sort((a, b) => a.code.length - b.code.length || a.byte - b.byte);
    return { lengths, codes, entries, totalBits, totalBytes };
  }, [freqs]);

  if (!freqs) return null;

  const average = totalBytes ? totalBits / totalBytes : 0;
  const maxLength = entries.reduce((max, e) => Math.max(max, e.code.length), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="03 — El árbol"
        title={
          <>
            Un código para <em className="text-gradient">cada</em> símbolo
          </>
        }
        description="Mira cómo se construye: Huffman une una y otra vez los dos pesos más pequeños. Los bytes frecuentes terminan cerca de la raíz con códigos cortos; los raros, lejos (máximo 15 bits)."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => dispatch({ type: 'NAVIGATE', screen: 'analyze' })}
            >
              ← Frecuencias
            </Button>
            <Button onClick={() => dispatch({ type: 'NAVIGATE', screen: 'compress' })}>
              Comprimir →
            </Button>
          </>
        }
      />

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Símbolos" value={entries.length} hint="hojas del árbol" />
        <Stat
          label="Bits por byte"
          tone={average > 0 && average < 8 ? 'brand' : 'default'}
          value={average.toFixed(2)}
          hint="en promedio · antes 8"
        />
        <Stat label="Profundidad" value={maxLength} hint="código más largo · límite 15" />
        <Stat
          label="Bits de datos"
          value={formatNumber(totalBits)}
          hint={`${formatNumber(Math.ceil(totalBits / 8))} bytes`}
        />
      </dl>

      {entries.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-400">
            El archivo está vacío: el diccionario no tiene símbolos.
          </p>
        </Card>
      ) : (
        <>
          <Card
            eyebrow="Construcción paso a paso"
            title="Así se arma el árbol"
            description="Cada hoja es un byte con su frecuencia. Dale play o avanza paso a paso; toca cualquier nodo para ver su camino de bits."
          >
            <HuffmanBuilder freqs={freqs} codes={codes} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              eyebrow="Explorar"
              title="Rama por rama"
              description="Abre y cierra los nodos del árbol canónico."
              className="lg:col-span-3"
            >
              <div className="tree-canvas max-h-[34rem] overflow-auto font-mono text-xs text-zinc-300">
                <CanonicalTree lengths={lengths} codes={codes} />
              </div>
            </Card>

            <Card
              eyebrow="Diccionario"
              title="Byte → código"
              description="En el mismo orden que en el .ycoma."
              className="lg:col-span-2"
            >
              <div className="max-h-[34rem] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-ink-2/95 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-zinc-500 backdrop-blur">
                    <tr>
                      <th className="px-2 py-2 font-normal">Byte</th>
                      <th className="px-2 py-2 font-normal">Código</th>
                      <th className="px-2 py-2 text-right font-normal">Bits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {entries.map(({ byte, code }) => (
                      <tr key={byte} className="hover:bg-white/[0.03]">
                        <td className="px-2 py-1.5">
                          <span className="font-display text-base italic text-white">
                            {byteLabel(byte)}
                          </span>{' '}
                          <span className="font-mono text-[0.65rem] text-zinc-600">
                            {byteHex(byte)}
                          </span>
                        </td>
                        <td className="break-all px-2 py-1.5 font-mono text-xs text-amber-200/90">
                          {code}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-zinc-400">
                          {code.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
