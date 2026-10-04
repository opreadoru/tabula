// Build settings. Vite builds only index.html unless told otherwise, so every page in pages/, when
// there is one, is listed as an entry too. A new page there is picked up without editing this file.
// The dev server also passes /ollama to Ollama on this computer, for the typed questions on the
// Ask page. A built copy has no such route, and the page says so when a question goes unanswered.
import { defineConfig } from 'vite'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = import.meta.dirname
const dir = resolve(root, 'pages')
const pages = existsSync(dir)
  ? Object.fromEntries(
      readdirSync(dir)
        .filter(f => f.endsWith('.html'))
        .map(f => [`pages/${f.replace(/\.html$/, '')}`, resolve(dir, f)]),
    )
  : {}

export default defineConfig({
  server: {
    proxy: {
      '/ollama': { target: 'http://localhost:11434', changeOrigin: true, rewrite: path => path.replace(/^\/ollama/, '') },
    },
  },
  build: {
    rollupOptions: {
      input: { docs: resolve(root, 'index.html'), ...pages },
    },
  },
})
