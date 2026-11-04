import { describe, it, expect } from 'vitest';
import {
  bitsOf,
  buildHuffmanSteps,
  layoutDendrogram,
  leavesOf,
  pathAt,
  rootsAt,
} from '../../src/components/algorithm/huffmanSteps';
import { buildCanonicalLengths, countFrequencies } from '../../src/core';
import { example1, example2, example3 } from '../../src/fixtures/sample';

const encode = (text: string) => countFrequencies(new TextEncoder().encode(text));

describe('buildHuffmanSteps', () => {
  it('abracadabra: 5 hojas, 4 uniones y la raíz pesa 11', () => {
    const build = buildHuffmanSteps(example1.freqs);
    expect(build.steps).toHaveLength(4);
    expect(build.nodes[build.root!].weight).toBe(11);
    // La primera unión es la de los dos pesos más chicos: c (1) y d (1)
    const first = build.steps[0];
    expect([build.nodes[first.left].symbol, build.nodes[first.right].symbol]).toEqual([0x63, 0x64]);
  });

  it('la profundidad de cada hoja coincide con las longitudes de core/canonical', () => {
    for (const freqs of [
      example1.freqs,
      encode('el perro de san roque no tiene rabo'.repeat(30)),
    ]) {
      const build = buildHuffmanSteps(freqs);
      const expected = buildCanonicalLengths(freqs);
      for (const node of build.nodes) {
        if (node.symbol === null) continue;
        expect(pathAt(build, node.id, build.steps.length).length - 1).toBe(expected[node.symbol]);
      }
    }
  });

  it('un solo símbolo no tiene uniones; entrada vacía no tiene nodos', () => {
    const single = buildHuffmanSteps(example2.freqs);
    expect(single.steps).toHaveLength(0);
    expect(single.root).toBe(0);
    const empty = buildHuffmanSteps(example3.freqs);
    expect(empty.nodes).toHaveLength(0);
    expect(empty.root).toBeNull();
  });
});

describe('rootsAt / pathAt / bitsOf / leavesOf', () => {
  const build = buildHuffmanSteps(example1.freqs);

  it('el bosque se reduce en una raíz por paso', () => {
    for (let step = 0; step <= build.steps.length; step++) {
      expect(rootsAt(build, step)).toHaveLength(5 - step);
    }
    expect(rootsAt(build, build.steps.length)).toEqual([build.root]);
  });

  it('las raíces salen ordenadas como las toma el algoritmo', () => {
    const roots = rootsAt(build, 0).map((id) => build.nodes[id].weight);
    expect(roots).toEqual([...roots].sort((a, b) => a - b));
    const next = build.steps[0];
    expect(rootsAt(build, 0).slice(0, 2)).toEqual([next.left, next.right]);
  });

  it('el camino solo usa nodos ya creados', () => {
    const leaf = build.steps[0].left;
    expect(pathAt(build, leaf, 0)).toEqual([leaf]);
    expect(pathAt(build, leaf, 1)).toEqual([build.steps[0].parent, leaf]);
    expect(bitsOf(build, pathAt(build, leaf, 1))).toBe('0');
  });

  it('leavesOf devuelve todos los bytes de la raíz', () => {
    expect(leavesOf(build, build.root!).sort((a, b) => a - b)).toEqual([
      0x61, 0x62, 0x63, 0x64, 0x72,
    ]);
  });
});

describe('layoutDendrogram', () => {
  it('hojas en la fila de abajo y cada padre sobre el centro de sus hijos', () => {
    const build = buildHuffmanSteps(example1.freqs);
    const layout = layoutDendrogram(build, 50, 60, 10);
    const leaves = build.nodes.filter((n) => n.symbol !== null);
    const bottom = layout.y[leaves[0].id];
    for (const leaf of leaves) expect(layout.y[leaf.id]).toBe(bottom);
    for (const step of build.steps) {
      expect(layout.x[step.parent]).toBe((layout.x[step.left] + layout.x[step.right]) / 2);
      expect(layout.y[step.parent]).toBeLessThan(
        Math.min(layout.y[step.left], layout.y[step.right])
      );
    }
    expect(layout.width).toBe(10 * 2 + 4 * 50);
  });
});
