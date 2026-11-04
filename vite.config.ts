import { defineConfig } from 'vitest/config';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Los mismos rewrites que `vercel.json`, para `npm run dev` y `npm run preview`.
 * Gutendex y Gutenberg no envían cabeceras CORS, así que el navegador debe pasar por aquí.
 */
const proxy: Record<string, ProxyOptions> = {
  '/api/gutendex': {
    target: 'https://gutendex.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/gutendex/, ''),
  },
  '/api/pg': {
    target: 'https://www.gutenberg.org',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/pg/, ''),
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
});
