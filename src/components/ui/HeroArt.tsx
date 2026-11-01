interface Point {
  x: number;
  y: number;
}

interface Leaf extends Point {
  char: string;
  code: string;
}

// Un árbol de Huffman pequeño, dibujado a mano para la portada
const ROOT: Point = { x: 210, y: 34 };
const INNER: Record<string, Point> = {
  '0': { x: 110, y: 104 },
  '1': { x: 310, y: 104 },
  '01': { x: 160, y: 174 },
  '10': { x: 260, y: 174 },
  '101': { x: 292, y: 244 },
};
const LEAVES: Leaf[] = [
  { char: '␣', code: '00', x: 58, y: 174 },
  { char: 'e', code: '11', x: 362, y: 174 },
  { char: 't', code: '010', x: 128, y: 244 },
  { char: 'a', code: '011', x: 192, y: 244 },
  { char: 'o', code: '100', x: 228, y: 244 },
  { char: 'n', code: '1010', x: 262, y: 314 },
  { char: 'h', code: '1011', x: 322, y: 314 },
];

function pointOf(code: string): Point {
  if (code === '') return ROOT;
  return INNER[code] ?? LEAVES.find((leaf) => leaf.code === code)!;
}

/** Todas las aristas (padre → hijo) con el bit de la rama. */
const EDGES = [...Object.keys(INNER), ...LEAVES.map((l) => l.code)].map((code) => ({
  from: pointOf(code.slice(0, -1)),
  to: pointOf(code),
  bit: code.at(-1)!,
  depth: code.length,
}));

const BITS = '0110100111010010110100101101001110100101';

/** Ilustración decorativa: un árbol de Huffman luminoso con bits que fluyen por las ramas. */
export function HeroArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 350"
      className={className}
      role="img"
      aria-label="Árbol de Huffman: los caracteres más frecuentes quedan cerca de la raíz"
    >
      <defs>
        <linearGradient id="hero-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="0.5" stopColor="#e879f9" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
        <radialGradient id="hero-leaf" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fdf4ff" />
          <stop offset="0.35" stopColor="#e879f9" />
          <stop offset="1" stopColor="#4f46e5" />
        </radialGradient>
        <filter id="hero-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Bits de fondo */}
      {[0, 1, 2].map((row) => (
        <text
          key={row}
          x={row % 2 ? -40 : 0}
          y={70 + row * 110}
          className="animate-pulse-soft fill-white/6 font-mono"
          style={{ animationDelay: `${row * 0.9}s`, fontSize: 22, letterSpacing: 6 }}
        >
          {BITS}
        </text>
      ))}

      {EDGES.map(({ from, to, bit, depth }) => (
        <g key={`${to.x}-${to.y}`}>
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="url(#hero-edge)"
            strokeOpacity={0.35}
            strokeWidth={1.2}
          />
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="url(#hero-edge)"
            strokeWidth={1.6}
            strokeDasharray="2 10"
            strokeLinecap="round"
            className="animate-flow"
            style={{ animationDelay: `${-depth * 0.4}s` }}
          />
          <text
            x={(from.x + to.x) / 2 + (bit === '0' ? -12 : 8)}
            y={(from.y + to.y) / 2 - 2}
            className="fill-zinc-500 font-mono"
            style={{ fontSize: 11 }}
          >
            {bit}
          </text>
        </g>
      ))}

      {[ROOT, ...Object.values(INNER)].map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={4.5} className="fill-zinc-200" />
      ))}

      {LEAVES.map((leaf, i) => (
        <g key={leaf.code} filter="url(#hero-glow)">
          <circle
            cx={leaf.x}
            cy={leaf.y}
            r={19 - leaf.code.length * 2}
            fill="url(#hero-leaf)"
            className="animate-pulse-soft"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
          <text
            x={leaf.x}
            y={leaf.y + 6}
            textAnchor="middle"
            className="fill-white font-display italic"
            style={{ fontSize: 20 - leaf.code.length }}
          >
            {leaf.char}
          </text>
          <text
            x={leaf.x}
            y={leaf.y + 36 - leaf.code.length * 2}
            textAnchor="middle"
            className="fill-amber-200/80 font-mono"
            style={{ fontSize: 10 }}
          >
            {leaf.code}
          </text>
        </g>
      ))}
    </svg>
  );
}
