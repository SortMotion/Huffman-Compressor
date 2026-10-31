import { describe, it, expect } from 'vitest';
import { canVisit, initialState, reducer, type AppState } from '../../src/app/reducer';
import type { CompressResult, InspectResult } from '../../src/contracts/types';

const source = { name: 'a.txt', bytes: new Uint8Array([97, 97]), origin: 'file' as const };
const archive = { name: 'a.txt.ycoma', bytes: new Uint8Array([1]), origin: 'file' as const };

function run(...actions: Parameters<typeof reducer>[1][]): AppState {
  return actions.reduce(reducer, initialState);
}

describe('reducer', () => {
  it('flujo de compresión: IDLE → ANALYZING → ANALYZED → COMPRESSING → COMPRESSED', () => {
    let state = run({ type: 'SOURCE_LOADED', file: source });
    expect(state).toMatchObject({ screen: 'analyze', status: 'idle', source });

    state = reducer(state, { type: 'ANALYZE_START' });
    expect(state.status).toBe('analyzing');

    const freqs = new Uint32Array(256);
    state = reducer(state, { type: 'ANALYZE_DONE', freqs });
    expect(state).toMatchObject({ status: 'analyzed', freqs });

    state = reducer(state, { type: 'COMPRESS_START' });
    expect(state.status).toBe('compressing');

    const result = { file: new Uint8Array() } as CompressResult;
    state = reducer(state, { type: 'COMPRESS_DONE', result });
    expect(state).toMatchObject({ status: 'compressed', compressed: result });
  });

  it('cargar otra fuente borra el análisis y la compresión anteriores', () => {
    const state = run(
      { type: 'SOURCE_LOADED', file: source },
      { type: 'ANALYZE_DONE', freqs: new Uint32Array(256) },
      { type: 'SOURCE_LOADED', file: { ...source, name: 'b.txt' } }
    );
    expect(state.freqs).toBeNull();
    expect(state.compressed).toBeNull();
    expect(state.source?.name).toBe('b.txt');
  });

  it('no deja navegar a pantallas sin datos', () => {
    expect(reducer(initialState, { type: 'NAVIGATE', screen: 'tree' })).toBe(initialState);
    expect(canVisit(initialState, 'analyze')).toBe(false);
    expect(canVisit(initialState, 'decompress')).toBe(false);

    const loaded = run({ type: 'SOURCE_LOADED', file: source });
    expect(canVisit(loaded, 'analyze')).toBe(true);
    expect(canVisit(loaded, 'tree')).toBe(false);
  });

  it('cambiar de modo lleva a la primera pantalla del modo', () => {
    const state = run({ type: 'SET_MODE', mode: 'decompress' });
    expect(state).toMatchObject({ mode: 'decompress', screen: 'inspect' });
    expect(reducer(state, { type: 'SET_MODE', mode: 'decompress' })).toBe(state);
  });

  it('cargar un .ycoma cambia al modo descomprimir y limpia resultados previos', () => {
    const state = run({ type: 'ARCHIVE_LOADED', file: archive });
    expect(state).toMatchObject({
      mode: 'decompress',
      screen: 'inspect',
      archive,
      inspected: null,
    });
    // Solo se puede descomprimir después de una inspección correcta
    expect(canVisit(state, 'decompress')).toBe(false);
    const inspected = reducer(state, {
      type: 'INSPECT_DONE',
      result: {} as InspectResult,
    });
    expect(canVisit(inspected, 'decompress')).toBe(true);
  });

  it('progreso de descarga, error, descartar error y cancelación', () => {
    let state = run(
      { type: 'LOAD_START' },
      { type: 'LOAD_PROGRESS', progress: { loaded: 5, total: 10 } }
    );
    expect(state).toMatchObject({ status: 'loading', progress: { loaded: 5, total: 10 } });

    state = reducer(state, { type: 'FAILED', error: { title: 't', message: 'm' } });
    expect(state).toMatchObject({ status: 'error', progress: null, error: { title: 't' } });

    state = reducer(state, { type: 'DISMISS_ERROR' });
    expect(state).toMatchObject({ status: 'idle', error: null });

    state = reducer(run({ type: 'LOAD_START' }), { type: 'CANCELLED' });
    expect(state.status).toBe('idle');
  });

  it('RESET vuelve al estado inicial', () => {
    expect(reducer(run({ type: 'SOURCE_LOADED', file: source }), { type: 'RESET' })).toBe(
      initialState
    );
  });
});
