import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createStore, useAppState, type Store } from '../../src/app/store';
import '@testing-library/jest-dom/vitest';

const source = { name: 'a.txt', bytes: new Uint8Array([1, 2, 3]), origin: 'file' as const };

describe('createStore', () => {
  it('despacha acciones y avisa a los suscriptores', () => {
    const store = createStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.dispatch({ type: 'SOURCE_LOADED', file: source });
    expect(store.getState().source).toBe(source);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.dispatch({ type: 'RESET' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('no avisa si la acción no cambia el estado', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'NAVIGATE', screen: 'tree' }); // no permitido sin datos
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('useAppState', () => {
  function Screen({ store }: { store: Store }) {
    const name = useAppState((s) => s.source?.name ?? 'ninguno', store);
    return <p>{name}</p>;
  }

  it('vuelve a renderizar el componente cuando cambia lo que selecciona', () => {
    const store = createStore();
    render(<Screen store={store} />);
    expect(screen.getByText('ninguno')).toBeInTheDocument();

    act(() => store.dispatch({ type: 'SOURCE_LOADED', file: source }));
    expect(screen.getByText('a.txt')).toBeInTheDocument();
  });

  it('no vuelve a renderizar si lo seleccionado no cambia', () => {
    const store = createStore();
    let renders = 0;
    function Counter() {
      renders++;
      useAppState((s) => s.mode, store);
      return null;
    }
    render(<Counter />);
    const before = renders;
    act(() => store.dispatch({ type: 'LOAD_PROGRESS', progress: { loaded: 1, total: 2 } }));
    expect(renders).toBe(before);
  });
});
