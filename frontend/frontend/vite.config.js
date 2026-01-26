import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Production build optimizations (using esbuild - default minifier)
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          animations: ['framer-motion', 'lottie-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to backend during development
      '/api': {
        target: 'http://localhost:8091',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8091',
        ws: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
})
