// Stage zones. A stage page keeps its own cards, its core, where they are: nobody moves or removes
// them. Some stages leave one place for the analyst's own widgets, the zone, usually under the side
// column. The page marks it:
//
//   <div class="tb-zone" data-tb-zone="the side column" data-tb-zone-max="2"
//        data-tb-zone-widgets="summary,kpi,note"></div>
//
// data-tb-zone names the place in sentences, data-tb-zone-max caps the widgets, and
// data-tb-zone-widgets lists the catalogue types that fit there, from the widgets passed in. An empty zone
// takes no room.
// The shell's layout button toggles adding: the bar at the top says what stays and what can be
// added, the zone shows an Add widget slot while it has room, and each widget gets a toolbar to move
// it up or down or remove it. Once the zone is full, the slot turns into a striped warning block that
// says so and, when the page passes overflow ({ href, label }), links to a place with no limit. The widgets are saved per page in localStorage ('tb-zone:<page>').
//
//   const zone = mountZone({ zone, page: 'intake', button, stage: 'Data intake', widgets, note, overflow })
//   zone.enter()  zone.exit()  zone.toggle()  zone.isEditing()
//
// Screenshot flags: #zone opens adding, #zone-catalog also opens the catalogue, #zone-full fills
// the zone with its first widgets (and saves them, like adding them by hand) to show the full state.
// Each joins #nav-left with +, as #zone-full+nav-left.
import { tb } from './tabula.js'
import { widgetCatalog } from './edit.js'

