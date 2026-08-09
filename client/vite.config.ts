import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/collabboard/',
  plugins: [
    react({
      // Babel fast-refresh only for files that actually use React hooks/JSX
      include: '**/*.{tsx,jsx}',
    }),
  ],

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },

  // Pre-bundle heavy deps so Vite doesn't re-transform them on every cold start
  optimizeDeps: {
    include: [
      'fabric',
      'socket.io-client',
      'axios',
      'zustand',
      '@tanstack/react-query',
      'react-hot-toast',
      'react-router-dom',
      'idb',
    ],
    // fabric ships as CJS — force Vite to ESM-convert it once and cache it
    esbuildOptions: {
      target: 'es2020',
    },
  },

  build: {
    target: 'es2020',
    // Split heavy vendor chunks so the browser caches them separately
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-fabric': ['fabric'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },

  server: {
    port: 5173,
    // Warm up the most-imported modules so they're ready before the browser asks
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/canvas/CanvasEngine.ts',
        './src/services/socket.ts',
        './src/services/api.ts',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
