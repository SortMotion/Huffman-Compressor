import { createHuffmanClient, type HuffmanClient } from '../workers';

let client: HuffmanClient | null = null;

/** Un solo Web Worker para toda la app; se crea la primera vez que se necesita. */
export function getHuffmanClient(): HuffmanClient {
  client ??= createHuffmanClient();
  return client;
}
