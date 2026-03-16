import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy all /api calls to backend in development
      '/api': {
        target:      'http://localhost:5000',
        changeOrigin: true,
        secure:      false,
      },
    },
  },
  build: {
    outDir:        'dist',
    sourcemap:     false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:  ['react','react-dom','react-router-dom'],
          utils:   ['axios','date-fns','zustand'],
        },
      },
    },
  },
  preview: {
    port: 4173,
  },
});
