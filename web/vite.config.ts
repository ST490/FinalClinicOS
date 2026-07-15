import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ponytail: Vite proxy so dev uses same-origin and CORS is irrelevant.
// Backend listens on the port in src/config/index.ts (default 3000).
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
