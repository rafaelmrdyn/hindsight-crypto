import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pure frontend: the built site is static files that call the CoinStats
// Open API directly from the browser (CORS is open). No backend, no proxy.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: false },
})
