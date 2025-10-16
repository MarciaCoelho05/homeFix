import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // temporary alias: resolve legacy imports that point to ../api
      '../api': path.resolve(__dirname, 'src/services/api.js'),
    },
  },
})
