// Layout editor template. A free page the user shapes with edit mode and the widget catalogue. It
// opens on a masthead and two cards: one starts from a template of nine widgets in four rows, the
// other from an empty row of three columns. Either way the page is saved in this browser and comes
// back on reload; Clear returns to the choice.
//
// Screenshot flags on the hash, joined with +: #template (builds the template), #scratch (starts
// an empty page), plus #edit and #edit-catalog from edit mode, #light and #dark.
import { tb } from '../src/tabula.js'
import { openDialog } from '../src/behaviours-surfaces.js'
import { mountEditMode } from '../src/edit.js'
import { fmtDay, esc } from '../src/format.js'
import { mountPage } from './shared/nav.js'
import { USER, TODAY } from './shared/data.js'
import { WIDGETS, catalogueNote } from './shared/widgets.js'

const FLAGS = new Set(location.hash.slice(1).split('+').filter(Boolean))
const header = mountPage('editor')

const $ = id => document.getElementById(id)
const main = $('le-main')
const start = $('le-start')
const templateBtn = $('le-template')
const scratchBtn = $('le-scratch')
const clearBtn = $('le-clear')
const empty = $('le-empty')
const PAGE_KEY = 'le-page'
const LAYOUT_KEY = 'tb-layout:editor'
const store = {
  get: key => { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } },
  set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode: lasts until reload */ } },
  drop: key => { try { localStorage.removeItem(key) } catch { /* ignore */ } },
}

/* Masthead: the day and the workspace, and a greeting for the time of day. */

function renderMasthead() {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  $('le-masthead').innerHTML = `<p class="tb-caps le-masthead-kicker">${esc(fmtDay(TODAY))}, ${esc(USER.org)}</p>
    <h2 class="le-masthead-greeting">${part}, ${esc(USER.name.split(' ')[0])}</h2>`
  $('le-context').textContent = catalogueNote
}

/* Edit mode. The shell mounts the editor only when the page has sections on load, so this page
   mounts it itself once there is something to edit, on a fresh button each time. */

let editMode = null
function freshEditButton() {
  const old = document.querySelector('#shell-edit')
  const btn = old.cloneNode(true)
  delete btn.dataset.tbTooltipBound
  old.replaceWith(btn)
  return btn
}
function mountEdit() {
  const btn = freshEditButton()
  btn.hidden = false
  editMode = mountEditMode({ main, page: 'editor', button: btn, widgets: WIDGETS, note: catalogueNote })
  header.editMode = editMode
  tb.init(btn)
}
function unmountEdit() {
  if (editMode) editMode.destroy()
  editMode = null
  header.editMode = null
  freshEditButton().hidden = true
  main.classList.remove('tb-edit-grid', 'tb-edit')
}

/* The two ways to start, and clearing */

// The template: nine widgets in four rows, saved as a layout that edit mode then builds.
const TEMPLATE = {
  v: 2,
  rows: [
    { cols: [{ span: 12, items: ['t-stats'] }] },
    { cols: [{ span: 8, items: ['t-line'] }, { span: 4, items: ['t-donut'] }] },
    { cols: [{ span: 6, items: ['t-bars'] }, { span: 6, items: ['t-countries'] }] },
    { cols: [{ span: 4, items: ['t-risk'] }, { span: 4, items: ['t-activity'] }, { span: 4, items: ['t-note', 't-kpi'] }] },
  ],
  removed: [],
  widgets: { 't-stats': { type: 'stats' }, 't-line': { type: 'line' }, 't-donut': { type: 'donut' }, 't-bars': { type: 'bars' }, 't-countries': { type: 'countries' }, 't-risk': { type: 'risk' }, 't-activity': { type: 'activity' }, 't-note': { type: 'note' }, 't-kpi': { type: 'kpi' } },
}

const state = { mode: null } // 'template' or 'scratch'

function sync() {
  const built = !!state.mode
  start.hidden = built
  $('le-masthead').hidden = built
  clearBtn.hidden = !built
  syncEmpty()
}
// On an empty page, an empty state stands in for the widgets until there is one.
function syncEmpty() {
  const editing = !!editMode?.isEditing()
  const any = [...main.querySelectorAll('[data-tb-section]')].some(el => !el.classList.contains('is-removed'))
  empty.hidden = state.mode !== 'scratch' || editing || any
}

function useTemplate(announce = true) {
  teardown()
  store.set(LAYOUT_KEY, TEMPLATE)
  store.set(PAGE_KEY, { v: 1, mode: 'template' })
  state.mode = 'template'
  mountEdit()
  sync()
  if (announce) tb.toast({ message: 'Template added. Edit page layout moves, resizes and removes its widgets.', intent: 'success' })
}
function useScratch() {
  teardown()
  store.drop(LAYOUT_KEY)
  store.set(PAGE_KEY, { v: 1, mode: 'scratch' })
  state.mode = 'scratch'
  mountEdit()
  sync()
  editMode.enter()
  editMode.addRow()
}
function restore(saved) {
  state.mode = saved.mode
  mountEdit()
  sync()
}
function teardown() {
  unmountEdit()
  main.querySelectorAll('[data-tb-section]').forEach(el => el.remove())
  state.mode = null
}
function clearPage() {
  teardown()
  store.drop(PAGE_KEY)
  store.drop(LAYOUT_KEY)
  sync()
  templateBtn.focus()
  tb.toast({ message: 'Page cleared. The data and the other pages are unchanged.' })
}

templateBtn.addEventListener('click', () => useTemplate())
scratchBtn.addEventListener('click', useScratch)
$('le-empty-add').addEventListener('click', () => {
  editMode.enter()
  if (!main.querySelector('.tb-edit-hole')) editMode.addRow()
})
clearBtn.addEventListener('click', () => openDialog('le-clear-dialog', clearBtn))
$('le-clear-confirm').addEventListener('click', clearPage)
document.addEventListener('tb:layout', syncEmpty)
// Leaving edit mode is not a layout change, so the empty state also follows the button.
document.addEventListener('click', e => { if (e.target.closest('#shell-edit, .tb-edit-bar')) setTimeout(syncEmpty, 0) })

/* Start */

renderMasthead()
tb.init(document.querySelector('.tb-page'))

const saved = store.get(PAGE_KEY)
if (FLAGS.has('template')) useTemplate(false)
else if (FLAGS.has('scratch')) useScratch()
else if (saved && saved.v === 1 && ['template', 'scratch'].includes(saved.mode)) restore(saved)
else sync()
