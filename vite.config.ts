import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

const backend = process.env.VITE_API_PROXY ?? 'http://localhost:8000'

// The FastAPI routes (/attractions, /hotels, ...) share paths with the React routes.
// Browser page loads (Accept: text/html) must get index.html; fetch() calls go to the API.
const toApi: ProxyOptions = {
  target: backend,
  changeOrigin: true,
  bypass: (req) => (req.headers.accept?.includes('text/html') ? '/index.html' : undefined),
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': toApi,
      '/attractions': toApi,
      '/hotels': toApi,
      '/restaurants': toApi,
      '/travel-agencies': toApi,
      '/guides': toApi,
      '/static': toApi,
    },
  },
})
