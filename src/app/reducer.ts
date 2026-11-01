import type {
  CompressResult,
  DecompressResult,
  FrequencyTable,
  InspectResult,
} from '../contracts/types';

export type Mode = 'compress' | 'decompress';
export type Screen = 'source' | 'analyze' | 'tree' | 'compress' | 'inspect' | 'decompress';

/** Fases del flujo (IDLE → ANALYZING → ANALYZED → COMPRESSING → COMPRESSED …). */
export type Status =
  | 'idle'
  | 'loading'
  | 'analyzing'
  | 'analyzed'
  | 'compressing'
  | 'compressed'
  | 'inspecting'
  | 'inspected'
  | 'decompressing'
  | 'decompressed'
  | 'error';

export interface LoadedFile {
  name: string;
  bytes: Uint8Array;
  origin: 'file' | 'gutenberg';
}

export interface AppError {
  title: string;
  message: string;
}

export interface Progress {
  loaded: number;
  total: number | null;
}

export interface AppState {
  mode: Mode;
  screen: Screen;
  status: Status;
  progress: Progress | null;
  error: AppError | null;
  /** Texto a comprimir (archivo local o libro de Gutenberg). */
  source: LoadedFile | null;
  freqs: FrequencyTable | null;
  compressed: CompressResult | null;
  /** Archivo .ycoma subido para inspeccionar o descomprimir. */
  archive: LoadedFile | null;
  inspected: InspectResult | null;
  decompressed: DecompressResult | null;
}

export type Action =
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'LOAD_START' }
  | { type: 'LOAD_PROGRESS'; progress: Progress }
  | { type: 'SOURCE_LOADED'; file: LoadedFile }
  | { type: 'ARCHIVE_LOADED'; file: LoadedFile }
  | { type: 'ANALYZE_START' }
  | { type: 'ANALYZE_DONE'; freqs: FrequencyTable }
  | { type: 'COMPRESS_START' }
  | { type: 'COMPRESS_DONE'; result: CompressResult }
  | { type: 'INSPECT_START' }
  | { type: 'INSPECT_DONE'; result: InspectResult }
  | { type: 'DECOMPRESS_START' }
  | { type: 'DECOMPRESS_DONE'; result: DecompressResult }
  | { type: 'FAILED'; error: AppError }
  | { type: 'CANCELLED' }
  | { type: 'DISMISS_ERROR' }
  | { type: 'RESET' };

export const initialState: AppState = {
  mode: 'compress',
  screen: 'source',
  status: 'idle',
  progress: null,
  error: null,
  source: null,
  freqs: null,
  compressed: null,
  archive: null,
  inspected: null,
  decompressed: null,
};

export const SCREENS_BY_MODE: Record<Mode, Screen[]> = {
  compress: ['source', 'analyze', 'tree', 'compress'],
  decompress: ['inspect', 'decompress'],
};

/** Una pantalla solo se puede abrir si ya existen los datos que necesita. */
export function canVisit(state: AppState, screen: Screen): boolean {
  switch (screen) {
    case 'source':
    case 'inspect':
      return true;
    case 'analyze':
      return state.source !== null;
    case 'tree':
    case 'compress':
      return state.freqs !== null;
    case 'decompress':
      return state.inspected !== null;
  }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_MODE': {
      if (action.mode === state.mode) return state;
      const screen = action.mode === 'compress' ? 'source' : 'inspect';
      return { ...state, mode: action.mode, screen, status: 'idle', error: null, progress: null };
    }
    case 'NAVIGATE':
      if (!canVisit(state, action.screen)) return state;
      return { ...state, screen: action.screen, error: null };
    case 'LOAD_START':
      return { ...state, status: 'loading', progress: null, error: null };
    case 'LOAD_PROGRESS':
      return { ...state, progress: action.progress };
    case 'SOURCE_LOADED':
      return {
        ...state,
        mode: 'compress',
        screen: 'analyze',
        status: 'idle',
        progress: null,
        error: null,
        source: action.file,
        freqs: null,
        compressed: null,
      };
    case 'ARCHIVE_LOADED':
      return {
        ...state,
        mode: 'decompress',
        screen: 'inspect',
        status: 'idle',
        progress: null,
        error: null,
        archive: action.file,
        inspected: null,
        decompressed: null,
      };
    case 'ANALYZE_START':
      return { ...state, status: 'analyzing', error: null };
    case 'ANALYZE_DONE':
      return { ...state, status: 'analyzed', freqs: action.freqs, compressed: null };
    case 'COMPRESS_START':
      return { ...state, status: 'compressing', error: null };
    case 'COMPRESS_DONE':
      return { ...state, status: 'compressed', compressed: action.result };
    case 'INSPECT_START':
      return { ...state, status: 'inspecting', error: null };
    case 'INSPECT_DONE':
      return { ...state, status: 'inspected', inspected: action.result };
    case 'DECOMPRESS_START':
      return { ...state, status: 'decompressing', error: null };
    case 'DECOMPRESS_DONE':
      return { ...state, status: 'decompressed', decompressed: action.result };
    case 'FAILED':
      return { ...state, status: 'error', progress: null, error: action.error };
    case 'CANCELLED':
      return { ...state, status: 'idle', progress: null };
    case 'DISMISS_ERROR':
      return { ...state, status: state.status === 'error' ? 'idle' : state.status, error: null };
    case 'RESET':
      return initialState;
  }
}
