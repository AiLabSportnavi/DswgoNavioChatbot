import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy API calls to the FastAPI backend in dev so the browser stays
    // same-origin (no CORS) and the frontend can call relative /api/chat.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8010', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:8010', changeOrigin: true },
    },
  },
})
