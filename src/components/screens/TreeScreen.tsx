    import { useMemo } from 'react';
    import { dispatch, useAppState } from '../../app/store';
    import { byteHex, byteLabel, formatNumber } from '../../app/utils';
    import { buildCanonicalCodes, buildCanonicalLengths } from '../../core';
    import type { FrequencyTable } from '../../contracts/types';
    import { CanonicalTree } from '../algorithm';
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
            description="Diccionario canónico: los bytes frecuentes viven cerca de la raíz y reciben códigos cortos; los raros, lejos (máximo 15 bits)."
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
                eyebrow="Vista general"
                title="La forma del código"
                description="Cada hoja es un byte; su tamaño refleja su frecuencia. Rama izquierda = 0, derecha = 1."
            >
                <TreeArt entries={entries} freqs={freqs} />
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

    interface Node {
    x: number;
    depth: number;
    leaf?: Entry;
    }

    const WIDTH = 1000;
    const LEVEL = 46;

    /**
     * Dibuja el árbol completo: las hojas se reparten a lo ancho en orden canónico (que es
     * el orden de izquierda a derecha) y cada nodo interno queda al centro de sus hijos.
     */
    function TreeArt({ entries, freqs }: { entries: Entry[]; freqs: FrequencyTable }) {
    const { nodes, edges, depth, maxCount } = useMemo(() => {
        const byCode = [...entries].sort((a, b) => (a.code < b.code ? -1 : 1));
        const nodes = new Map<string, Node>();
        byCode.forEach((leaf, i) => {
        nodes.set(leaf.code, {
            x: ((i + 0.5) / byCode.length) * WIDTH,
            depth: leaf.code.length,
            leaf,
        });
        });
        const depth = byCode.reduce((max, e) => Math.max(max, e.code.length), 0);
        // Nodos internos, de abajo hacia arriba: x = promedio de sus hijos
        for (let d = depth - 1; d >= 0; d--) {
        const children = [...nodes.keys()].filter((k) => k.length === d + 1);
        for (const child of children) {
            const parent = child.slice(0, -1);
            if (nodes.has(parent)) continue;
            const kids = [nodes.get(`${parent}0`), nodes.get(`${parent}1`)].filter(Boolean) as Node[];
            nodes.set(parent, { x: kids.reduce((s, n) => s + n.x, 0) / kids.length, depth: d });
        }
        }
        const edges = [...nodes.keys()]
        .filter((k) => k.length > 0)
        .map((k) => ({ from: nodes.get(k.slice(0, -1))!, to: nodes.get(k)!, key: k }));
        const maxCount = entries.reduce((max, e) => Math.max(max, freqs[e.byte]), 1);
        return { nodes, edges, depth, maxCount };
    }, [entries, freqs]);

    const height = (depth + 1) * LEVEL + 40;
    const y = (d: number) => 24 + d * LEVEL;
    const showLabels = entries.length <= 72;

    return (
        <div className="-mx-2 overflow-x-auto">
        <svg
            viewBox={`0 0 ${WIDTH} ${height}`}
            className="min-w-[640px]"
            role="img"
            aria-label={`Árbol de Huffman con ${entries.length} hojas y ${depth} niveles`}
        >
            <defs>
            <linearGradient id="tree-edge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#a5b4fc" />
                <stop offset="0.5" stopColor="#e879f9" />
                <stop offset="1" stopColor="#fcd34d" />
            </linearGradient>
            <radialGradient id="tree-leaf" cx="35%" cy="30%" r="75%">
                <stop offset="0" stopColor="#fff7ed" />
                <stop offset="0.4" stopColor="#f0abfc" />
                <stop offset="1" stopColor="#6366f1" />
            </radialGradient>
            <filter id="tree-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
            </defs>

            {Array.from({ length: depth + 1 }, (_, d) => (
            <g key={d}>
                <line x1={0} x2={WIDTH} y1={y(d)} y2={y(d)} stroke="white" strokeOpacity={0.03} />
                <text x={4} y={y(d) - 6} className="fill-zinc-600 font-mono" style={{ fontSize: 10 }}>
                {d}
                </text>
            </g>
            ))}

            {edges.map(({ from, to, key }) => {
            const y1 = y(from.depth);
            const y2 = y(to.depth);
            const mid = (y1 + y2) / 2;
            return (
                <path
                key={key}
                d={`M${from.x},${y1} C${from.x},${mid} ${to.x},${mid} ${to.x},${y2}`}
                fill="none"
                stroke="url(#tree-edge)"
                strokeOpacity={0.25 + 0.5 * (1 - to.depth / (depth + 1))}
                strokeWidth={Math.max(0.6, 2.4 - to.depth * 0.14)}
                />
            );
            })}

            {[...nodes.values()].map((node) => {
            const cy = y(node.depth);
            if (!node.leaf) {
                return (
                <circle
                    key={`n${node.depth}-${node.x}`}
                    cx={node.x}
                    cy={cy}
                    r={2}
                    className="fill-zinc-300"
                />
                );
            }
            const { byte, code, count } = node.leaf;
            const r = 3 + 9 * Math.sqrt(count / maxCount);
            return (
                <g key={code} filter="url(#tree-glow)">
                <title>{`${byteLabel(byte)} (${byteHex(byte)}) · ${code} · ${formatNumber(count)} veces`}</title>
                <circle cx={node.x} cy={cy} r={r} fill="url(#tree-leaf)" />
                {showLabels && (
                    <text
                    x={node.x}
                    y={cy + r + 13}
                    textAnchor="middle"
                    className="fill-zinc-300 font-display italic"
                    style={{ fontSize: 13 }}
                    >
                    {byte === 32 ? '␣' : byteLabel(byte).slice(0, 3)}
                    </text>
                )}
                </g>
            );
            })}
        </svg>
        </div>
    );
    }