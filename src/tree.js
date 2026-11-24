// Tree views. One hierarchy read four ways, in one card with a view switch:
//   Tree     node and link, pan with a drag, zoom with the wheel while the pointer is over it
//   Columns  one column per level of the selected path, Finder style
//   Icicle   levels left to right, each node as tall as its share, click to zoom in
//   Table    the hierarchy flattened, indented by depth
// All four share the selection. Clicking a node with children selects it and opens or closes it
// in the same click: its children grow out of it one after another, the clicked branch stays
// still on screen, and a tall branch zooms out to fit, never below 60 %. A closed branch is drawn
// as a deck (two outlines behind it) and says how many children it holds.
//
//   const tree = mountTree(card, {
//     root,                         { id, label, children } all the way down
//     title: 'Revenue hierarchy',
//     size: n => n.value,           what the widths, shares and icicle heights follow
//     sizeText: n => '4.2M €',      the size as people read it
//     score: n => n.risk,           optional, 0 to 1 on the probability bands (tb-prob)
//     scoreName: 'Churn risk',
//     noun: (n, count) => 'countries',  what a node's children are called
//     columns: [{ label, num, html: n => '' }],  extra columns for the Table view
//     collapsed: ['eu'],            branches closed at the start
//     mode: 'columns',              the first view; the last choice is remembered under storageKey
//     onSelect: node => {},
//   })
//   tree.select(id, reveal)  tree.setMode(mode)  tree.selected()
//
// The card is an empty <section class="tb-card tb-tree">; the component fills it. Its height
// comes from --tb-tree-height (one screen by default). The expand button moves the live canvas
// into the full-screen view. Screenshot flags: #view-tree, #view-columns, #view-icicle, #view-table
// open that view and drive animations with timers, since headless browsers skip animation frames.
import { tb } from './tabula.js'
import { setExpandRender, expandButton } from './expand.js'
import { esc, fmtInt, fmtPct, fmtPctN, band, probHtml } from './format.js'

const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const I = {
  chevron: lucide('<path d="m9 18 6-6-6-6" />'),
  tree: lucide('<rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" />'),
  columns: lucide('<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="M15 3v18" />'),
  icicle: lucide('<rect width="6" height="14" x="4" y="5" rx="2" /><rect width="6" height="10" x="14" y="7" rx="2" /><path d="M4 2v20" /><path d="M14 2v20" />'),
  table: lucide('<path d="M12 3v18" /><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" />'),
  minus: lucide('<path d="M5 12h14" />'),
  plus: lucide('<path d="M5 12h14" /><path d="M12 5v14" />'),
  zoomOut: lucide('<circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /><line x1="8" x2="14" y1="11" y2="11" />'),
  sortDesc: lucide('<path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="M11 4h10" /><path d="M11 8h7" /><path d="M11 12h4" />'),
  sortAz: lucide('<path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="M20 8h-5" /><path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10" /><path d="M15 14h5l-5 6h5" />'),
}
const MODES = ['tree', 'columns', 'icicle', 'table']
const MODE_LABEL = { tree: 'Tree', columns: 'Columns', icicle: 'Icicle', table: 'Table' }

// Sizes in SVG units: a column per depth, a row per visible leaf.
const [COL_W, ROW_H, NODE_W, NODE_H, LABEL_MAX, PAD] = [260, 72, 200, 56, 118, 32]
const [ZOOM_MIN, ZOOM_MAX] = [0.3, 4]
const DURATION = 460
const AUTO_ZOOM_MIN = 0.6
const STAGGER = 16
const ICI_MS = 400
const ICI_LEVELS = 4
const ICI_LABEL_MIN = 28
const ICI_META_MIN = 46
const easeOut = t => 1 - Math.pow(1 - t, 3)

let uid = 0

