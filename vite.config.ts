import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'desktop/app',
    emptyOutDir: false,
    target: 'esnext',
    minify: false,
    cssMinify: false,
  },
});