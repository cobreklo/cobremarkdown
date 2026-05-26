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
  worker: {
    // Workers use dynamic import() for code splitting, so they must be
    // bundled as ES modules. The default "iife" format is incompatible
    // with multi-chunk output and causes the Vercel build to fail.
    format: 'es',
  },
  optimizeDeps: {
    // pdfjs-dist has its own worker and is large — exclude from pre-bundling
    // so Vite doesn't try to inline it. It loads as a lazy chunk on demand.
    exclude: ['pdfjs-dist'],
  },
})
