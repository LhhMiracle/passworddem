import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  root: path.resolve(__dirname, '../frontend'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, '../frontend/index.html')
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../frontend/src')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  define: {
    'process.env.IS_ELECTRON': JSON.stringify(true)
  }
});
