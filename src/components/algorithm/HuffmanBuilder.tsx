import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { byteHex, byteLabel, formatNumber } from '../../app/utils';
import { MAX_CODE_LENGTH } from '../../contracts/constants';
import type { CodeTable, FrequencyTable } from '../../contracts/types';
import {
  bitsOf,
  buildHuffmanSteps,
  layoutDendrogram,
  leavesOf,
  pathAt,
  rootsAt,
  type HuffmanBuild,
} from './huffmanSteps';

interface Camera {
  k: number;
  tx: number;
  ty: number;
}

const SPEEDS = [0.5, 1, 2, 4];
const STEP_MS = 1100;
const MIN_ZOOM = 0.12;
const MAX_ZOOM = 2.5;
const FOLLOW_ZOOM = 1;
const QUEUE_PREVIEW = 12;
const LEAF_R = 21;
const NODE_R = 17;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** 1234 → "1.2k", 448885 → "449k". */
function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1e6) return `${(n / 1e3).toFixed(n < 1e4 ? 1 : 0)}k`;
  return `${(n / 1e6).toFixed(1)}M`;
}

/** Etiqueta corta para dibujar dentro de una hoja; los bytes no imprimibles van en hex. */
function glyph(byte: number): string {
  if (byte === 32) return '␣';
  const label = byteLabel(byte);
  return label === '·' ? byte.toString(16).toUpperCase().padStart(2, '0') : label;
}

function nodeName(build: HuffmanBuild, id: number): string {
  const node = build.nodes[id];
  if (node.symbol !== null) return `«${glyph(node.symbol)}»`;
  const leaves = leavesOf(build, id);
  const shown = leaves.slice(0, 3).map(glyph).join(' ');
  return `{${shown}${leaves.length > 3 ? ' …' : ''}}`;
}

function zoomAt(cam: Camera, px: number, py: number, factor: number): Camera {
  const k = clamp(cam.k * factor, MIN_ZOOM, MAX_ZOOM);
  const ratio = k / cam.k;
  return { k, tx: px - (px - cam.tx) * ratio, ty: py - (py - cam.ty) * ratio };
}

interface HuffmanBuilderProps {
  freqs: FrequencyTable;
  /** Códigos canónicos finales (los del .ycoma) para compararlos con los del árbol. */
  codes: CodeTable;
}

/**
 * Animación de la construcción de Huffman: las hojas empiezan sueltas y en cada paso
 * se unen las dos raíces de menor peso, hasta que queda una sola.
 */
