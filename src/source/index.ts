import type { SearchResult, DownloadProgress } from '../contracts/types';

export declare function searchBooks(query: string, signal?: AbortSignal): Promise<SearchResult>;
export declare function downloadText(url: string, signal?: AbortSignal, onProgress?: DownloadProgress): Promise<Uint8Array>;