export function mountTree(card, opts) {
  const {
    root, title = 'Hierarchy', size, sizeText, score = null, scoreName = 'Score',
    noun = (n, count) => (count === 1 ? 'child' : 'children'), columns = [],
    collapsed = [], mode: firstMode = 'columns', storageKey = 'tb-tree-view', onSelect = () => {},
  } = opts
  const id = `tb-tree-${++uid}`
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const timers = /(^#|\+)view-/.test(location.hash) || location.hash.includes('tree-timers')
  const nextFrame = timers ? cb => setTimeout(() => cb(performance.now()), 16) : requestAnimationFrame
  const stopFrame = timers ? clearTimeout : cancelAnimationFrame

  // Lookups over the hierarchy.
  const byId = new Map()
  const parentOf = new Map()
  const depthOf = new Map()
  const flat = []
  ;(function walk(n, parent, depth) {
    byId.set(n.id, n)
    parentOf.set(n.id, parent)
    depthOf.set(n.id, depth)
    flat.push(n)
    ;(n.children || []).forEach(c => walk(c, n, depth + 1))
  })(root, null, 0)
  const pathTo = nodeId => {
    const out = []
    for (let n = byId.get(nodeId); n; n = parentOf.get(n.id)) out.unshift(n)
    return out
  }
  const total = size(root) || 1
  const scoreHtml = (n, bar = true) => (score ? probHtml(score(n), bar) : '')
  const tone = n => (score ? `var(--tb-prob-${band(score(n))})` : 'var(--tb-accent)')
  const low = n => score && score(n) < 0.1

  const state = { selected: null, collapsed: new Set(collapsed), view: { x: 0, y: 0, k: 1 }, mode: firstMode }
  try { const saved = localStorage.getItem(storageKey); if (MODES.includes(saved)) state.mode = saved } catch { /* private mode */ }
  const hashView = location.hash.match(/(?:^#|\+)view-(tree|columns|icicle|table)/)
  if (hashView) state.mode = hashView[1]

  card.classList.add('tb-tree')
  card.setAttribute('aria-labelledby', `${id}-title`)
  card.innerHTML = `
    <div class="tb-card-header">
      <h2 class="tb-card-title" id="${id}-title">${esc(title)}</h2>
      <div class="tb-card-actions">
        <span class="tb-tree-when" data-when="tree">
          <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-zoom="out" aria-label="Zoom out">${I.minus}</button>
          <span class="tb-text tb-text--sm tb-num tb-tree-zoom" data-zoom-value></span>
          <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-zoom="in" aria-label="Zoom in">${I.plus}</button>
          <button class="tb-button tb-button--minimal tb-button--sm" type="button" data-zoom="fit">Fit</button>
        </span>
        <span class="tb-tree-when tb-text tb-text--sm tb-text--muted" data-when="columns">Arrow keys to move, right to open</span>
        <span class="tb-tree-when" data-when="icicle">
          <span class="tb-text tb-text--sm tb-text--muted tb-tree-ici-focus" data-ici-focus></span>
          <button class="tb-button tb-button--minimal tb-button--sm" type="button" data-ici-out>${I.zoomOut}Zoom out</button>
        </span>
        <span class="tb-tree-when tb-text tb-text--sm tb-text--muted" data-when="table">${fmtInt(flat.length)} rows, flattened from the tree</span>
        <div class="tb-button-group" role="group" aria-label="View">
          ${MODES.map(m => `<button class="tb-button tb-button--sm" type="button" data-view="${m}" aria-pressed="false" aria-label="${MODE_LABEL[m]} view" data-tb-tooltip="${MODE_LABEL[m]}">${I[m]}</button>`).join('')}
        </div>
        ${expandButton(title)}
      </div>
    </div>
    <div class="tb-card-body tb-card-body--flush tb-tree-canvas" data-pane="tree">
      <svg class="tb-tree-svg" role="group" aria-label="${esc(title)}. Drag to pan, scroll to zoom."><g data-viewport></g></svg>
      <div class="tb-card tb-tree-legend">
        ${score ? `<ul class="tb-legend" aria-label="${esc(scoreName)} bands">${[['low', `Under ${fmtPctN(0.1)}`], ['mid', `${fmtPctN(0.1)} to ${fmtPctN(0.4)}`], ['high', `Over ${fmtPctN(0.4)}`]].map(([t, l]) => `<li class="tb-legend-item"><span class="tb-swatch tb-tone-${t}"></span><span class="tb-legend-label">${esc(scoreName)} ${l.charAt(0).toLowerCase()}${l.slice(1)}</span></li>`).join('')}</ul>` : ''}
        <span class="tb-text--muted">Line width follows size</span>
        <span class="tb-text--muted">Click a node to open or close it</span>
      </div>
    </div>
    <div class="tb-card-body tb-card-body--flush tb-tree-pane" data-pane="columns">
      <div class="tb-toolbar tb-tree-crumbs-bar">
        <nav class="tb-breadcrumbs" data-crumbs aria-label="Path to the selection"></nav>
      </div>
      <div class="tb-tree-cols" data-cols></div>
    </div>
    <div class="tb-card-body tb-card-body--flush tb-tree-canvas" data-pane="icicle">
      <svg class="tb-tree-ici" role="group" aria-label="${esc(title)} by share. Click a node to zoom in, click the left column to zoom out."></svg>
    </div>
    <div class="tb-card-body tb-card-body--flush tb-tree-pane" data-pane="table">
      <div class="tb-table-wrap tb-tree-table-wrap">
        <table class="tb-table tb-tree-table">
          <thead><tr><th>Name</th><th class="is-num">Size</th><th class="is-num">Share</th>${columns.map(c => `<th${c.num ? ' class="is-num"' : ''}>${esc(c.label)}</th>`).join('')}${score ? `<th class="is-num">${esc(scoreName)}</th>` : ''}</tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`
  card.querySelector('.tb-tree-table th:nth-child(2)').textContent = opts.sizeLabel || 'Size'

  const $ = s => card.querySelector(s)
  const svg = $('.tb-tree-svg')
  const viewport = $('[data-viewport]')
  const canvas = $('[data-pane="tree"]')
  const colsEl = $('[data-cols]')
  const iciSvg = $('.tb-tree-ici')
  const iciCanvas = $('[data-pane="icicle"]')
  const tableBody = $('.tb-tree-table tbody')

  /* Tree layout. Visible leaves take rows from top to bottom, a parent sits halfway between its
     first and last child, and the column is the depth. */

  let positions = new Map()
  let fitted = false
  function layout() {
    const pos = new Map()
    let row = 0
    ;(function place(node, depth) {
      const kids = state.collapsed.has(node.id) ? [] : node.children || []
      let y
      if (kids.length) {
        const ys = kids.map(kid => place(kid, depth + 1))
        y = (ys[0] + ys[ys.length - 1]) / 2
      } else {
        y = row * ROW_H
        row += 1
      }
      pos.set(node.id, { x: depth * COL_W, y })
      return y
    })(root, 0)
    return pos
  }

  const edgePath = (from, to) => {
    const [x1, y1, x2, y2] = [from.x + NODE_W, from.y + NODE_H / 2, to.x, to.y + NODE_H / 2]
    const mx = (x1 + x2) / 2
    return `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`
  }
  function edgeHtml(node, onPath) {
    const width = 2 + 8 * Math.sqrt(size(node) / total)
    return `<path class="tb-tree-edge${low(node) ? ' is-low' : ''}" data-edge="${esc(node.id)}" d="${edgePath(positions.get(parentOf.get(node.id).id), positions.get(node.id))}" fill="none" stroke="${onPath ? 'var(--tb-accent)' : 'var(--tb-border-strong)'}" stroke-width="${width.toFixed(1)}"/>`
  }

  function nodeHtml(node, p, onPath) {
    const selected = node.id === state.selected
    const classes = ['tb-tree-node', selected && 'is-selected', onPath && !selected && 'is-path', low(node) && 'is-low']
    const hidden = node.children && state.collapsed.has(node.id) ? node.children.length : 0
    const hiddenText = hidden ? `${fmtInt(hidden)} ${noun(node, hidden)}` : ''
    const meta = hidden ? `${sizeText(node)}, ` : `${sizeText(node)}, ${fmtPct(size(node) / total)}`
    const deck = hidden ? [6, 3].map(d => `<rect class="tb-tree-deck" x="${d}" y="${d}" width="${NODE_W}" height="${NODE_H}"/>`).join('') : ''
    const s = score ? score(node) : null
    return `<g class="${classes.filter(Boolean).join(' ')}" data-id="${esc(node.id)}" transform="translate(${p.x} ${p.y})"
        tabindex="0" role="button" aria-pressed="${selected}"${node.children ? ` aria-expanded="${!hidden}"` : ''} aria-label="${esc(`${node.label}, ${meta}${hiddenText}${score ? `, ${scoreName} ${fmtPct(s)}` : ''}${node.children ? `, ${hidden ? `closed, ${hiddenText} inside` : 'open'}` : ''}`)}">
      <title>${esc(node.label)}</title>
      ${deck}
      <rect class="tb-tree-box" width="${NODE_W}" height="${NODE_H}"/>
      <rect width="3" height="${NODE_H}" fill="${tone(node)}"/>
      <text class="tb-tree-label" x="12" y="23">${esc(node.label)}</text>
      <text class="tb-tree-meta" x="12" y="41">${esc(meta)}${hidden ? `<tspan class="tb-tree-hidden">${esc(hiddenText)}</tspan>` : ''}</text>
      ${score ? `<text class="tb-tree-score" x="188" y="23" text-anchor="end">${fmtPct(s)}</text>
      <rect x="148" y="34" width="40" height="4" fill="var(--tb-border)"/>
      <rect x="148" y="34" width="${(40 * s).toFixed(1)}" height="4" fill="${tone(node)}"/>` : ''}
    </g>`
  }

  // Shortens a label with an ellipsis until it fits. Needs the SVG on screen to measure.
  function fitText(el) {
    const full = el.textContent
    let n = full.length
    while (n > 1 && el.getComputedTextLength() > LABEL_MAX) {
      n -= 1
      el.textContent = `${full.slice(0, n).trimEnd()}…`
    }
  }

  function renderTree() {
    const focused = document.activeElement?.closest?.('[data-id]')
    const focusKey = focused && svg.contains(focused) ? focused.dataset.id : null
    positions = layout()
    const onPath = new Set(state.selected ? pathTo(state.selected).map(n => n.id) : [])
    // Edges on the selected path are drawn after the others so they sit on top.
    let [edges, hot, nodes] = ['', '', '']
    positions.forEach((p, nid) => {
      const node = byId.get(nid)
      if (parentOf.get(nid)) {
        if (onPath.has(nid)) hot += edgeHtml(node, true)
        else edges += edgeHtml(node, false)
      }
      nodes += nodeHtml(node, p, onPath.has(nid))
    })
    viewport.innerHTML = edges + hot + nodes
    viewport.querySelectorAll('.tb-tree-label').forEach(fitText)
    if (focusKey) viewport.querySelector(`[data-id="${CSS.escape(focusKey)}"]`)?.focus()
  }

  /* Expand and collapse. The tree is drawn once with every node visible before or after the
     change, then each frame moves them between their old and new places. New nodes grow out of
     the branch that opened, one after another; leaving nodes shrink back into it. */

  let animFrame = 0
  const anchorIn = (nid, pos) => {
    for (let n = byId.get(nid); n; n = parentOf.get(n.id)) if (pos.has(n.id)) return pos.get(n.id)
    return { x: 0, y: 0 }
  }
  function animateTree(pivotId) {
    stopFrame(animFrame)
    const before = positions
    const after = layout()
    if (reduceMotion.matches || !before.size || state.mode !== 'tree') { renderTree(); return }
    // Keep the clicked branch where it was on screen. When an opened branch is taller than the
    // canvas, zoom out just enough to show all of it, but never so far that labels stop reading.
    const v = { ...state.view }
    const b0 = before.get(pivotId)
    const b1 = after.get(pivotId)
    let view1 = { k: v.k, x: v.x - (b1.x - b0.x) * v.k, y: v.y - (b1.y - b0.y) * v.k }
    const r = svg.getBoundingClientRect()
    if (!state.collapsed.has(pivotId) && r.height) {
      const ys = [...after].filter(([nid]) => pathTo(nid).some(n => n.id === pivotId)).map(([, p]) => p.y)
      const top = Math.min(...ys)
      const height = Math.max(...ys) + NODE_H - top
      if (height * v.k > r.height - 2 * PAD) {
        const k = Math.min(v.k, Math.max(AUTO_ZOOM_MIN, (r.height - 2 * PAD) / height))
        const screenX = v.x + b0.x * v.k
        const fits = height * k <= r.height - 2 * PAD
        view1 = { k, x: screenX - b1.x * k, y: fits ? (r.height - height * k) / 2 - top * k : r.height / 2 - (b1.y + NODE_H / 2) * k }
      }
    }
    let entering = 0
    const tracks = flat.filter(n => before.has(n.id) || after.has(n.id)).map(node => {
      const kind = !before.has(node.id) ? 'in' : !after.has(node.id) ? 'out' : 'stay'
      return {
        node, kind,
        from: before.get(node.id) || anchorIn(parentOf.get(node.id).id, before),
        to: after.get(node.id) || anchorIn(parentOf.get(node.id).id, after),
        delay: kind === 'in' ? Math.min(entering++ * STAGGER, 360) : 0,
        opacity: 1,
      }
    })
    const span = DURATION + Math.max(0, ...tracks.map(t => t.delay))
    const onPath = new Set(state.selected ? pathTo(state.selected).map(n => n.id) : [])
    positions = new Map(tracks.map(t => [t.node.id, t.from]))
    let [edges, nodes] = ['', '']
    tracks.forEach(t => {
      if (parentOf.get(t.node.id)) edges += edgeHtml(t.node, onPath.has(t.node.id))
      nodes += nodeHtml(t.node, t.from, onPath.has(t.node.id))
    })
    viewport.innerHTML = edges + nodes
    viewport.querySelectorAll('.tb-tree-label').forEach(fitText)
    const els = new Map(tracks.map(t => [t.node.id, { g: viewport.querySelector(`[data-id="${CSS.escape(t.node.id)}"]`), edge: viewport.querySelector(`[data-edge="${CSS.escape(t.node.id)}"]`) }]))
    const cur = new Map()
    let start = null
    const frame = now => {
      // Frame timestamps can come slightly before the call that scheduled them, so the clock
      // starts at the first frame.
      if (start === null) start = now
      const elapsed = now - start
      tracks.forEach(t => {
        const e = easeOut(Math.min(1, Math.max(0, (elapsed - t.delay) / DURATION)))
        const p = { x: t.from.x + (t.to.x - t.from.x) * e, y: t.from.y + (t.to.y - t.from.y) * e }
        const [scale, opacity] = t.kind === 'in' ? [0.6 + 0.4 * e, e] : t.kind === 'out' ? [1 - 0.4 * e, 1 - e] : [1, 1]
        cur.set(t.node.id, p)
        t.opacity = opacity
        const el = els.get(t.node.id)
        el.g.setAttribute('transform', `translate(${p.x} ${p.y}) translate(0 ${NODE_H / 2}) scale(${scale}) translate(0 ${-NODE_H / 2})`)
        el.g.style.opacity = opacity
      })
      tracks.forEach(t => {
        const el = els.get(t.node.id)
        if (!el.edge) return
        el.edge.setAttribute('d', edgePath(cur.get(parentOf.get(t.node.id).id), cur.get(t.node.id)))
        el.edge.style.opacity = t.opacity
      })
      const ev = easeOut(Math.min(1, elapsed / DURATION))
      state.view = { k: v.k + (view1.k - v.k) * ev, x: v.x + (view1.x - v.x) * ev, y: v.y + (view1.y - v.y) * ev }
      applyView()
      if (elapsed < span) animFrame = nextFrame(frame)
      else { state.view = view1; renderTree(); applyView() }
    }
    animFrame = nextFrame(frame)
  }

  /* Pan and zoom, through one transform on the viewport group */

  function applyView() {
    const { x, y, k } = state.view
    viewport.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(3)})`)
    $('[data-zoom-value]').textContent = fmtPctN(k)
  }
  function zoomAt(factor, cx, cy) {
    const v = state.view
    const k = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.k * factor))
    v.x = cx - (cx - v.x) * (k / v.k)
    v.y = cy - (cy - v.y) * (k / v.k)
    v.k = k
    applyView()
  }
  function fit() {
    const r = svg.getBoundingClientRect()
    if (!r.width || !r.height) return
    let [w, h] = [0, 0]
    positions.forEach(p => { w = Math.max(w, p.x + NODE_W + 12); h = Math.max(h, p.y + NODE_H) })
    const k = Math.max(ZOOM_MIN, Math.min(1, (r.width - 2 * PAD) / w, (r.height - 2 * PAD) / h))
    state.view = { k, x: (r.width - w * k) / 2, y: (r.height - h * k) / 2 }
    applyView()
    fitted = true
  }
  // Centres the tree on a node when it sits outside the canvas.
  function ensureVisible(nid) {
    const p = positions.get(nid)
    const r = svg.getBoundingClientRect()
    const v = state.view
    if (!p || !r.width) return
    const sx = v.x + p.x * v.k
    const sy = v.y + p.y * v.k
    if (sx >= 0 && sy >= 0 && sx + NODE_W * v.k <= r.width && sy + NODE_H * v.k <= r.height) return
    v.x = r.width / 2 - (p.x + NODE_W / 2) * v.k
    v.y = r.height / 2 - (p.y + NODE_H / 2) * v.k
    applyView()
  }

  let drag = null
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('.tb-tree-node')) return
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: state.view.x, y: state.view.y }
    svg.setPointerCapture(e.pointerId)
    svg.classList.add('is-panning')
  })
  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return
    state.view.x = drag.x + e.clientX - drag.sx
    state.view.y = drag.y + e.clientY - drag.sy
    applyView()
  })
  const endDrag = () => { drag = null; svg.classList.remove('is-panning') }
  svg.addEventListener('pointerup', endDrag)
  svg.addEventListener('pointercancel', endDrag)
  // The wheel zooms the tree while the pointer is over it. Outside the canvas the page scrolls.
  svg.addEventListener('wheel', e => {
    e.preventDefault()
    const r = svg.getBoundingClientRect()
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
  }, { passive: false })
  card.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => {
    const r = svg.getBoundingClientRect()
    if (button.dataset.zoom === 'fit') fit()
    else zoomAt(button.dataset.zoom === 'in' ? 1.2 : 1 / 1.2, r.width / 2, r.height / 2)
  }))

  /* Columns. One column per level of the selected path; each sorts on its own. */

  const SORTS = score ? ['score', 'size', 'name'] : ['size', 'name']
  const SORT_LABEL = { score: scoreName, size: opts.sizeLabel || 'Size', name: 'Name' }
  const colSort = new Map()
  let shownCols = []
  const sortedChildren = node => {
    const kids = [...(node.children || [])]
    const key = colSort.get(node.id) || SORTS[0]
    if (key === 'name') return kids.sort((a, b) => a.label.localeCompare(b.label, 'en'))
    if (key === 'size') return kids.sort((a, b) => size(b) - size(a))
    return kids.sort((a, b) => score(b) - score(a))
  }
  const columnParents = () => (state.selected ? pathTo(state.selected) : [root]).filter(n => n.children).map(n => n.id)
  const crumbsHtml = (path, currentId) => `<ol>${path.map(n => `<li><button class="tb-breadcrumb" type="button" data-select="${esc(n.id)}" title="${esc(n.label)}"${n.id === currentId ? ' aria-current="page"' : ''}>${esc(n.label)}</button></li>`).join('')}</ol>`

  function columnHtml(parent, onPath, entering) {
    const key = colSort.get(parent.id) || SORTS[0]
    const kids = sortedChildren(parent)
    const active = kids.find(k => onPath.has(k.id))
    const rows = kids.map((n, i) => {
      const selected = n.id === state.selected
      const share = size(n) / size(parent)
      const classes = ['tb-tree-row', selected && 'is-selected', !selected && onPath.has(n.id) && 'is-path'].filter(Boolean).join(' ')
      return `<li class="${classes}" data-id="${esc(n.id)}" role="option" aria-selected="${selected}" tabindex="${(active ? n === active : i === 0) ? 0 : -1}"
          aria-label="${esc(`${n.label}, ${sizeText(n)}, ${fmtPct(share)} of ${parent.label}${score ? `, ${scoreName} ${fmtPct(score(n))}` : ''}`)}">
        <span class="tb-tree-row-label" title="${esc(n.label)}">${esc(n.label)}</span>
        <span class="tb-bar tb-bar--sm${onPath.has(n.id) ? ' tb-tone-accent' : ''}" style="--value: ${(share * 100).toFixed(1)}" title="${fmtPct(share)} of ${esc(parent.label)}"></span>
        <span class="tb-tree-row-meta"><span class="tb-text--muted tb-num">${esc(sizeText(n))}, ${fmtPct(share)}</span>${scoreHtml(n, false)}</span>
        ${n.children ? `<span class="tb-tree-row-chevron">${I.chevron}</span>` : ''}
      </li>`
    }).join('')
    return `<div class="tb-tree-col${entering ? ' is-entering' : ''}" data-parent="${esc(parent.id)}">
      <div class="tb-tree-col-head">
        <span class="tb-caps" title="${esc(parent.label)}">${esc(parent.label)}</span>
        <button class="tb-button tb-button--minimal tb-button--sm" type="button" data-col-sort="${esc(parent.id)}" aria-label="Sorted by ${esc(SORT_LABEL[key].toLowerCase())}. Change the sort">${key === 'name' ? I.sortAz : I.sortDesc}${esc(SORT_LABEL[key])}</button>
      </div>
      <ul class="tb-tree-col-list" role="listbox" aria-label="${esc(parent.label)}">${rows}</ul>
    </div>`
  }
  function keepInList(list, row) {
    const l = list.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    if (r.top < l.top) list.scrollTop -= l.top - r.top
    else if (r.bottom > l.bottom) list.scrollTop += r.bottom - l.bottom
  }
  function renderColumns() {
    const had = document.activeElement
    const refocus = colsEl.contains(had) ? (had.dataset.colSort ? `[data-col-sort="${CSS.escape(had.dataset.colSort)}"]` : `.tb-tree-row[data-id="${CSS.escape(state.selected)}"]`) : null
    const scroll = new Map([...colsEl.querySelectorAll('.tb-tree-col')].map(c => [c.dataset.parent, c.querySelector('.tb-tree-col-list').scrollTop]))
    const parents = columnParents()
    const onPath = new Set(state.selected ? pathTo(state.selected).map(n => n.id) : [])
    colsEl.innerHTML = parents.map(pid => columnHtml(byId.get(pid), onPath, !shownCols.includes(pid))).join('')
    shownCols = parents
    colsEl.querySelectorAll('.tb-tree-col').forEach(col => {
      const list = col.querySelector('.tb-tree-col-list')
      list.scrollTop = scroll.get(col.dataset.parent) || 0
      const hot = list.querySelector('.is-selected, .is-path')
      if (hot) keepInList(list, hot)
    })
    // The newest column comes into view when the row of columns is wider than the card.
    const last = colsEl.lastElementChild
    if (last) {
      const c = colsEl.getBoundingClientRect()
      const r = last.getBoundingClientRect()
      if (r.right > c.right) colsEl.scrollLeft += r.right - c.right
    }
    $('[data-crumbs]').innerHTML = crumbsHtml(state.selected ? pathTo(state.selected) : [root], state.selected)
    if (refocus) colsEl.querySelector(refocus)?.focus()
  }
  colsEl.addEventListener('click', e => {
    const sort = e.target.closest('[data-col-sort]')
    if (sort) {
      const pid = sort.dataset.colSort
      colSort.set(pid, SORTS[(SORTS.indexOf(colSort.get(pid) || SORTS[0]) + 1) % SORTS.length])
      renderColumns()
      return
    }
    const row = e.target.closest('.tb-tree-row')
    if (row) select(row.dataset.id)
  })
  // Up and down move within a column, right opens the next column, left goes back one level.
  colsEl.addEventListener('keydown', e => {
    const row = e.target.closest('.tb-tree-row')
    if (!row || e.target !== row) return
    const node = byId.get(row.dataset.id)
    const parent = parentOf.get(node.id)
    const siblings = sortedChildren(parent)
    const at = siblings.indexOf(node)
    const next = {
      ArrowDown: siblings[at + 1], ArrowUp: siblings[at - 1], Home: siblings[0], End: siblings[siblings.length - 1],
      ArrowRight: node.children ? sortedChildren(node)[0] : null, ArrowLeft: parent === root ? null : parent,
      Enter: node, ' ': node,
    }[e.key]
    if (next === undefined) return
    e.preventDefault()
    if (next) select(next.id)
  })

  /* Icicle. Levels run left to right as columns of equal width; each node is as tall as its share
     of the visible range. Clicking a node selects it and zooms so its range fills the height;
     clicking the left column zooms back out one level. It shows every level, open or closed. */

  let iciAnim = 0
  let iciFocus = root.id
  let iciView = null
  const iciRange = new Map()
  const iciReach = new Map()
  ;(function stack(node, y0, h) {
    iciRange.set(node.id, [y0, y0 + h])
    const kids = node.children || []
    const sumKids = kids.reduce((s, k) => s + size(k), 0) || 1
    let y = y0
    kids.forEach(k => { const kh = (h * size(k)) / sumKids; stack(k, y, kh); y += kh })
    iciReach.set(node.id, kids.length ? 1 + Math.max(...kids.map(k => iciReach.get(k.id))) : 0)
  })(root, 0, total)
  const iciTarget = nid => {
    const [y0, y1] = iciRange.get(nid)
    return { y0, y1, d: depthOf.get(nid), cols: Math.min(ICI_LEVELS, iciReach.get(nid) + 1) }
  }
  // Text is measured on a canvas, so labels can be shortened on every frame without a layout.
  const measure = document.createElement('canvas').getContext('2d')
  const textWidth = (text, weight) => {
    const cs = getComputedStyle(document.documentElement)
    measure.font = `${cs.getPropertyValue(weight).trim()} ${cs.getPropertyValue('--tb-text-sm').trim()} ${getComputedStyle(document.body).fontFamily}`
    return measure.measureText(text).width
  }
  const shorten = (text, max) => {
    if (textWidth(text, '--tb-weight-medium') <= max) return text
    let [lo, hi] = [0, text.length]
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      if (textWidth(`${text.slice(0, mid).trimEnd()}…`, '--tb-weight-medium') <= max) lo = mid
      else hi = mid - 1
    }
    return lo ? `${text.slice(0, lo).trimEnd()}…` : ''
  }
  function iciNodeHtml(n, { x, y, w, h, vt, vh }, onPath) {
    const selected = n.id === state.selected
    const classes = ['tb-tree-ici-node', selected && 'is-selected', n.id === iciFocus && 'is-focus'].filter(Boolean).join(' ')
    const stroke = selected ? ' stroke="var(--tb-accent)" stroke-width="2"' : onPath ? ' stroke="var(--tb-accent)" stroke-width="1"' : ''
    const parent = parentOf.get(n.id)
    const meta = `${sizeText(n)}${parent ? `, ${fmtPct(size(n) / size(parent))} of ${parent.label}` : ''}`
    let text = ''
    if (vh >= ICI_LABEL_MIN && w >= 64) {
      const right = score ? fmtPct(score(n)) : ''
      const rightW = right ? textWidth(right, '--tb-weight-semibold') : 0
      const base = vt + 18
      text = `<text class="tb-tree-label" x="${x + 12}" y="${base}">${esc(shorten(n.label, w - 22 - rightW - 8))}</text>
        ${right ? `<text class="tb-tree-score" x="${x + w - 10}" y="${base}" text-anchor="end">${right}</text>` : ''}`
      if (vh >= ICI_META_MIN) text += `<text class="tb-tree-meta" x="${x + 12}" y="${base + 16}">${esc(shorten(meta, w - 22))}</text>`
    }
    return `<g class="${classes}" data-id="${esc(n.id)}" tabindex="0" role="button" aria-pressed="${selected}" aria-label="${esc(`${n.label}, ${meta}${score ? `, ${scoreName} ${fmtPct(score(n))}` : ''}`)}">
      <title>${esc(`${n.label}\n${meta}`)}</title>
      <rect class="tb-tree-ici-box" x="${x}" y="${y}" width="${w}" height="${h}" fill="${tone(n)}"${stroke}/>
      <rect x="${x}" y="${y}" width="${Math.min(3, w)}" height="${h}" fill="${tone(n)}"/>${text}
    </g>`
  }
  function drawIcicle(v = iciView, deepest = iciView.d + ICI_LEVELS - 1) {
    const r = iciSvg.getBoundingClientRect()
    if (!v || !r.width || !r.height) return
    const [W, H] = [r.width, r.height]
    const colW = W / v.cols
    const ky = H / (v.y1 - v.y0)
    const refocus = iciSvg.contains(document.activeElement) ? document.activeElement.dataset.id : null
    const onPath = new Set(state.selected ? pathTo(state.selected).map(n => n.id) : [])
    let out = ''
    flat.forEach(n => {
      const depth = depthOf.get(n.id)
      if (depth > deepest) return
      const x = (depth - v.d) * colW
      if (x + colW <= 0.5 || x >= W - 0.5) return
      const [a, b] = iciRange.get(n.id)
      const top = (a - v.y0) * ky
      const bottom = (b - v.y0) * ky
      if (bottom <= 0 || top >= H || bottom - top < 0.25) return
      const h = bottom - top > 3 ? bottom - top - 1 : bottom - top
      const vt = Math.max(0, top)
      const vh = Math.min(H, top + h) - vt
      // A column half out of the card during a zoom keeps its colour but not its text.
      const whole = x > -1 && x + colW < W + 1
      out += iciNodeHtml(n, { x: +x.toFixed(2), y: +top.toFixed(2), w: +(colW - 1).toFixed(2), h: +h.toFixed(2), vt, vh: whole ? vh : 0 }, onPath.has(n.id))
    })
    iciSvg.innerHTML = out
    if (refocus) iciSvg.querySelector(`[data-id="${CSS.escape(refocus)}"]`)?.focus()
  }
  function syncIciHeader() {
    $('[data-ici-out]').disabled = iciFocus === root.id
    $('[data-ici-focus]').textContent = iciFocus === root.id ? '' : `Zoomed to ${byId.get(iciFocus).label}`
  }
  // The span zooms on a log scale so the speed looks even whatever the ratio.
  function zoomIcicle(nid) {
    stopFrame(iciAnim)
    iciFocus = nid
    syncIciHeader()
    const from = iciView || iciTarget(nid)
    const to = iciTarget(nid)
    if (reduceMotion.matches || !iciSvg.getBoundingClientRect().height) { iciView = to; drawIcicle(); return }
    const deepest = Math.max(from.d, to.d) + ICI_LEVELS - 1
    const [s0, s1] = [from.y1 - from.y0, to.y1 - to.y0]
    let start = null
    const step = now => {
      if (start === null) start = now
      const t = Math.min(1, (now - start) / ICI_MS)
      const e = easeOut(t)
      const span = Math.exp(Math.log(s0) + (Math.log(s1) - Math.log(s0)) * e)
      const f = Math.abs(s0 - s1) > 1e-9 ? (s0 - span) / (s0 - s1) : e
      const y0 = from.y0 + (to.y0 - from.y0) * f
      iciView = { y0, y1: y0 + span, d: from.d + (to.d - from.d) * e, cols: from.cols + (to.cols - from.cols) * e }
      if (t < 1) { drawIcicle(iciView, deepest); iciAnim = nextFrame(step) } else { iciView = to; drawIcicle() }
    }
    iciAnim = nextFrame(step)
  }
  const zoomIcicleOut = () => { if (iciFocus !== root.id) zoomIcicle(parentOf.get(iciFocus).id) }
  function syncIcicle() {
    if (!iciView) iciView = iciTarget(iciFocus)
    syncIciHeader()
    const sel = state.selected
    const shown = sel && pathTo(sel).some(n => n.id === iciFocus) && depthOf.get(sel) <= depthOf.get(iciFocus) + ICI_LEVELS - 1
    if (sel && !shown) zoomIcicle(byId.get(sel).children || sel === root.id ? sel : parentOf.get(sel).id)
    else drawIcicle()
  }
  function activateIcicle(nid) {
    if (nid === iciFocus && nid !== root.id) return zoomIcicleOut()
    select(nid)
    if (byId.get(nid).children && nid !== iciFocus) zoomIcicle(nid)
  }
  iciSvg.addEventListener('click', e => { const n = e.target.closest('.tb-tree-ici-node'); if (n) activateIcicle(n.dataset.id) })
  iciSvg.addEventListener('keydown', e => {
    const n = e.target.closest('.tb-tree-ici-node')
    if (!n || (e.key !== 'Enter' && e.key !== ' ')) return
    e.preventDefault()
    activateIcicle(n.dataset.id)
  })
  $('[data-ici-out]').addEventListener('click', zoomIcicleOut)
  new ResizeObserver(() => { if (state.mode === 'icicle' && iciView) drawIcicle() }).observe(iciCanvas)

  /* Table */

  function renderTable() {
    tableBody.innerHTML = flat.map(n => `<tr data-id="${esc(n.id)}" tabindex="0">
        <td class="tb-tree-table-name" style="--_depth: ${depthOf.get(n.id)}">${esc(n.label)}</td>
        <td class="is-num">${esc(sizeText(n))}</td>
        <td class="is-num">${fmtPct(size(n) / total)}</td>
        ${columns.map(c => `<td${c.num ? ' class="is-num"' : ''}>${c.html(n)}</td>`).join('')}
        ${score ? `<td class="is-num">${scoreHtml(n)}</td>` : ''}
      </tr>`).join('')
  }
  function syncTable() {
    const wrap = $('.tb-tree-table-wrap')
    tableBody.querySelectorAll('tr').forEach(tr => {
      const on = tr.dataset.id === state.selected
      tr.classList.toggle('is-selected', on)
      if (!on || state.mode !== 'table') return
      const head = wrap.querySelector('thead').offsetHeight
      if (tr.offsetTop - head < wrap.scrollTop) wrap.scrollTop = tr.offsetTop - head
      else if (tr.offsetTop + tr.offsetHeight > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = tr.offsetTop + tr.offsetHeight - wrap.clientHeight
    })
  }
  const onRow = e => {
    const tr = e.target.closest('tr[data-id]')
    if (!tr || (e.type === 'keydown' && (e.target !== tr || (e.key !== 'Enter' && e.key !== ' ')))) return
    e.preventDefault()
    select(tr.dataset.id, true)
  }
  tableBody.addEventListener('click', onRow)
  tableBody.addEventListener('keydown', onRow)

  /* Selection and opening */

  function select(nid, reveal = false) {
    if (!byId.has(nid)) return
    state.selected = nid
    if (reveal) pathTo(nid).slice(0, -1).forEach(n => state.collapsed.delete(n.id))
    renderTree()
    syncTable()
    if (reveal && state.mode === 'tree') ensureVisible(nid)
    if (state.mode === 'columns') renderColumns()
    if (state.mode === 'icicle') syncIcicle()
    onSelect(byId.get(nid))
  }
  function toggle(nid) {
    const shut = !state.collapsed.has(nid)
    if (shut) state.collapsed.add(nid)
    else state.collapsed.delete(nid)
    // A selection that just got hidden goes to the branch that closed.
    if (shut && state.selected && state.selected !== nid && pathTo(state.selected).some(n => n.id === nid)) {
      state.selected = nid
      syncTable()
      onSelect(byId.get(nid))
    }
    animateTree(nid)
  }
  // The selection is set first without a redraw, so the open or close animation runs once.
  function activateNode(nid) {
    if (!byId.get(nid).children) return select(nid)
    state.selected = nid
    syncTable()
    onSelect(byId.get(nid))
    toggle(nid)
  }
  svg.addEventListener('click', e => { const n = e.target.closest('.tb-tree-node'); if (n) activateNode(n.dataset.id) })
  svg.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const n = e.target.closest('.tb-tree-node')
    if (!n) return
    e.preventDefault()
    activateNode(n.dataset.id)
  })
  card.addEventListener('click', e => { const b = e.target.closest('[data-select]'); if (b) select(b.dataset.select, true) })

  /* The view switch. The last choice is remembered in this browser. */

  function setMode(mode, remember = true) {
    state.mode = mode
    card.dataset.mode = mode
    card.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === mode)))
    card.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== mode })
    card.querySelectorAll('[data-when]').forEach(p => { p.hidden = p.dataset.when !== mode })
    if (remember) try { localStorage.setItem(storageKey, mode) } catch { /* private mode */ }
    // Labels are measured on screen, so the tree is drawn again once it is visible.
    if (mode === 'tree') { renderTree(); if (!fitted) fit() }
    if (mode === 'columns') { shownCols = columnParents(); renderColumns() }
    if (mode === 'icicle') syncIcicle()
    if (mode === 'table') syncTable()
  }
  card.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.view)))

  // The shell moved the menu, so the canvas changed size and the tree is fitted again.
  document.addEventListener('shell:dock', () => { if (state.mode === 'tree') requestAnimationFrame(fit) })
  // Expanded, the live pane moves into the full-screen view, so pan, zoom and selection keep
  // working. Closing puts it back.
  setExpandRender(card, host => {
    const pane = card.querySelector(`[data-pane="${state.mode}"]`)
    const home = pane.parentNode
    const next = pane.nextSibling
    host.append(pane)
    if (state.mode === 'tree') fit()
    if (state.mode === 'icicle') drawIcicle()
    return () => { home.insertBefore(pane, next); if (state.mode === 'tree') fit(); if (state.mode === 'icicle') drawIcicle() }
  })

  renderTable()
  renderTree()
  tb.init(card)
  setMode(state.mode, false)
  if (state.mode === 'tree') requestAnimationFrame(fit)

  return {
    select,
    setMode,
    toggle,
    selected: () => (state.selected ? byId.get(state.selected) : null),
    byId, pathTo, parentOf,
  }
}
