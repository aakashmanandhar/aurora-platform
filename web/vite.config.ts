import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The app is served under /aurora/ in production, so it is developed there too.
export default defineConfig({
  base: '/aurora/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      // Mirrors production, where nginx forwards /aurora/api/ to the API container.
      '/aurora/api': {
        target: process.env.AURORA_API_TARGET ?? 'http://api:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/aurora\/api/, ''),
      },
    },
  },
})
