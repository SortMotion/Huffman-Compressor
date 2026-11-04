import { layoutDendrogram, type HuffmanBuild } from './huffmanSteps';

export type TreeView = 'build' | 'radial' | 'depth';

/**
 * Posición de cada nodo y, por cada nodo que no es raíz, los dos puntos de control de
 * la curva que lo une con su padre (índice = id del hijo).
 */
export interface TreeGeometry {
  x: number[];
  y: number[];
  c1x: number[];
  c1y: number[];
  c2x: number[];
  c2y: number[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const GAP = 52;
const LEVEL = 64;
/** Separación entre anillos del árbol radial. */
const RING = 110;
/** Arco mínimo por hoja en el árbol radial (diámetro de la hoja + aire). */
const LEAF_ARC = 54;

/** Distancia de cada nodo a la raíz del árbol final (= longitud de su código). */
export function nodeDepths(build: HuffmanBuild): number[] {
  const depth = new Array<number>(build.nodes.length).fill(0);
  if (build.root === null) return depth;
  const stack: [number, number][] = [[build.root, 0]];
  while (stack.length) {
    const [id, d] = stack.pop()!;
    depth[id] = d;
    const node = build.nodes[id];
    if (node.left !== null) stack.push([node.left, d + 1]);
    if (node.right !== null) stack.push([node.right, d + 1]);
  }
  return depth;
}

/** Hojas de izquierda a derecha (el mismo orden en las tres formas). */
function leafOrder(build: HuffmanBuild): number[] {
  const order: number[] = [];
  const visit = (id: number) => {
    const node = build.nodes[id];
    if (node.symbol !== null) order.push(id);
    else {
      visit(node.left!);
      visit(node.right!);
    }
  };
  if (build.root !== null) visit(build.root);
  return order;
}

function emptyGeometry(n: number): TreeGeometry {
  const zeros = () => new Array<number>(n).fill(0);
  return {
    x: zeros(),
    y: zeros(),
    c1x: zeros(),
    c1y: zeros(),
    c2x: zeros(),
    c2y: zeros(),
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
  };
}

/** Curvas verticales suaves: salen hacia abajo del padre y llegan desde arriba al hijo. */
function verticalCurves(build: HuffmanBuild, g: TreeGeometry): void {
  for (const node of build.nodes) {
    if (node.parent === null) continue;
    const mid = (g.y[node.parent] + g.y[node.id]) / 2;
    g.c1x[node.id] = g.x[node.parent];
    g.c1y[node.id] = mid;
    g.c2x[node.id] = g.x[node.id];
    g.c2y[node.id] = mid;
  }
}

function withBounds(g: TreeGeometry): TreeGeometry {
  if (g.x.length === 0) return g;
  g.minX = Math.min(...g.x);
  g.maxX = Math.max(...g.x);
  g.minY = Math.min(...g.y);
  g.maxY = Math.max(...g.y);
  return g;
}

/** Dendrograma de la construcción: hojas abajo y cada unión a la altura de su paso. */
function buildGeometry(build: HuffmanBuild): TreeGeometry {
  const layout = layoutDendrogram(build, GAP, LEVEL, 0);
  const g = emptyGeometry(build.nodes.length);
  g.x = layout.x;
  g.y = layout.y;
  verticalCurves(build, g);
  return withBounds(g);
}

/** Árbol clásico: cada nodo en el nivel de su profundidad (la longitud del código). */
function depthGeometry(build: HuffmanBuild, depth: number[]): TreeGeometry {
  const layout = layoutDendrogram(build, GAP, LEVEL, 0);
  const g = emptyGeometry(build.nodes.length);
  g.x = layout.x;
  g.y = depth.map((d) => d * LEVEL);
  verticalCurves(build, g);
  return withBounds(g);
}

/**
 * Árbol radial: la raíz al centro y cada nodo en el anillo de su profundidad. Cada hoja
 * recibe un ángulo inversamente proporcional a su radio, para que las hojas de anillos
 * interiores (las frecuentes) no se encimen.
 */
function radialGeometry(build: HuffmanBuild, depth: number[]): TreeGeometry {
  const g = emptyGeometry(build.nodes.length);
  const leaves = leafOrder(build);
  const angle = new Array<number>(build.nodes.length).fill(0);
  const radius = depth.map((d) => d * RING);

  // Radio de los anillos: el mínimo que deja a cada hoja al menos LEAF_ARC de arco
  const needed = leaves.reduce((sum, id) => sum + LEAF_ARC / Math.max(1, depth[id]), 0);
  const scale = Math.max(1, needed / (2 * Math.PI * RING));
  for (let i = 0; i < radius.length; i++) radius[i] *= scale;

  const weights = leaves.map((id) => 1 / Math.max(1, depth[id]));
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  let cursor = -Math.PI / 2;
  leaves.forEach((id, i) => {
    const share = (weights[i] / totalWeight) * 2 * Math.PI;
    angle[id] = cursor + share / 2;
    cursor += share;
  });

  // Nodos internos: ángulo promedio de sus hijos (de abajo hacia arriba)
  const order = [...build.nodes].sort((a, b) => a.height - b.height);
  for (const node of order) {
    if (node.symbol !== null) continue;
    angle[node.id] = (angle[node.left!] + angle[node.right!]) / 2;
  }

  const polar = (a: number, r: number): [number, number] => [Math.cos(a) * r, Math.sin(a) * r];
  for (const node of build.nodes) {
    [g.x[node.id], g.y[node.id]] = polar(angle[node.id], radius[node.id]);
    if (node.parent === null) continue;
    // Como d3.linkRadial: controles a medio radio, en el ángulo del padre y del hijo
    const mid = (radius[node.parent] + radius[node.id]) / 2;
    [g.c1x[node.id], g.c1y[node.id]] = polar(angle[node.parent], mid);
    [g.c2x[node.id], g.c2y[node.id]] = polar(angle[node.id], mid);
  }
  return withBounds(g);
}

export function geometryFor(build: HuffmanBuild, view: TreeView): TreeGeometry {
  if (build.root === null) return emptyGeometry(0);
  if (view === 'build') return buildGeometry(build);
  const depth = nodeDepths(build);
  return view === 'radial' ? radialGeometry(build, depth) : depthGeometry(build, depth);
}

/** Interpola dos geometrías del mismo árbol (t entre 0 y 1). */
export function lerpGeometry(a: TreeGeometry, b: TreeGeometry, t: number): TreeGeometry {
  const mix = (p: number[], q: number[]) => p.map((v, i) => v + (q[i] - v) * t);
  const m = (p: number, q: number) => p + (q - p) * t;
  return {
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    c1x: mix(a.c1x, b.c1x),
    c1y: mix(a.c1y, b.c1y),
    c2x: mix(a.c2x, b.c2x),
    c2y: mix(a.c2y, b.c2y),
    minX: m(a.minX, b.minX),
    maxX: m(a.maxX, b.maxX),
    minY: m(a.minY, b.minY),
    maxY: m(a.maxY, b.maxY),
  };
}

/** Punto de la curva cúbica padre → hijo en t (para colocar la etiqueta 0/1). */
export function pointOnEdge(
  g: TreeGeometry,
  parent: number,
  child: number,
  t: number
): [number, number] {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * g.x[parent] + b * g.c1x[child] + c * g.c2x[child] + d * g.x[child],
    a * g.y[parent] + b * g.c1y[child] + c * g.c2y[child] + d * g.y[child],
  ];
}