const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const I = {
  up: lucide('<path d="m5 12 7-7 7 7" /><path d="M12 19V5" />'),
  down: lucide('<path d="M12 5v14" /><path d="m19 12-7 7-7-7" />'),
  trash: lucide('<path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />'),
  plus: lucide('<path d="M5 12h14" /><path d="M12 5v14" />'),
  check: lucide('<path d="M20 6 9 17l-5-5" />'),
  alert: lucide('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />'),
  lock: lucide('<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />'),
  pages: lucide('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />'),
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`

let live = null
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

export function mountZone({ zone, page, button = null, stage = 'This stage', widgets: catalogue = [], note = '', overflow = null }) {
  const main = zone.closest('main')
  const key = `tb-zone:${page}`
  const place = zone.dataset.tbZone || 'the side column'
  const max = +zone.dataset.tbZoneMax || 2
  const allowed = (zone.dataset.tbZoneWidgets || '').split(',').map(s => s.trim()).filter(Boolean)
  const widgets = catalogue.filter(w => allowed.includes(w.type))
  const byType = Object.fromEntries(widgets.map(w => [w.type, w]))
  let editing = false
  let uid = 0
  let saveTimer = 0

  const items = () => [...zone.querySelectorAll(':scope > [data-tb-widget]')]
  const titleOf = el => (el.getAttribute('aria-label') || 'Widget').trim()

  /* Persistence */

  function save() {
    const list = items().map(el => ({ id: el.dataset.tbSection, type: el.dataset.tbWidget, ...(byType[el.dataset.tbWidget]?.read?.(el) || {}) }))
    try { localStorage.setItem(key, JSON.stringify(list)) } catch { /* private mode: the widgets last until reload */ }
  }
  function load() {
    try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
  }

  /* Widgets */

  const toolbarHtml = title => `<div class="tb-edit-toolbar" role="toolbar" aria-label="Place of ${esc(title)}">
      <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-zone="up" aria-label="Move ${esc(title)} up" data-tb-tooltip="Move up">${I.up}</button>
      <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-zone="down" aria-label="Move ${esc(title)} down" data-tb-tooltip="Move down">${I.down}</button>
      <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-edit-delete" type="button" data-zone="remove" aria-label="Remove ${esc(title)}" data-tb-tooltip="Remove">${I.trash}</button>
    </div>`

  function decorate(el) {
    if (el.querySelector(':scope > .tb-edit-toolbar')) return
    el.insertAdjacentHTML('beforeend', toolbarHtml(titleOf(el)))
    tb.init(el.lastElementChild)
  }

  function build(type, id, saved) {
    const def = byType[type]
    if (!def) return null
    const built = def.build(saved)
    const el = document.createElement('section')
    el.className = `${built.className} tb-edit-section`
    el.dataset.tbSection = id
    el.dataset.tbWidget = type
    el.setAttribute('aria-label', def.name)
    el.innerHTML = built.html
    zone.insertBefore(el, zone.querySelector(':scope > .tb-zone-slot'))
    tb.init(el)
    if (built.mount) built.mount(el)
    if (editing) decorate(el)
    return el
  }

  // While adding: an Add widget slot while there is room, a callout once full.
  function syncSlot() {
    zone.querySelector(':scope > .tb-zone-slot')?.remove()
    if (!editing) return
    const n = items().length
    const html = n < max
      ? `<button class="tb-zone-slot tb-zone-add" type="button" data-zone="add" aria-haspopup="dialog"><span class="tb-zone-add-icon">${I.plus}</span><span class="tb-zone-add-label">Add widget</span><span class="tb-zone-count">${n} of ${max} in ${esc(place)}</span></button>`
      : `<div class="tb-zone-slot tb-zone-full" role="status">${I.alert}<strong class="tb-zone-full-title">No room for more widgets</strong>
          <span class="tb-zone-full-text">${n} of ${max} used. Remove one to add another${overflow ? ', or put them on a page of your own, with no limit' : ''}.</span>
          ${overflow ? `<a class="tb-button tb-button--sm" href="${esc(overflow.href)}">${I.pages}${esc(overflow.label)}</a>` : ''}</div>`
    zone.insertAdjacentHTML('beforeend', html)
    items().forEach((el, i, all) => {
      const t = el.querySelector(':scope > .tb-edit-toolbar')
      if (!t) return
      t.querySelector('[data-zone="up"]').disabled = i === 0
      t.querySelector('[data-zone="down"]').disabled = i === all.length - 1
    })
  }

  function changed() {
    save()
    syncSlot()
    document.dispatchEvent(new CustomEvent('tb:layout', { detail: { main, zone } }))
  }

  function add(type, quiet = false) {
    if (items().length >= max) return
    const el = build(type, `z-${type}-${Date.now().toString(36)}${(uid += 1).toString(36)}`)
    if (!el) return
    changed()
    el.classList.add('is-new')
    setTimeout(() => el.classList.remove('is-new'), 1400)
    if (quiet) return
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    el.querySelector('.tb-edit-toolbar button:not(:disabled)')?.focus({ preventScroll: true })
    announce(`${byType[type].name} added to ${place}.`)
  }

  function move(el, dir) {
    const list = items()
    const i = list.indexOf(el)
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= list.length) return
    if (dir === 'up') list[j].before(el)
    else list[j].after(el)
    changed()
    ;(el.querySelector(`[data-zone="${dir}"]:not(:disabled)`) || el.querySelector('[data-zone="remove"]'))?.focus()
    announce(`${titleOf(el)} moved ${dir}.`)
  }

  function remove(el) {
    const title = titleOf(el)
    const next = el.nextElementSibling
    el.remove()
    changed()
    ;(zone.querySelector(':scope > [data-tb-widget] .tb-edit-toolbar button') || zone.querySelector('.tb-zone-slot button, button.tb-zone-slot') || button)?.focus({ preventScroll: true })
    tb.toast({
      message: `${title} removed from ${place}.`,
      action: {
        label: 'Undo',
        onClick: () => {
          if (items().length >= max) return
          zone.insertBefore(el, next?.isConnected ? next : zone.querySelector(':scope > .tb-zone-slot'))
          changed()
          announce(`${title} is back.`)
        },
      },
      timeout: 6000,
    })
  }

  /* The bar at the top of the page */

  const bar = document.createElement('div')
  bar.className = 'tb-edit-bar'
  bar.setAttribute('role', 'region')
  bar.setAttribute('aria-label', 'Adding widgets')
  bar.innerHTML = `<span class="tb-edit-bar-title">${I.lock}Adding widgets</span>
    <span class="tb-edit-bar-hint">The cards of ${esc(stage)} stay where they are. Up to ${plural(max, 'widget')} of your own go in ${esc(place)}, saved on this computer.</span>
    <div class="tb-edit-bar-actions">
      <button class="tb-button tb-button--primary" type="button" data-zone="done">${I.check}Done</button>
    </div>`

  const catalog = widgetCatalog({
    id: `tb-zone-catalog-${String(page).replace(/[^a-z0-9-]/gi, '')}`,
    widgets,
    intro: `These widgets fit ${place}. ${note}`.trim(),
    onPick: add,
  })

  /* Enter and leave */

  function enter() {
    if (editing) return
    editing = true
    // Before the main, since a stage's main is a grid that places its own cards.
    main.before(bar)
    tb.init(bar)
    zone.classList.add('tb-edit', 'is-editing')
    items().forEach(decorate)
    syncSlot()
    // The slot pulses once, so the eye finds it.
    const slot = zone.querySelector(':scope > .tb-zone-add')
    if (slot) { slot.classList.add('is-inviting'); setTimeout(() => slot.classList.remove('is-inviting'), 1400) }
    if (button) button.setAttribute('aria-pressed', 'true')
    if (!location.hash.startsWith('#zone')) zone.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    announce(`Adding widgets to ${place}. ${plural(items().length, 'widget')} of ${max}.`)
  }

  function exit() {
    if (!editing) return
    const hadFocus = zone.contains(document.activeElement) || bar.contains(document.activeElement)
    editing = false
    bar.remove()
    zone.classList.remove('tb-edit', 'is-editing')
    zone.querySelectorAll('.tb-edit-toolbar').forEach(t => t.remove())
    syncSlot()
    if (button) {
      button.setAttribute('aria-pressed', 'false')
      if (hadFocus) button.focus()
    }
    announce('Done adding widgets.')
  }

  const toggle = () => (editing ? exit() : enter())

  /* Clicks and keys */

  // The bar sits outside the main, so it gets its own listener.
  bar.addEventListener('click', e => { if (e.target.closest('[data-zone="done"]')) exit() })
  main.addEventListener('click', e => {
    const b = e.target.closest('[data-zone]')
    if (!editing || !b) return
    const action = b.dataset.zone
    const el = b.closest('[data-tb-widget]')
    if (action === 'add') catalog.open(b)
    else if (el && (action === 'up' || action === 'down')) move(el, action)
    else if (el && action === 'remove') remove(el)
  })
  document.addEventListener('keydown', e => {
    if (!editing || e.key !== 'Escape' || e.defaultPrevented) return
    if (document.querySelector('.tb-dialog-backdrop.is-open')) return
    if (e.target.closest?.('[contenteditable], input, textarea, select')) return
    e.preventDefault()
    exit()
  })
  // A note is saved as it is typed.
  zone.addEventListener('input', () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(save, 400)
  })

  if (button) {
    button.setAttribute('aria-pressed', 'false')
    button.addEventListener('click', toggle)
  }

  /* Start: saved widgets come back before the page measures anything. */

  load().slice(0, max).forEach(w => build(w.type, w.id, w))
  const flag = ['zone', 'zone-catalog', 'zone-full'].find(f => location.hash.slice(1).split('+').includes(f))
  if (flag) {
    setTimeout(() => {
      enter()
      if (flag === 'zone-full') widgets.forEach(w => add(w.type, true))
      if (flag === 'zone-catalog') catalog.open(zone.querySelector('.tb-zone-slot'))
    }, 600)
  }

  return { enter, exit, toggle, isEditing: () => editing }
}
