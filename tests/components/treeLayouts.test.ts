import { describe, it, expect } from 'vitest';
import { buildHuffmanSteps } from '../../src/components/algorithm/huffmanSteps';
import {
  geometryFor,
  lerpGeometry,
  nodeDepths,
  pointOnEdge,
} from '../../src/components/algorithm/treeLayouts';
import { buildCanonicalLengths, countFrequencies } from '../../src/core';
import { example1 } from '../../src/fixtures/sample';

const text = new TextEncoder().encode(
  'En un lugar de la Mancha, de cuyo nombre no quiero acordarme… ¿Quién? ¡Sí! 1605 — «fin»'.repeat(
    40
  )
);
const bookBuild = buildHuffmanSteps(countFrequencies(text));
const leaves = (build = bookBuild) => build.nodes.filter((n) => n.symbol !== null);

describe('nodeDepths', () => {
  it('la profundidad de cada hoja es la longitud de su código', () => {
    const depth = nodeDepths(bookBuild);
    const lengths = buildCanonicalLengths(countFrequencies(text));
    for (const leaf of leaves()) expect(depth[leaf.id]).toBe(lengths[leaf.symbol!]);
  });
});

describe('geometryFor', () => {
  it('construcción: todas las hojas en la misma fila', () => {
    const g = geometryFor(bookBuild, 'build');
    const ys = new Set(leaves().map((l) => g.y[l.id]));
    expect(ys.size).toBe(1);
  });

  it('por profundidad: cada nodo en el nivel de su profundidad', () => {
    const g = geometryFor(bookBuild, 'depth');
    const depth = nodeDepths(bookBuild);
    for (const node of bookBuild.nodes) expect(g.y[node.id]).toBe(depth[node.id] * 64);
  });

  it('radial: raíz al centro, anillos por profundidad y hojas sin encimarse', () => {
    const g = geometryFor(bookBuild, 'radial');
    const depth = nodeDepths(bookBuild);
    const root = bookBuild.root!;
    expect(Math.hypot(g.x[root], g.y[root])).toBeCloseTo(0);
    const ring = (id: number) => Math.hypot(g.x[id], g.y[id]) / depth[id];
    const ratios = leaves().map((l) => ring(l.id));
    for (const r of ratios) expect(r).toBeCloseTo(ratios[0], 6);

    const pts = leaves().map((l) => [g.x[l.id], g.y[l.id]]);
    let closest = Infinity;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        closest = Math.min(closest, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
      }
    }
    expect(closest).toBeGreaterThanOrEqual(42); // diámetro de una hoja
  });

  it('las curvas empiezan en el padre y terminan en el hijo', () => {
    const build = buildHuffmanSteps(example1.freqs);
    for (const view of ['build', 'radial', 'depth'] as const) {
      const g = geometryFor(build, view);
      for (const node of build.nodes) {
        if (node.parent === null) continue;
        const [sx, sy] = pointOnEdge(g, node.parent, node.id, 0);
        const [ex, ey] = pointOnEdge(g, node.parent, node.id, 1);
        expect([sx, sy]).toEqual([g.x[node.parent], g.y[node.parent]]);
        expect(ex).toBeCloseTo(g.x[node.id]);
        expect(ey).toBeCloseTo(g.y[node.id]);
      }
    }
  });
});

describe('lerpGeometry', () => {
  it('t = 0 y t = 1 devuelven cada extremo', () => {
    const a = geometryFor(bookBuild, 'build');
    const b = geometryFor(bookBuild, 'radial');
    expect(lerpGeometry(a, b, 0).x).toEqual(a.x);
    const end = lerpGeometry(a, b, 1);
    end.y.forEach((v, i) => expect(v).toBeCloseTo(b.y[i]));
  });
});
