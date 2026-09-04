import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { metadataHtmlPlugin } from './scripts/metadata/html-transform.mjs';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ isSsrBuild }) => ({
  base: '/',
  publicDir: false,
  plugins: [metadataHtmlPlugin(), react()],
  build: isSsrBuild
    ? {
        outDir: resolve(repositoryRoot, '.prerender'),
        emptyOutDir: true,
        copyPublicDir: false,
        sourcemap: false,
        rollupOptions: {
          input: resolve(repositoryRoot, 'src/entries/server.jsx'),
          output: {
            entryFileNames: 'server.mjs',
            chunkFileNames: 'chunks/[name]-[hash].mjs',
            format: 'es',
          },
        },
      }
    : {
        outDir: resolve(repositoryRoot, 'dist'),
        emptyOutDir: true,
        copyPublicDir: false,
        sourcemap: false,
        assetsDir: 'assets',
        rollupOptions: {
          input: {
            home: resolve(repositoryRoot, 'index.html'),
            projects: resolve(repositoryRoot, 'projects/index.html'),
          },
        },
      },
}));
