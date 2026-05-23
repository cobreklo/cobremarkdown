import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Force Vite to use mammoth's pre-built browser bundle,
      // not the Node.js version (which has fs/path dependencies).
      mammoth: resolve(__dirname, 'node_modules/mammoth/mammoth.browser.min.js'),
    },
  },
  optimizeDeps: {
    include: ['xlsx', 'turndown', 'jszip', 'marked'],
  },
})
