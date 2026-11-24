// Edit mode: a layout editor for a page, like the page builders in analyst products. The page marks
// each movable section with data-tb-section="<stable id>" on a direct child of its main; a section
// that holds a side column of several cards is one section.
//
// The layout is rows of columns of sections. A row runs the full width, its columns share it by
// weight (--span, twelve to a row), and a column stacks its sections. Dropping a section on
// the top or bottom half of another stacks it in that column; on the left or right edge of a column
// it makes a new column there; on the top or bottom edge of a row it makes a new row. A row holds
// three columns at most. The line between two columns drags to resize them, and snaps to a
// quarter, a third, a half, two thirds or three quarters of the row; no column is narrower than a
// quarter. Add row puts an empty row of three columns, 50, 25 and 25 %, at the end of the page:
// its columns stay when empty, each with an Add widget slot while editing, and a row left with
// nothing in it goes when editing ends. While editing, every section gets a floating toolbar
// (drag handle, up, down, remove) and a bar at the top holds Add widget, Add row, Reset layout
// and Done.
// The layout is saved per page in localStorage and restored on load. With no saved edit and edit
// mode off, the page keeps its own layout untouched: rows and columns exist only while editing or
// once a layout is saved.
//
//   const edit = mountEditMode({ main, page: 'graphs', button })
//   edit.enter()  edit.exit()  edit.toggle()  edit.reset()  edit.addWidget('bars')  edit.addRow()
//   edit.isEditing()
//   edit.destroy()  leaves edit mode and hands the page its sections back as direct children
//
// Options: main (required), page (the storage key, 'tb-layout:<page>'), button (an element that
// toggles edit mode and shows aria-pressed), widgets (the catalogue of widget types), note (a line under the catalogue intro).
// Optional per-section attributes: data-tb-span (the width when the section is hidden at the
// moment the layout is measured) and data-tb-label (the name used in labels and announcements).
// After every layout change it fires 'tb:layout' on document, and 'shell:dock' so pages that
// already refit on a dock change draw their charts again at the new widths.
// Keyboard, on a section's handle: up and down move it through its column and out into a new row,
// left and right move it to the next column, Home and End send it first or last. On the line
// between two columns: left and right resize.
// Screenshot flags: #edit opens edit mode, #edit-catalog also opens the catalogue.
//
// The product passes its widget catalogue in (widgets) with an optional line for the catalogue
// dialog (note). The engine reads no product data.
import { tb } from './tabula.js'
import { openDialog, closeDialog } from './behaviours-surfaces.js'

const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const I = {
  grip: lucide('<circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />'),
  up: lucide('<path d="m5 12 7-7 7 7" /><path d="M12 19V5" />'),
  down: lucide('<path d="M12 5v14" /><path d="m19 12-7 7-7-7" />'),
  trash: lucide('<path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />'),
  plus: lucide('<path d="M5 12h14" /><path d="M12 5v14" />'),
  columns: lucide('<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="M15 3v18" />'),
  reset: lucide('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />'),
  check: lucide('<path d="M20 6 9 17l-5-5" />'),
  close: lucide('<path d="M18 6 6 18" /><path d="m6 6 12 12" />'),
  ruler: lucide('<path d="M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13" /><path d="m8 6 2-2" /><path d="m18 16 2-2" /><path d="m17 11 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17" /><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" />'),
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: true }
const DRAG_START = 4
const ROW = 'tb-edit-row'
const COL = 'tb-edit-col'
const MIN_SPAN = 3 // a quarter of the row
const MAX_COLS = 3
const SNAPS = [3, 4, 6, 8, 9] // where the line between two columns lands: 25, 33, 50, 67 and 75 % of the row
const NAKED = [6, 3, 3] // a new empty row: 50, 25 and 25 %
const round2 = n => Math.round(n * 100) / 100
const COL_EDGE = 0.22 // the share of a column, on each side, where a drop makes a new column
const ROW_EDGE = 14 // the band, in px, at the top and bottom of a row where a drop makes a new row

// The widget catalogue, a dialog of widgets grouped by kind. Built on first open. Shared with the
// stage zones (zone.js), which pass a shorter list: four or fewer show as one row, with no group
// headings, since a heading over each single widget only makes the dialog taller.
//   const catalog = widgetCatalog({ id, widgets, intro, onPick: type => {} })
//   catalog.open(returnFocusTo)
export function widgetCatalog({ id, widgets, intro, onPick }) {
  let el = null
  function open(returnTo) {
    if (!el) {
      const groups = widgets.length <= 4 ? [null] : [...new Set(widgets.map(w => w.group))]
      el = document.createElement('div')
      el.className = 'tb-dialog-backdrop'
      el.id = id
      el.innerHTML = `<div class="tb-dialog tb-dialog--lg" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
          <div class="tb-dialog-header">
            <h2 class="tb-dialog-title" id="${id}-title">Add a widget</h2>
            <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-tb-dialog-close aria-label="Close">${I.close}</button>
          </div>
          <div class="tb-dialog-body tb-stack">
            <p class="tb-text tb-text--sm tb-text--muted">${esc(intro)}</p>
            <div class="tb-widget-catalog">${groups.map(g => `${g ? `<h3 class="tb-widget-catalog-title">${esc(g)}</h3>` : ''}${widgets.filter(w => !g || w.group === g).map(w => `
              <button class="tb-widget-option" type="button" data-widget="${w.type}">
                <span class="tb-widget-option-preview">${w.preview || ''}</span>
                <span class="tb-widget-option-text"><span class="tb-widget-option-name">${esc(w.name)}</span><span class="tb-widget-option-desc">${esc(w.desc)}</span></span>
              </button>`).join('')}`).join('')}</div>
          </div>
        </div>`
      document.body.append(el)
      el.addEventListener('click', e => {
        const option = e.target.closest('[data-widget]')
        if (!option) return
        closeDialog(el)
        onPick(option.dataset.widget)
      })
    }
    openDialog(el, returnTo)
  }
  return { open }
}

