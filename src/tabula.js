// Tabula behaviours. Plain DOM, no framework. Each module attaches to data-tb-* attributes,
// so markup from any framework works. Call tb.init(root) after rendering new markup.
import { initControls } from './behaviours-controls.js'
import { initSurfaces } from './behaviours-surfaces.js'
import { initPatterns } from './behaviours-patterns.js'
import { toast } from './toast.js'

export const tb = {
  init(root = document) {
    initControls(root)
    initSurfaces(root)
    initPatterns(root)
  },
  toast,
}

if (typeof window !== 'undefined') window.tb = tb
