import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'www',
    emptyOutDir: true,
    minify: 'esbuild',
    target: 'es2020'
  }
});
