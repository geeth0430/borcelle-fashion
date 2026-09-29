import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  root: 'client',
  envDir: '..',
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/public/images/Top15.png', '**/public/images/uploads/**'],
    },
    proxy: {
      '/api': 'http://localhost:5000',
      '/images/uploads': 'http://localhost:5000',
    },
  },
})