let live = null
let uid = 0
function announce(text) {
  if (!live) {
    live = document.createElement('div')
    live.className = 'tb-sr-only'
    live.setAttribute('aria-live', 'polite')
    document.body.append(live)
  }
  live.textContent = ''
  setTimeout(() => { live.textContent = text }, 30)
}

export function mountEditMode({ main, page = location.pathname, button = null, widgets = [], note = '' } = {}) {
  if (!main) throw new Error('mountEditMode needs a main element')
  const key = `tb-layout:${page}`
  const byType = Object.fromEntries(widgets.map(w => [w.type, w]))
  const original = [...main.children]
  let editing = false
  let customised = false
  let changed = false
  let drag = null
  let resize = null
  let settleTimer = 0
  let saveTimer = 0

  /* Sections, rows and columns */

  const isSection = el => el.nodeType === 1 && el.hasAttribute('data-tb-section')
  const rows = () => [...main.children].filter(el => el.classList.contains(ROW))
  const colsOf = row => [...row.children].filter(el => el.classList.contains(COL))
  const itemsOf = col => [...col.children].filter(isSection)
  const sections = () => [...main.children].filter(isSection).concat(rows().flatMap(r => colsOf(r).flatMap(itemsOf)))
  const idOf = el => el.getAttribute('data-tb-section')
  const find = id => sections().find(el => idOf(el) === id)
  const isWidget = el => el.hasAttribute('data-tb-widget')
  const isRemoved = el => el.classList.contains('is-removed')
  const shown = el => !isRemoved(el) && el.getClientRects().length > 0
  const visible = () => sections().filter(shown)
  const spanOf = el => +el.style.getPropertyValue('--span') || 12
  const colOf = el => (el.parentElement?.classList.contains(COL) ? el.parentElement : null)
  const rowOf = el => colOf(el)?.parentElement || null
  const liveItems = col => itemsOf(col).filter(el => !isRemoved(el))
  // A kept row, made by Add row, keeps its columns when they are empty.
  const isKept = row => !!row && row.hasAttribute('data-tb-keep')
  const liveCols = row => (isKept(row) ? colsOf(row) : colsOf(row).filter(c => liveItems(c).length))
  const holes = () => rows().filter(isKept).flatMap(colsOf).filter(c => !liveItems(c).length)
  const liveRows = () => rows().filter(r => liveCols(r).length)
  const isFit = () => !!main.closest('.tb-page--fit') && window.innerWidth > 1180
  function titleOf(el) {
    const by = el.getAttribute('aria-labelledby')
    return (el.dataset.tbLabel || el.getAttribute('aria-label') || (by && document.getElementById(by)?.textContent)
      || el.querySelector('.tb-card-title, .tb-callout-title, h2, h3')?.textContent || 'Section').trim()
  }
  const where = el => `row ${liveRows().indexOf(rowOf(el)) + 1}, column ${liveCols(rowOf(el)).indexOf(colOf(el)) + 1}`
  sections().forEach(el => el.classList.add('tb-edit-section'))

  function makeCol(span) {
    const col = document.createElement('div')
    col.className = COL
    col.style.setProperty('--span', span)
    return col
  }
  function makeRow(cols = [], keep = false) {
    const row = document.createElement('div')
    row.className = ROW
    if (keep) row.setAttribute('data-tb-keep', '')
    row.append(...cols)
    return row
  }
  const place = row => main.insertBefore(row, slot.isConnected ? slot : null)

  // Lays the sections out as the model says: [{ cols: [{ span, items: [section] }] }]. A section the
  // model leaves out gets a row of its own at the end.
  function wrap(model) {
    const old = rows()
    const placed = new Set()
    const built = model.map(r => makeRow(r.cols.filter(c => c.items.length || r.keep).map(c => {
      const col = makeCol(c.span)
      c.items.forEach(el => { col.append(el); placed.add(el) })
      return col
    }), r.keep)).filter(r => r.children.length)
    sections().filter(el => !placed.has(el)).forEach(el => {
      const col = makeCol(+el.dataset.tbSpan || 12)
      col.append(el)
      built.push(makeRow([col]))
    })
    old.forEach(r => r.remove())
    built.forEach(place)
    main.classList.add('tb-edit-grid')
  }

  // Back to a flat list of sections, in the page's own order, widgets last.
  function unwrap() {
    const rank = el => { const i = original.indexOf(el); return i === -1 ? Infinity : i }
    const list = sections().sort((a, b) => rank(a) - rank(b))
    const first = rows()[0] || (slot.isConnected ? slot : null)
    list.forEach(el => main.insertBefore(el, first))
    rows().forEach(r => r.remove())
  }

  // A column left with no section gives its width to a neighbour; a row left with no column goes.
  // A kept row keeps its empty columns.
  function tidy() {
    rows().forEach(r => {
      colsOf(r).forEach(c => {
        if (itemsOf(c).length || isKept(r)) return
        const prev = c.previousElementSibling
        const next = c.nextElementSibling
        const n = prev?.classList.contains(COL) ? prev : next?.classList.contains(COL) ? next : null
        if (n) n.style.setProperty('--span', round2(spanOf(n) + spanOf(c)))
        c.remove()
      })
      if (!colsOf(r).length) r.remove()
    })
  }

  // A row takes a new column while it has fewer than three. A section alone in its column, moving
  // within its own row, frees its place. A kept row has its three columns already.
  function roomFor(row, el = null) {
    if (isKept(row)) return false
    const own = el && colOf(el)
    return liveCols(row).filter(c => !(c === own && liveItems(c).length === 1)).length < MAX_COLS
  }

  // Where a section goes: { kind: 'stack', ref: section, before } beside another section in its
  // column, { kind: 'col', ref: column, before } as a new column, { kind: 'row', ref: row, before }
  // as a new row, { kind: 'fill', ref: column } into an empty column of a kept row. Two columns
  // share a row in halves; a third makes it 50, 25 and 25 %, the half going to the wider of the two
  // already there.
  function placeAt(el, t) {
    if (t.kind === 'stack') {
      if (t.before) t.ref.before(el)
      else t.ref.after(el)
    } else if (t.kind === 'fill') {
      t.ref.append(el)
    } else if (t.kind === 'col') {
      const row = t.ref.parentElement
      const from = colOf(el)
      el.remove()
      if (from && from !== t.ref && from.parentElement === row && !itemsOf(from).length) from.remove()
      const others = liveCols(row)
      const col = makeCol(6)
      col.append(el)
      if (t.before) t.ref.before(col)
      else t.ref.after(col)
      if (others.length === 1) others[0].style.setProperty('--span', 6)
      else if (others.length === 2) {
        const other = others.find(c => c !== t.ref)
        const wide = spanOf(other) >= spanOf(t.ref) ? other : t.ref
        others.forEach(c => c.style.setProperty('--span', c === wide ? 6 : 3))
        col.style.setProperty('--span', 3)
      }
    } else {
      const col = makeCol(12)
      col.append(el)
      const row = makeRow([col])
      if (t.before) t.ref.before(row)
      else t.ref.after(row)
    }
    tidy()
  }

  // A drop that would leave the layout as it is.
  function isNoop(el, t) {
    if (t.kind === 'fill') return false
    const col = colOf(el)
    const row = rowOf(el)
    const aloneInCol = liveItems(col).length === 1
    if (t.kind === 'stack') {
      if (colOf(t.ref) !== col) return false
      const list = liveItems(col)
      const i = list.indexOf(el)
      const j = list.indexOf(t.ref) + (t.before ? 0 : 1)
      return j === i || j === i + 1
    }
    if (t.kind === 'col') {
      if (!aloneInCol || t.ref.parentElement !== row) return false
      const cols = liveCols(row)
      const i = cols.indexOf(col)
      const j = cols.indexOf(t.ref) + (t.before ? 0 : 1)
      return j === i || j === i + 1
    }
    if (!aloneInCol || liveCols(row).length !== 1) return false
    const list = liveRows()
    const i = list.indexOf(row)
    const j = list.indexOf(t.ref) + (t.before ? 0 : 1)
    return j === i || j === i + 1
  }

  // The keyboard's moves, as a place to go, or null at the edge of the page.
  function stepTarget(el, dir) {
    const col = colOf(el)
    const row = rowOf(el)
    if (!col) return null
    const items = liveItems(col)
    const i = items.indexOf(el)
    const cols = liveCols(row)
    const ci = cols.indexOf(col)
    const all = liveRows()
    const ri = all.indexOf(row)
    const shared = items.length > 1 || cols.length > 1
    if (dir === 'up') {
      if (i > 0) return { kind: 'stack', ref: items[i - 1], before: true }
      if (shared) return { kind: 'row', ref: row, before: true }
      return ri > 0 ? { kind: 'row', ref: all[ri - 1], before: true } : null
    }
    if (dir === 'down') {
      if (i < items.length - 1) return { kind: 'stack', ref: items[i + 1], before: false }
      if (shared) return { kind: 'row', ref: row, before: false }
      return ri < all.length - 1 ? { kind: 'row', ref: all[ri + 1], before: false } : null
    }
    if (dir === 'left' || dir === 'right') {
      const n = cols[ci + (dir === 'left' ? -1 : 1)]
      if (n) { const list = liveItems(n); return list.length ? { kind: 'stack', ref: list[list.length - 1], before: false } : { kind: 'fill', ref: n } }
      return items.length > 1 && roomFor(row) ? { kind: 'col', ref: col, before: dir === 'left' } : null
    }
    if (dir === 'first') return visible()[0] === el && !shared ? null : { kind: 'row', ref: all[0], before: true }
    if (dir === 'last') return visible().at(-1) === el && !shared ? null : { kind: 'row', ref: all.at(-1), before: false }
    return null
  }

  /* Parts of the edit state, built once */

  const bar = document.createElement('div')
  bar.className = 'tb-edit-bar'
  bar.setAttribute('role', 'region')
  bar.setAttribute('aria-label', 'Layout editing')
  bar.innerHTML = `<span class="tb-edit-bar-title">${I.ruler}Editing layout</span>
    <span class="tb-edit-bar-hint">Drag a section by its handle: beside another to make a column, up to three in a row, or above or below to stack. Drag the line between columns to resize. Changes are saved as you go.</span>
    <div class="tb-edit-bar-actions">
      <button class="tb-button" type="button" data-edit="add" aria-haspopup="dialog">${I.plus}Add widget</button>
      <button class="tb-button" type="button" data-edit="row">${I.columns}Add row</button>
      <button class="tb-button" type="button" data-edit="reset">${I.reset}Reset layout</button>
      <button class="tb-button tb-button--primary" type="button" data-edit="done">${I.check}Done</button>
    </div>`
  const addBtn = bar.querySelector('[data-edit="add"]')

  // The end of the rows while editing, an anchor that keeps the rows ahead of the drop marker.
  const slot = document.createElement('span')
  slot.className = 'tb-edit-end'
  slot.setAttribute('aria-hidden', 'true')

  const marker = document.createElement('div')
  marker.className = 'tb-edit-drop'
  marker.hidden = true
  marker.setAttribute('aria-hidden', 'true')

  const toolbarHtml = title => `<div class="tb-edit-toolbar" role="toolbar" aria-label="Layout of ${esc(title)}">
      <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-edit-handle" type="button" data-edit="handle" aria-roledescription="drag handle" aria-label="Move ${esc(title)}, with the arrow keys" data-tb-tooltip="Drag, or use the arrow keys">${I.grip}</button>
      <span class="tb-divider tb-divider--vertical"></span>
      <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-edit="up" aria-label="Move ${esc(title)} up" data-tb-tooltip="Move up">${I.up}</button>
      <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-edit="down" aria-label="Move ${esc(title)} down" data-tb-tooltip="Move down">${I.down}</button>
      <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-edit-delete" type="button" data-edit="remove" aria-label="Remove ${esc(title)}" data-tb-tooltip="Remove">${I.trash}</button>
    </div>`

  function decorate(el) {
    el.classList.add('tb-edit-section')
    if (el.querySelector(':scope > .tb-edit-toolbar')) return
    el.classList.toggle('is-anchor', getComputedStyle(el).position === 'static')
    el.insertAdjacentHTML('beforeend', toolbarHtml(titleOf(el)))
    tb.init(el.lastElementChild)
  }

  // An empty column of a kept row shows a slot that opens the catalogue for that column.
  const holeHtml = `<button class="tb-edit-hole" type="button" data-edit="fill" aria-haspopup="dialog">${I.plus}<span>Add widget</span></button>`
  function syncHoles() {
    rows().filter(isKept).forEach(r => colsOf(r).forEach(c => {
      const hole = c.querySelector(':scope > .tb-edit-hole')
      const empty = !liveItems(c).length
      if (editing && empty && !hole) c.insertAdjacentHTML('afterbegin', holeHtml)
      else if ((!editing || !empty) && hole) hole.remove()
    }))
  }

  // The line between a column and the next one, to resize them.
  function decorateCols() {
    rows().forEach(r => colsOf(r).forEach(c => {
      if (c.querySelector(':scope > .tb-edit-resize')) return
      const h = document.createElement('div')
      h.className = 'tb-edit-resize'
      h.tabIndex = 0
      h.setAttribute('role', 'separator')
      h.setAttribute('aria-orientation', 'vertical')
      h.setAttribute('aria-label', 'Column width. Drag, or use the left and right arrow keys')
      c.append(h)
    }))
  }

  // Pages redraw some sections from script. The toolbar comes back whenever one is wiped.
  const watcher = new MutationObserver(() => {
    if (!editing) return
    sections().forEach(el => { if (!el.querySelector(':scope > .tb-edit-toolbar')) decorate(el) })
  })

  function sync() {
    if (editing) decorateCols()
    syncHoles()
    const list = visible()
    const left = main.getBoundingClientRect().left
    list.forEach(el => {
      const tools = el.querySelector(':scope > .tb-edit-toolbar')
      if (!tools) return
      tools.querySelector('[data-edit="up"]').disabled = !stepTarget(el, 'up')
      tools.querySelector('[data-edit="down"]').disabled = !stepTarget(el, 'down')
      // A narrow section in the first column keeps its toolbar on screen by anchoring it left.
      const r = el.getBoundingClientRect()
      const narrow = r.width < tools.offsetWidth + 8 && r.left - left < tools.offsetWidth
      tools.style.left = narrow ? 'var(--tb-space-1)' : ''
      tools.style.right = narrow ? 'auto' : ''
    })
    rows().forEach(r => {
      const cols = liveCols(r)
      colsOf(r).forEach(c => {
        const h = c.querySelector(':scope > .tb-edit-resize')
        if (!h) return
        const i = cols.indexOf(c)
        h.hidden = i === -1 || i === cols.length - 1
        if (h.hidden) return
        h.setAttribute('aria-valuemin', MIN_SPAN)
        h.setAttribute('aria-valuemax', Math.round(spanOf(c) + spanOf(cols[i + 1]) - MIN_SPAN))
        h.setAttribute('aria-valuenow', Math.round(spanOf(c)))
      })
    })
    bar.querySelector('[data-edit="reset"]').disabled = !customised
  }

  function notify() {
    document.dispatchEvent(new CustomEvent('tb:layout', { detail: { main, editing } }))
    document.dispatchEvent(new CustomEvent('shell:dock', { detail: { left: document.documentElement.classList.contains('tb-nav-left') } }))
  }

  /* Measuring the page's own layout into rows and columns */

  // Sections whose heights overlap share a row; within a row, sections whose widths overlap share
  // a column. A column's width becomes its exact share of twelve, so the page looks the same.
  function measureModel() {
    const items = []
    const hidden = []
    sections().forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && !isRemoved(el)) items.push({ el, r })
      else hidden.push(el)
    })
    items.sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left)
    const groups = []
    items.forEach(it => {
      const g = groups.at(-1)
      if (g && it.r.top < g.bottom - 4) { g.items.push(it); g.bottom = Math.max(g.bottom, it.r.bottom) }
      else groups.push({ bottom: it.r.bottom, items: [it] })
    })
    const colGroups = groups.map(({ items: list }) => {
      const cols = []
      list.slice().sort((a, b) => a.r.left - b.r.left).forEach(it => {
        const c = cols.find(k => it.r.left < k.right - 4 && it.r.right > k.left + 4)
        if (c) { c.items.push(it); c.left = Math.min(c.left, it.r.left); c.right = Math.max(c.right, it.r.right) }
        else cols.push({ left: it.r.left, right: it.r.right, items: [it] })
      })
      return cols.sort((a, b) => a.left - b.left)
    })
    // A lone column that sits under one column of the row above belongs to that column: the page
    // stacks it there, with the neighbouring column running down beside both.
    const merged = []
    colGroups.forEach(cols => {
      const prev = merged.at(-1)
      const host = prev && prev.length > 1 && cols.length === 1 && prev.find(k => cols[0].left >= k.left - 4 && cols[0].right <= k.right + 4)
      if (host) host.items.push(...cols[0].items)
      else merged.push(cols)
    })
    const model = merged.map(cols => {
      const width = cols.reduce((s, c) => s + c.right - c.left, 0)
      return { cols: cols.map(c => ({ span: round2((12 * (c.right - c.left)) / width), items: c.items.sort((a, b) => a.r.top - b.r.top).map(it => it.el) })) }
    })
    hidden.forEach(el => model.push({ cols: [{ span: +el.dataset.tbSpan || 12, items: [el] }] }))
    return model
  }

  /* Motion: every section slides from where it was to where it lands. */

  function flip(mutate) {
    if (reduced.matches) { mutate(); return }
    const first = new Map()
    sections().forEach(el => { if (el.isConnected && el.getClientRects().length) first.set(el, el.getBoundingClientRect()) })
    mutate()
    const moved = []
    first.forEach((a, el) => {
      if (!el.isConnected || !el.getClientRects().length) return
      const b = el.getBoundingClientRect()
      const dx = a.left - b.left
      const dy = a.top - b.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      el.classList.remove('is-settling')
      el.style.transform = `translate(${dx}px, ${dy}px)`
      moved.push(el)
    })
    if (!moved.length) return
    void main.offsetWidth
    moved.forEach(el => { el.classList.add('is-settling'); el.style.transform = '' })
    clearTimeout(settleTimer)
    settleTimer = setTimeout(() => sections().forEach(el => el.classList.remove('is-settling')), 420)
  }

  /* Persistence */

  function record() {
    const list = sections()
    return {
      v: 2,
      rows: rows().map(r => ({
        ...(isKept(r) ? { keep: true } : {}),
        cols: colsOf(r).map(c => ({ span: spanOf(c), items: itemsOf(c).filter(el => !(isWidget(el) && isRemoved(el))).map(idOf) }))
          .filter(c => c.items.length || isKept(r)),
      })).filter(r => r.cols.length),
      removed: list.filter(el => isRemoved(el) && !isWidget(el)).map(idOf),
      widgets: Object.fromEntries(list.filter(el => isWidget(el) && !isRemoved(el)).map(el => {
        const type = el.dataset.tbWidget
        return [idOf(el), { type, ...(byType[type]?.read?.(el) || {}) }]
      })),
    }
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(record())) } catch { /* private mode: the layout lasts until reload */ }
    customised = true
    changed = true
    sync()
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
  }

  // A saved layout as a model. Version 1 was an ordered list with a width each, packed into rows.
  function modelFrom(rec) {
    if (rec.v === 2) return (rec.rows || []).map(r => ({ keep: !!r.keep, cols: r.cols.map(c => ({ span: c.span, items: c.items.map(find).filter(Boolean) })) }))
    const model = []
    let used = 12
    ;(rec.order || []).map(find).filter(Boolean).forEach(el => {
      const span = Math.min(12, rec.spans?.[idOf(el)] || 12)
      if (used + span > 12) { model.push({ cols: [] }); used = 0 }
      model.at(-1).cols.push({ span, items: [el] })
      used += span
    })
    return model
  }

  function createWidget(type, id, saved) {
    const def = byType[type]
    if (!def) return null
    const built = def.build(saved)
    const el = document.createElement('section')
    el.className = `${built.className} tb-edit-section`
    el.dataset.tbSection = id
    el.dataset.tbWidget = type
    el.dataset.tbSpan = def.span
    el.setAttribute('aria-label', def.name)
    el.innerHTML = built.html
    main.insertBefore(el, slot.isConnected ? slot : null)
    tb.init(el)
    if (built.mount) built.mount(el)
    return el
  }

  function applySaved(rec) {
    Object.entries(rec.widgets || {}).forEach(([id, w]) => { if (!find(id)) createWidget(w.type, id, w) })
    sections().forEach(el => el.classList.toggle('is-removed', !isWidget(el) && (rec.removed || []).includes(idOf(el))))
    wrap(modelFrom(rec))
    if (editing) { sections().forEach(decorate); decorateCols() }
  }

  /* Actions */

  function moveTo(el, t, focus = true) {
    if (!t || isNoop(el, t)) return
    flip(() => placeAt(el, t))
    if (focus) el.querySelector('.tb-edit-handle')?.focus({ preventScroll: true })
    el.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' })
    save()
    notify()
    announce(`${titleOf(el)} moved to ${where(el)}.`)
  }

  function remove(el) {
    const list = visible()
    const next = list[list.indexOf(el) + 1] || list[list.indexOf(el) - 1]
    const title = titleOf(el)
    flip(() => el.classList.add('is-removed'))
    ;(next?.querySelector('.tb-edit-handle') || addBtn).focus({ preventScroll: true })
    save()
    notify()
    tb.toast({
      message: `${title} removed from the page.`,
      action: {
        label: 'Undo',
        onClick: () => {
          flip(() => el.classList.remove('is-removed'))
          save()
          notify()
          if (editing) el.querySelector('.tb-edit-handle')?.focus()
          announce(`${title} is back.`)
        },
      },
      timeout: 6000,
    })
  }

  function reset() {
    const before = record()
    try { localStorage.removeItem(key) } catch { /* ignore */ }
    customised = false
    flip(() => {
      sections().filter(isWidget).forEach(el => el.remove())
      sections().forEach(el => el.classList.remove('is-removed'))
      unwrap()
      original.forEach(node => main.append(node))
      main.classList.remove('tb-edit-grid')
      if (editing) {
        wrap(measureModel())
        main.prepend(bar)
        main.append(slot, marker)
        decorateCols()
      }
    })
    sync()
    notify()
    tb.toast({
      message: 'Layout reset to the page default.',
      action: { label: 'Undo', onClick: () => { flip(() => applySaved(before)); save(); notify() } },
      timeout: 6000,
    })
  }

  // A new widget goes into the column it was asked for, or else the first empty column of a kept
  // row. Otherwise it goes under the widest column of the last row on a fitted page, where the side
  // columns keep the full height, and in a row of its own at the end of any other page.
  function addWidget(type, into = null) {
    if (!rows().length) wrap(measureModel())
    const id = `w-${type}-${Date.now().toString(36)}${(uid += 1).toString(36)}`
    const el = createWidget(type, id)
    if (!el) return null
    const last = liveRows().at(-1)
    const hole = into?.isConnected ? into : holes()[0]
    if (hole) hole.append(el)
    else if (isFit() && last) liveCols(last).reduce((a, c) => (spanOf(c) > spanOf(a) ? c : a)).append(el)
    else { const col = makeCol(12); col.append(el); place(makeRow([col])) }
    if (editing) decorate(el)
    save()
    notify()
    el.classList.add('is-new')
    setTimeout(() => el.classList.remove('is-new'), 1400)
    el.scrollIntoView({ block: 'center', behavior: reduced.matches ? 'auto' : 'smooth' })
    el.querySelector('.tb-edit-handle')?.focus({ preventScroll: true })
    announce(`${byType[type].name} added, ${where(el)}.`)
    return el
  }

  // An empty row of three columns, 50, 25 and 25 %, at the end of the page.
  function addRow() {
    if (!rows().length) wrap(measureModel())
    const row = makeRow(NAKED.map(span => makeCol(span)), true)
    place(row)
    if (editing) decorateCols()
    save()
    notify()
    row.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' })
    row.querySelector('.tb-edit-hole')?.focus({ preventScroll: true })
    announce('A row of three empty columns added, at 50, 25 and 25 percent.')
    return row
  }

  /* Enter and leave */

  function enter() {
    if (editing) return
    editing = true
    changed = false
    flip(() => {
      if (!rows().length) wrap(measureModel())
      main.classList.add('tb-edit')
      main.prepend(bar)
      main.append(slot, marker)
      sections().forEach(decorate)
      decorateCols()
    })
    tb.init(bar)
    watcher.observe(main, { childList: true, subtree: true })
    sync()
    if (button) button.setAttribute('aria-pressed', 'true')
    notify()
    announce('Editing the layout. Each section has a toolbar with a handle, move and remove. The lines between columns resize them.')
  }

  function exit() {
    if (!editing) return
    const hadFocus = main.contains(document.activeElement) && document.activeElement.closest('.tb-edit-toolbar, .tb-edit-bar, .tb-edit-resize')
    editing = false
    watcher.disconnect()
    endDrag(false)
    endResize()
    // A kept row with nothing in it goes.
    const bare = rows().filter(r => isKept(r) && !colsOf(r).some(c => itemsOf(c).length))
    flip(() => {
      bar.remove()
      slot.remove()
      marker.remove()
      bare.forEach(r => r.remove())
      syncHoles()
      sections().forEach(el => { el.querySelector(':scope > .tb-edit-toolbar')?.remove(); el.classList.remove('is-anchor') })
      main.querySelectorAll('.tb-edit-resize').forEach(h => h.remove())
      main.classList.remove('tb-edit', 'is-dragging', 'is-resizing')
      if (!customised) {
        unwrap()
        main.classList.remove('tb-edit-grid')
      }
    })
    if (bare.length) {
      try { localStorage.setItem(key, JSON.stringify(record())) } catch { /* the layout lasts until reload */ }
    }
    if (button) {
      button.setAttribute('aria-pressed', 'false')
      if (hadFocus) button.focus()
    }
    notify()
    if (changed) tb.toast({ message: 'Layout saved. The page opens like this next time, on this computer.', intent: 'success' })
    else announce('Left the layout editor.')
  }

  const toggle = () => (editing ? exit() : enter())

  function destroy() {
    exit()
    unwrap()
    main.classList.remove('tb-edit-grid')
  }

  /* Catalogue */

  let into = null // the empty column the catalogue was opened from
  const catalog = widgetCatalog({
    id: `tb-widget-catalog-${String(page).replace(/[^a-z0-9-]/gi, '')}`,
    widgets,
    intro: `The widget goes in the first empty column, or in a row of its own at the end of the page, and moves and resizes like any other section. ${note}`.trim(),
    onPick: type => addWidget(type, into),
  })
  function openCatalog(col = null) {
    into = col
    catalog.open(col?.querySelector('.tb-edit-hole') || addBtn)
  }

  /* Pointer drag */

  function target(x, y) {
    let best = null
    let bestD = Infinity
    const slots = [...main.querySelectorAll('.tb-edit-hole')]
    visible().filter(el => el !== drag.el).concat(slots).forEach(el => {
      const r = el.getBoundingClientRect()
      const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0
      const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0
      const d = Math.hypot(dx, dy)
      if (d < bestD) { bestD = d; best = { el, r } }
    })
    if (!best) return null
    if (best.el.classList.contains('tb-edit-hole')) return { kind: 'fill', ref: best.el.parentElement, hole: best.el, noop: false }
    const col = colOf(best.el)
    const row = rowOf(best.el)
    if (!col) return null
    const rr = row.getBoundingClientRect()
    const cr = col.getBoundingClientRect()
    const sr = best.r
    let t
    if (y < rr.top + ROW_EDGE) t = { kind: 'row', ref: row, before: true }
    else if (y > rr.bottom - ROW_EDGE) t = { kind: 'row', ref: row, before: false }
    else if (x < cr.left + cr.width * COL_EDGE && roomFor(row, drag.el)) t = { kind: 'col', ref: col, before: true }
    else if (x > cr.right - cr.width * COL_EDGE && roomFor(row, drag.el)) t = { kind: 'col', ref: col, before: false }
    else t = { kind: 'stack', ref: best.el, before: y < sr.top + sr.height / 2 }
    return { ...t, rr, cr, sr, noop: isNoop(drag.el, t) }
  }

  // A vertical line where a new column opens, a horizontal one where a section stacks or a row opens.
  function showMarker(t) {
    main.querySelectorAll('.tb-edit-hole.is-over').forEach(h => h.classList.remove('is-over'))
    if (t?.kind === 'fill') { t.hole.classList.add('is-over'); marker.hidden = true; return }
    if (!t || t.noop) { marker.hidden = true; return }
    const m = main.getBoundingClientRect()
    const gap = parseFloat(getComputedStyle(main).rowGap) || 12
    marker.classList.toggle('tb-edit-drop--horizontal', t.kind !== 'col')
    if (t.kind === 'col') {
      Object.assign(marker.style, { top: `${t.rr.top - m.top}px`, height: `${t.rr.height}px`, width: '', left: `${(t.before ? t.cr.left - gap / 2 : t.cr.right + gap / 2) - m.left - 1.5}px` })
    } else {
      const r = t.kind === 'row' ? t.rr : t.sr
      Object.assign(marker.style, { left: `${r.left - m.left}px`, width: `${r.width}px`, height: '', top: `${(t.before ? r.top - gap / 2 : r.bottom + gap / 2) - m.top - 1.5}px` })
    }
    marker.hidden = false
  }

  function endDrag(commit) {
    if (!drag) return
    const d = drag
    drag = null
    marker.hidden = true
    main.querySelectorAll('.tb-edit-hole.is-over').forEach(h => h.classList.remove('is-over'))
    try { d.handle.releasePointerCapture(d.id) } catch { /* already released */ }
    if (!d.started) return
    const t = commit ? d.target : null
    const moves = t && !t.noop
    flip(() => {
      d.el.classList.remove('is-dragging')
      main.classList.remove('is-dragging')
      d.el.style.transform = ''
      if (moves) placeAt(d.el, t)
    })
    d.handle.focus({ preventScroll: true })
    if (moves) {
      save()
      notify()
      announce(`${titleOf(d.el)} moved to ${where(d.el)}.`)
    }
  }

  /* Resizing columns */

  // The line between two columns lands on a quarter, a third, a half, two thirds or three quarters
  // of the row, and leaves each of the two at least a quarter. The row is counted in twelfths.
  function stopsOf(col, next) {
    const cols = liveCols(col.parentElement)
    const total = cols.reduce((s, c) => s + spanOf(c), 0) || 12
    if (Math.abs(total - 12) > 0.01) cols.forEach(c => c.style.setProperty('--span', round2((spanOf(c) * 12) / total)))
    const left = cols.slice(0, cols.indexOf(col)).reduce((s, c) => s + spanOf(c), 0)
    const right = left + spanOf(col) + spanOf(next)
    return { left, right, stops: SNAPS.filter(p => p - left >= MIN_SPAN - 0.01 && right - p >= MIN_SPAN - 0.01) }
  }
  function setEdge(col, next, at, { left, right }) {
    if (Math.abs(left + spanOf(col) - at) < 0.01) return false
    col.style.setProperty('--span', round2(at - left))
    next.style.setProperty('--span', round2(right - at))
    return true
  }
  function startResize(h, e) {
    const col = h.parentElement
    const row = col.parentElement
    const cols = liveCols(row)
    const next = cols[cols.indexOf(col) + 1]
    if (!next) return
    try { h.setPointerCapture(e.pointerId) } catch { /* a synthetic pointer has nothing to capture */ }
    resize = { h, col, next, id: e.pointerId, box: row.getBoundingClientRect(), ...stopsOf(col, next), moved: false }
    h.classList.add('is-active')
    main.classList.add('is-resizing')
  }
  const widthText = col => `Column ${Math.round((spanOf(col) / 12) * 100)} percent of the row.`
  function endResize() {
    if (!resize) return
    const r = resize
    resize = null
    r.h.classList.remove('is-active')
    main.classList.remove('is-resizing')
    try { r.h.releasePointerCapture(r.id) } catch { /* already released */ }
    if (r.moved) {
      save()
      notify()
      announce(widthText(r.col))
    }
  }

  main.addEventListener('pointerdown', e => {
    if (!editing || e.button !== 0) return
    const h = e.target.closest('.tb-edit-resize')
    if (h) { e.preventDefault(); startResize(h, e); return }
    const handle = e.target.closest('.tb-edit-handle')
    if (!handle) return
    e.preventDefault()
    handle.focus({ preventScroll: true })
    try { handle.setPointerCapture(e.pointerId) } catch { /* a synthetic pointer has nothing to capture */ }
    drag = { el: handle.closest('[data-tb-section]'), handle, id: e.pointerId, x0: e.clientX, y0: e.clientY, s0: window.scrollY, started: false, target: null }
  })
  main.addEventListener('pointermove', e => {
    if (resize && e.pointerId === resize.id) {
      const at = ((e.clientX - resize.box.left) / resize.box.width) * 12
      const stop = resize.stops.reduce((a, p) => (a === null || Math.abs(p - at) < Math.abs(a - at) ? p : a), null)
      if (stop !== null && setEdge(resize.col, resize.next, stop, resize)) { resize.moved = true; sync() }
      return
    }
    if (!drag || e.pointerId !== drag.id) return
    const dx = e.clientX - drag.x0
    const dy = e.clientY - drag.y0 + (window.scrollY - drag.s0)
    if (!drag.started) {
      if (Math.hypot(dx, dy) < DRAG_START) return
      drag.started = true
      drag.el.classList.remove('is-settling')
      drag.el.classList.add('is-dragging')
      main.classList.add('is-dragging')
    }
    drag.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.01)`
    drag.target = target(e.clientX, e.clientY)
    showMarker(drag.target)
    // Near the top or bottom of the window the page scrolls, so a section can travel far.
    if (e.clientY < 72) window.scrollBy(0, -14)
    else if (e.clientY > window.innerHeight - 48) window.scrollBy(0, 14)
  })
  main.addEventListener('pointerup', e => {
    if (resize && e.pointerId === resize.id) endResize()
    else if (drag && e.pointerId === drag.id) endDrag(true)
  })
  main.addEventListener('pointercancel', e => {
    if (resize && e.pointerId === resize.id) endResize()
    else if (drag && e.pointerId === drag.id) endDrag(false)
  })

  /* Clicks and keys */

  main.addEventListener('click', e => {
    const b = e.target.closest('[data-edit]')
    if (!editing || !b || !main.contains(b)) return
    const el = b.closest('[data-tb-section]')
    const action = b.dataset.edit
    if (action === 'done') exit()
    else if (action === 'reset') reset()
    else if (action === 'add') openCatalog()
    else if (action === 'row') addRow()
    else if (action === 'fill') openCatalog(b.parentElement)
    else if (!el) return
    else if (action === 'up' || action === 'down') moveTo(el, stepTarget(el, action), false)
    else if (action === 'remove') remove(el)
  })

  main.addEventListener('keydown', e => {
    if (!editing) return
    if (e.key === 'Escape') {
      if (drag) { e.preventDefault(); endDrag(false); return }
      if (!e.target.closest('[contenteditable], input, textarea, select')) { e.preventDefault(); exit(); return }
    }
    const h = e.target.closest && e.target.closest('.tb-edit-resize')
    if (h && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault()
      const col = h.parentElement
      const cols = liveCols(col.parentElement)
      const next = cols[cols.indexOf(col) + 1]
      if (!next) return
      const edge = stopsOf(col, next)
      const now = edge.left + spanOf(col)
      const stop = e.key === 'ArrowLeft' ? edge.stops.filter(p => p < now - 0.01).at(-1) : edge.stops.find(p => p > now + 0.01)
      if (stop !== undefined && setEdge(col, next, stop, edge)) {
        save()
        notify()
        announce(widthText(col))
      }
      return
    }
    const handle = e.target.closest && e.target.closest('.tb-edit-handle')
    if (!handle) return
    const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Home: 'first', End: 'last' }[e.key]
    if (!dir) return
    e.preventDefault()
    const el = handle.closest('[data-tb-section]')
    moveTo(el, stepTarget(el, dir))
  })

  // A note is saved as it is typed.
  main.addEventListener('input', e => {
    if (!e.target.closest || !e.target.closest('[data-tb-widget]')) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(save, 400)
  })

  if (button) {
    button.setAttribute('aria-pressed', 'false')
    button.addEventListener('click', toggle)
  }

  /* Start: a saved layout comes back before the page draws into it. */

  const saved = load()
  if (saved) {
    applySaved(saved)
    customised = true
    notify()
  }
  if (location.hash === '#edit' || location.hash === '#edit-catalog') {
    setTimeout(() => {
      enter()
      if (location.hash === '#edit-catalog') openCatalog()
      // For the screenshot, one toolbar shows: the widest section.
      else visible().sort((a, b) => b.offsetWidth - a.offsetWidth)[0]?.querySelector('.tb-edit-handle')?.focus({ preventScroll: true })
    }, 900)
  }

  return { enter, exit, toggle, reset, addWidget, addRow, destroy, isEditing: () => editing, openCatalog }
}
