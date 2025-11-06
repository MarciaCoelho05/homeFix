import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        format: 'es',
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    target: 'es2020',
  },
  esbuild: {
    legalComments: 'none',
    minifyIdentifiers: false, // Desabilitar minificação de identificadores para evitar problemas
    minifySyntax: true,
    minifyWhitespace: true,
    keepNames: true, // Manter nomes de funções para facilitar debug
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
})