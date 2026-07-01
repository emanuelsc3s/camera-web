import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const frontendPort = Number.parseInt(process.env.FRONTEND_PORT || '8080', 10)
const devServerPort = Number.isNaN(frontendPort) ? 8080 : frontendPort

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
    port: devServerPort,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
