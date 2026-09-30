// Build settings. Vite builds only index.html unless told otherwise, so every page in pages/, when
// there is one, is listed as an entry too. A new page there is picked up without editing this file.
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
  build: {
    rollupOptions: {
      input: { docs: resolve(root, 'index.html'), ...pages },
    },
  },
})
