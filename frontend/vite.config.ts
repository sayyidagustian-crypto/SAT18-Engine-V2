import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy requests to /api, /auth, and /upload to the backend server
      '/api': {
        target: 'http://localhost:24700',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:24700',
        changeOrigin: true,
      },
      '/upload': {
         target: 'http://localhost:24700',
        changeOrigin: true,
      }
    }
  }
})