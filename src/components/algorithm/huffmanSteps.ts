import type { FrequencyTable } from '../../contracts/types';

export interface BuildNode {
  id: number;
  weight: number;
  /** Byte de la hoja; `null` en nodos internos. */
  symbol: number | null;
  left: number | null;
  right: number | null;
  parent: number | null;
  /** Menor byte del subárbol: desempata nodos con el mismo peso. */
  minSymbol: number;
  /** 0 en las hojas; 1 + la mayor altura de los hijos en los nodos internos. */
  height: number;
  /** Paso en el que aparece el nodo (0 = las hojas, desde el inicio). */
  createdAt: number;
}

export interface MergeStep {
  left: number;
  right: number;
  parent: number;
}

export interface HuffmanBuild {
  nodes: BuildNode[];
  steps: MergeStep[];
  root: number | null;
}

/**
 * Repite el algoritmo de Huffman de `core/canonical.ts` registrando cada unión:
 * en cada paso se ordenan las raíces por (peso, menor byte) y se unen las dos primeras.
 */
export function buildHuffmanSteps(freqs: FrequencyTable): HuffmanBuild {
  const nodes: BuildNode[] = [];
  for (let symbol = 0; symbol < freqs.length; symbol++) {
    if (freqs[symbol] === 0) continue;
    nodes.push({
      id: nodes.length,
      weight: freqs[symbol],
      symbol,
      left: null,
      right: null,
      parent: null,
      minSymbol: symbol,
      height: 0,
      createdAt: 0,
    });
  }
  if (nodes.length === 0) return { nodes, steps: [], root: null };

  const byOrder = (a: number, b: number) =>
    nodes[a].weight - nodes[b].weight || nodes[a].minSymbol - nodes[b].minSymbol;

  let queue = nodes.map((n) => n.id);
  const steps: MergeStep[] = [];
  while (queue.length > 1) {
    queue.sort(byOrder);
    const [left, right] = queue;
    const parent: BuildNode = {
      id: nodes.length,
      weight: nodes[left].weight + nodes[right].weight,
      symbol: null,
      left,
      right,
      parent: null,
      minSymbol: Math.min(nodes[left].minSymbol, nodes[right].minSymbol),
      height: Math.max(nodes[left].height, nodes[right].height) + 1,
      createdAt: steps.length + 1,
    };
    nodes.push(parent);
    nodes[left].parent = parent.id;
    nodes[right].parent = parent.id;
    steps.push({ left, right, parent: parent.id });
    queue = [...queue.slice(2), parent.id];
  }
  return { nodes, steps, root: queue[0] };
}

/** Raíces del bosque después de `step` uniones, en el orden en que el algoritmo las toma. */
export function rootsAt(build: HuffmanBuild, step: number): number[] {
  return build.nodes
    .filter(
      (n) => n.createdAt <= step && (n.parent === null || build.nodes[n.parent].createdAt > step)
    )
    .sort((a, b) => a.weight - b.weight || a.minSymbol - b.minSymbol)
    .map((n) => n.id);
}

/** Camino de bits desde la raíz más alta ya creada hasta el nodo (izquierda = 0). */
export function pathAt(build: HuffmanBuild, id: number, step: number): number[] {
  const path = [id];
  let current = build.nodes[id];
  while (current.parent !== null && build.nodes[current.parent].createdAt <= step) {
    current = build.nodes[current.parent];
    path.unshift(current.id);
  }
  return path;
}

export function bitsOf(build: HuffmanBuild, path: number[]): string {
  let bits = '';
  for (let i = 1; i < path.length; i++) {
    bits += build.nodes[path[i - 1]].left === path[i] ? '0' : '1';
  }
  return bits;
}

/** Bytes de las hojas de un subárbol, de izquierda a derecha. */
export function leavesOf(build: HuffmanBuild, id: number): number[] {
  const node = build.nodes[id];
  if (node.symbol !== null) return [node.symbol];
  return [...leavesOf(build, node.left!), ...leavesOf(build, node.right!)];
}

export interface DendrogramLayout {
  x: number[];
  y: number[];
  width: number;
  height: number;
}

/**
 * Dendrograma: todas las hojas en la fila de abajo, en el orden de izquierda a derecha
 * del árbol final, y cada nodo interno sobre el centro de sus hijos a la altura de su
 * nivel. Así ningún nodo cambia de lugar mientras se construye el árbol.
 */
export function layoutDendrogram(
  build: HuffmanBuild,
  gap = 52,
  level = 64,
  padding = 56
): DendrogramLayout {
  const { nodes, root } = build;
  const x = new Array<number>(nodes.length).fill(0);
  const y = new Array<number>(nodes.length).fill(0);
  if (root === null) return { x, y, width: 0, height: 0 };

  const maxHeight = nodes[root].height;
  let column = 0;
  const place = (id: number) => {
    const node = nodes[id];
    if (node.symbol === null) {
      place(node.left!);
      place(node.right!);
      x[id] = (x[node.left!] + x[node.right!]) / 2;
    } else {
      x[id] = padding + column * gap;
      column++;
    }
    y[id] = padding + (maxHeight - node.height) * level;
  };
  place(root);

  return {
    x,
    y,
    width: padding * 2 + Math.max(0, column - 1) * gap,
    height: padding * 2 + maxHeight * level,
  };
}