export function HuffmanBuilder({ freqs, codes }: HuffmanBuilderProps) {
  const build = useMemo(() => buildHuffmanSteps(freqs), [freqs]);
  const layout = useMemo(() => layoutDendrogram(build), [build]);
  const total = build.steps.length;

  const [rawStep, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [manual, setManual] = useState<Camera | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; cam: Camera; moved: boolean } | null>(null);
  const camRef = useRef<Camera>({ k: 1, tx: 0, ty: 0 });

  // Si cambian las frecuencias, el paso guardado puede quedar fuera de rango
  const step = Math.min(rawStep, total);
  const focus = hovered ?? selected;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      setStep((s) => Math.min(s + 1, total));
      if (step + 1 >= total) setPlaying(false);
    }, STEP_MS / speed);
    return () => clearTimeout(timer);
  }, [playing, step, speed, total]);

  const fit = useMemo<Camera>(() => {
    if (!size.w || !layout.width) return { k: 1, tx: 0, ty: 0 };
    const k = clamp(Math.min(size.w / layout.width, size.h / layout.height), MIN_ZOOM, 1.2);
    return { k, tx: (size.w - layout.width * k) / 2, ty: (size.h - layout.height * k) / 2 };
  }, [size, layout]);

  // Cámara automática: al inicio, la primera pareja que se va a unir; luego, la última
  // unión; al final, todo el árbol
  const follow = useMemo<Camera>(() => {
    if (step >= total || !size.w) return fit;
    const k = Math.max(fit.k, FOLLOW_ZOOM);
    let cx: number;
    let cy: number;
    if (step === 0) {
      const { left, right } = build.steps[0];
      cx = (layout.x[left] + layout.x[right]) / 2;
      cy = layout.y[left] - 60;
    } else {
      const { parent } = build.steps[step - 1];
      cx = layout.x[parent];
      cy = layout.y[parent] + 40;
    }
    return { k, tx: size.w / 2 - cx * k, ty: size.h / 2 - cy * k };
  }, [step, total, size, fit, build, layout]);

  const cam = manual ?? follow;

  useEffect(() => {
    camRef.current = cam;
  }, [cam]);

  // Ctrl/Cmd + rueda (o pellizcar en el trackpad) hace zoom en el punto del cursor
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      setManual(
        zoomAt(
          camRef.current,
          event.clientX - rect.left,
          event.clientY - rect.top,
          Math.exp(-event.deltaY * 0.002)
        )
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const roots = useMemo(() => rootsAt(build, step), [build, step]);
  const next = step < total ? build.steps[step] : null;
  const latest = step > 0 ? build.steps[step - 1] : null;
  const path = useMemo(
    () => (focus === null || build.nodes[focus].createdAt > step ? [] : pathAt(build, focus, step)),
    [build, focus, step]
  );
  const onPath = useMemo(() => new Set(path), [path]);
  const overLimit = useMemo(
    () =>
      build.nodes.filter(
        (n) => n.symbol !== null && pathAt(build, n.id, total).length - 1 > MAX_CODE_LENGTH
      ).length,
    [build, total]
  );

  if (build.root === null) return null;

  function go(target: number) {
    setPlaying(false);
    setStep(clamp(target, 0, total));
  }

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (step >= total) setStep(0);
    setManual(null);
    setPlaying(true);
  }

  function zoomButton(factor: number) {
    setManual(zoomAt(cam, size.w / 2, size.h / 2, factor));
  }

  /** Selecciona un nodo y lleva la cámara hasta él. */
  function focusOn(id: number) {
    setSelected(id);
    const k = Math.max(cam.k, FOLLOW_ZOOM);
    setManual({ k, tx: size.w / 2 - layout.x[id] * k, ty: size.h / 2 - layout.y[id] * k });
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, cam, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 4) return;
    start.moved = true;
    setDragging(true);
    setManual({ k: start.cam.k, tx: start.cam.tx + dx, ty: start.cam.ty + dy });
  }

  function onPointerUp() {
    drag.current = null;
    setDragging(false);
  }

  const visible = build.nodes.filter((n) => n.createdAt <= step);
  const { x, y } = layout;
  const dim = focus !== null && path.length > 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_19rem]">
      <div className="min-w-0 space-y-4">
        <div
          ref={box}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`relative h-[26rem] touch-none select-none overflow-hidden rounded-2xl border border-white/[0.06] bg-black/30 sm:h-[34rem] ${
            dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label="Construcción del árbol de Huffman"
          >
            <defs>
              <radialGradient id="hb-leaf" cx="35%" cy="30%" r="80%">
                <stop offset="0" stopColor="#fff7ed" />
                <stop offset="0.45" stopColor="#f0abfc" />
                <stop offset="1" stopColor="#6366f1" />
              </radialGradient>
              <filter id="hb-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>
            <g
              style={{
                transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.k})`,
                transformOrigin: '0 0',
                transition: dragging ? 'none' : 'transform 650ms cubic-bezier(.2,.7,.2,1)',
              }}
            >
              {/* Ramas: horizontal a la altura del padre y vertical hasta el hijo */}
              {visible.map((p) => {
                if (p.symbol !== null) return null;
                const fresh = p.createdAt === step && step > 0;
                return [p.left!, p.right!].map((child, bit) => {
                  const highlighted = onPath.has(p.id) && onPath.has(child);
                  return (
                    <g key={`${p.id}-${child}`}>
                      <path
                        d={`M${x[p.id]},${y[p.id]} H${x[child]} V${y[child]}`}
                        fill="none"
                        stroke={bit === 0 ? '#a5b4fc' : '#f0abfc'}
                        strokeOpacity={highlighted ? 1 : dim ? 0.18 : 0.6}
                        strokeWidth={highlighted ? 3.5 : 1.8}
                        strokeLinejoin="round"
                        pathLength={1}
                        strokeDasharray={fresh ? 1 : undefined}
                        style={fresh ? { animation: 'draw 0.7s ease-out both' } : undefined}
                      />
                      <text
                        x={x[child] + (bit === 0 ? -7 : 7)}
                        y={(y[p.id] + y[child]) / 2 + 4}
                        textAnchor={bit === 0 ? 'end' : 'start'}
                        className="font-mono"
                        fill={bit === 0 ? '#c7d2fe' : '#f5d0fe'}
                        opacity={dim && !highlighted ? 0.25 : 0.9}
                        style={{ fontSize: 12 }}
                      >
                        {bit}
                      </text>
                    </g>
                  );
                });
              })}

              {visible.map((node) => {
                const cx = x[node.id];
                const cy = y[node.id];
                const isLeaf = node.symbol !== null;
                const fresh = node.createdAt === step && step > 0;
                const isNext = next !== null && (next.left === node.id || next.right === node.id);
                const isRoot = roots.includes(node.id);
                const faded = dim && !onPath.has(node.id);
                const r = isLeaf ? LEAF_R : NODE_R;
                const label = isLeaf ? glyph(node.symbol!) : compact(node.weight);
                return (
                  <g
                    key={node.id}
                    opacity={faded ? 0.3 : 1}
                    className="cursor-pointer"
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(node.id)}
                    onPointerLeave={() => setHovered(null)}
                    onClick={() => !dragging && setSelected(selected === node.id ? null : node.id)}
                  >
                    <title>
                      {isLeaf
                        ? `${byteLabel(node.symbol!)} (${byteHex(node.symbol!)}) · ${formatNumber(node.weight)} veces`
                        : `Nodo de peso ${formatNumber(node.weight)}`}
                    </title>
                    <g
                      style={
                        fresh
                          ? {
                              transformBox: 'fill-box',
                              transformOrigin: 'center',
                              animation: 'pop 0.55s cubic-bezier(.2,.8,.2,1.3) both',
                            }
                          : undefined
                      }
                    >
                      {(fresh || latest?.parent === node.id) && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r + 6}
                          fill="#e879f9"
                          opacity={0.45}
                          filter="url(#hb-glow)"
                        />
                      )}
                      {isNext && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r + 7}
                          fill="none"
                          stroke="#fcd34d"
                          strokeWidth={2.5}
                          strokeDasharray="5 4"
                          className="animate-pulse-soft"
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={isLeaf ? 'url(#hb-leaf)' : '#0e0c16'}
                        stroke={
                          onPath.has(node.id)
                            ? '#fcd34d'
                            : isLeaf
                              ? 'rgb(255 255 255 / 0.5)'
                              : isRoot
                                ? '#e879f9'
                                : 'rgb(255 255 255 / 0.35)'
                        }
                        strokeWidth={onPath.has(node.id) ? 3 : isRoot && !isLeaf ? 2 : 1.2}
                      />
                      <text
                        x={cx}
                        y={cy + (isLeaf ? 6 : 4)}
                        textAnchor="middle"
                        className={isLeaf ? 'font-display italic' : 'font-mono'}
                        fill={isLeaf ? '#1e1b4b' : '#f4f4f5'}
                        style={{
                          fontSize: isLeaf ? (label.length > 2 ? 11 : 19) : 11,
                          fontWeight: isLeaf ? 600 : 500,
                        }}
                      >
                        {label}
                      </text>
                      {isLeaf && (
                        <text
                          x={cx}
                          y={cy + r + 16}
                          textAnchor="middle"
                          className="font-mono"
                          fill="#a1a1aa"
                          style={{ fontSize: 11 }}
                        >
                          {compact(node.weight)}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          <div
            className="absolute right-3 top-3 flex flex-col gap-1.5"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <CanvasButton label="Acercar" onClick={() => zoomButton(1.3)}>
              +
            </CanvasButton>
            <CanvasButton label="Alejar" onClick={() => zoomButton(1 / 1.3)}>
              −
            </CanvasButton>
            <CanvasButton label="Ver todo el árbol" onClick={() => setManual(fit)}>
              ⤢
            </CanvasButton>
            <CanvasButton
              label="Seguir cada paso"
              active={manual === null}
              onClick={() => setManual(null)}
            >
              ◎
            </CanvasButton>
          </div>
          <p className="pointer-events-none absolute bottom-2 left-3 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-zinc-600">
            Arrastra para mover · Ctrl + rueda para zoom · toca un nodo
          </p>
        </div>

        <Controls
          step={step}
          total={total}
          playing={playing}
          speed={speed}
          onPlay={togglePlay}
          onGo={go}
          onSpeed={setSpeed}
        />
      </div>

      <aside className="space-y-4">
        <div
          aria-live="polite"
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
        >
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-fuchsia-300/80">
            {total === 0 ? 'Un solo símbolo' : `Paso ${step} de ${total}`}
          </p>
          <p className="mt-2 font-display text-xl leading-snug text-white">
            {total === 0
              ? 'Con un solo símbolo no hay nada que unir: su código es 0.'
              : step === 0
                ? `${roots.length} hojas sueltas, una por símbolo. En cada paso se unen las dos de menor peso.`
                : step < total && latest
                  ? `Se unieron ${nodeName(build, latest.left)} y ${nodeName(build, latest.right)}: ${formatNumber(build.nodes[latest.left].weight)} + ${formatNumber(build.nodes[latest.right].weight)} = ${formatNumber(build.nodes[latest.parent].weight)}.`
                  : `Árbol terminado. La raíz pesa ${formatNumber(build.nodes[build.root].weight)}: el tamaño del archivo en bytes.`}
          </p>
          {next && (
            <p className="mt-2 text-sm text-amber-200/90">
              Siguiente: {nodeName(build, next.left)} ({formatNumber(build.nodes[next.left].weight)}
              ) + {nodeName(build, next.right)} ({formatNumber(build.nodes[next.right].weight)})
            </p>
          )}
          {step === total && total > 0 && (
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              La profundidad de cada hoja es la longitud de su código. El .ycoma conserva esas
              longitudes y reasigna los códigos en orden canónico.
              {overLimit > 0 &&
                ` ${overLimit} símbolos quedaron a más de ${MAX_CODE_LENGTH} niveles; el formato los ajusta a ${MAX_CODE_LENGTH} bits.`}
            </p>
          )}
        </div>

        {focus !== null && path.length > 0 && (
          <FocusCard build={build} id={focus} path={path} codes={codes} complete={step === total} />
        )}

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
            Cola de prioridad · {roots.length} {roots.length === 1 ? 'raíz' : 'raíces'}
          </p>
          <ol className="mt-3 space-y-1">
            {roots.slice(0, QUEUE_PREVIEW).map((id, index) => {
              const upcoming = next !== null && index < 2;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => focusOn(id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                      upcoming
                        ? 'bg-amber-300/10 text-amber-100 ring-1 ring-amber-300/40'
                        : 'text-zinc-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="w-5 font-mono text-[0.65rem] text-zinc-500">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-display text-base italic">
                      {nodeName(build, id)}
                    </span>
                    <span className="font-mono text-xs tabular-nums">
                      {formatNumber(build.nodes[id].weight)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {roots.length > QUEUE_PREVIEW && (
            <p className="mt-2 px-2.5 text-xs text-zinc-500">
              y {roots.length - QUEUE_PREVIEW} más, de mayor peso
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function CanvasButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-xl border text-lg backdrop-blur transition-colors ${
        active
          ? 'border-fuchsia-300/60 bg-fuchsia-400/20 text-white'
          : 'border-white/10 bg-ink/70 text-zinc-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

interface ControlsProps {
  step: number;
  total: number;
  playing: boolean;
  speed: number;
  onPlay: () => void;
  onGo: (step: number) => void;
  onSpeed: (speed: number) => void;
}

function Controls({ step, total, playing, speed, onPlay, onGo, onSpeed }: ControlsProps) {
  if (total === 0) return null;
  const control =
    'grid size-10 place-items-center rounded-full border border-white/10 text-zinc-300 transition-colors hover:border-white/25 hover:text-white disabled:opacity-30';
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={control}
          onClick={() => onGo(0)}
          disabled={step === 0}
          aria-label="Al inicio"
        >
          ⏮
        </button>
        <button
          type="button"
          className={control}
          onClick={() => onGo(step - 1)}
          disabled={step === 0}
          aria-label="Paso anterior"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={onPlay}
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          className="bg-brand grid size-12 place-items-center rounded-full text-lg text-white shadow-[0_8px_30px_-8px_rgb(168_85_247/0.8)]"
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          className={control}
          onClick={() => onGo(step + 1)}
          disabled={step === total}
          aria-label="Paso siguiente"
        >
          ▶
        </button>
        <button
          type="button"
          className={control}
          onClick={() => onGo(total)}
          disabled={step === total}
          aria-label="Al final"
        >
          ⏭
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={total}
        value={step}
        onChange={(e) => onGo(Number(e.target.value))}
        aria-label="Paso de la construcción"
        className="min-w-40 flex-1 accent-fuchsia-400"
      />
      <div
        className="flex rounded-full border border-white/10 p-0.5"
        role="group"
        aria-label="Velocidad"
      >
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeed(s)}
            aria-pressed={speed === s}
            className={`rounded-full px-2.5 py-1 font-mono text-xs transition-colors ${
              speed === s ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

interface FocusCardProps {
  build: HuffmanBuild;
  id: number;
  path: number[];
  codes: CodeTable;
  complete: boolean;
}

function FocusCard({ build, id, path, codes, complete }: FocusCardProps) {
  const node = build.nodes[id];
  const bits = bitsOf(build, path);
  const canonical = node.symbol !== null ? codes[node.symbol] : undefined;
  return (
    <div className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.05] p-4 text-sm">
      <p className="font-display text-2xl italic text-white">
        {node.symbol !== null ? glyph(node.symbol) : `Nodo ${compact(node.weight)}`}
        {node.symbol !== null && (
          <span className="ml-2 font-mono text-xs not-italic text-zinc-500">
            {byteHex(node.symbol)}
          </span>
        )}
      </p>
      <dl className="mt-2 space-y-1 text-zinc-300">
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">{node.symbol !== null ? 'Frecuencia' : 'Peso'}</dt>
          <dd className="font-mono">{formatNumber(node.weight)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">
            {complete ? 'Camino en este árbol' : 'Camino hasta ahora'}
          </dt>
          <dd className="break-all font-mono text-amber-200">{bits || '—'}</dd>
        </div>
        {complete && canonical !== undefined && (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Código en el .ycoma</dt>
            <dd className="break-all font-mono text-fuchsia-200">
              {canonical} <span className="text-zinc-500">({canonical.length} bits)</span>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
