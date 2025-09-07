import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    babel: {
      plugins: [
        process.env.NODE_ENV === 'development' && ['transform-react-jsx-location', {
          attributeName: 'data-source'
        }]
      ].filter(Boolean)
    }
  })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8080,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})