import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    // During development Vite serves the UI and forwards the API to Express.
    proxy: { '/api': 'http://localhost:4173' },
  },
});
