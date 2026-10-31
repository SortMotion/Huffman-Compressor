import { useSyncExternalStore } from 'react';
import { initialState, reducer, type Action, type AppState } from '../reducer';

type Listener = () => void;

export interface Store {
  getState(): AppState;
  dispatch(action: Action): void;
  subscribe(listener: Listener): () => void;
}

/**
 * Store estático fuera del árbol de React: los buffers grandes viven aquí y no en
 * `useState`, así que solo se vuelve a renderizar el componente cuyo selector cambió.
 */
export function createStore(reducerFn = reducer, preloaded: AppState = initialState): Store {
  let state = preloaded;
  const listeners = new Set<Listener>();
  return {
    getState: () => state,
    dispatch(action) {
      const next = reducerFn(state, action);
      if (next === state) return;
      state = next;
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const store = createStore();

export const dispatch = (action: Action): void => store.dispatch(action);

/**
 * Suscribe un componente a una parte del estado. El selector debe devolver un valor
 * que ya exista en el estado (no crear objetos nuevos), para no renderizar de más.
 */
export function useAppState<T>(selector: (state: AppState) => T, target: Store = store): T {
  return useSyncExternalStore(
    target.subscribe,
    () => selector(target.getState()),
    () => selector(target.getState())
  );
}
