import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: false,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Prevent build failure due to chunk size warnings
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Code-split large vendor libs for better performance on Vercel CDN
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'motion-vendor': ['framer-motion'],
        },
      },
    },
  },
});

