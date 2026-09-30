// Tabula surface behaviours: tabs, dialogs, sortable tables, progress values.
// Clicks and keys are handled by one set of listeners on the document, bound once, so markup
// added later works without a second bind. initSurfaces(root) only sets the starting state
// and ARIA on the markup under root, and is safe to call as often as needed.

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let bound = false
let uid = 0
const nextId = prefix => `tb-${prefix}-${++uid}`

// Dialog bookkeeping: the stack of open backdrops, the element that opened each one, and the
// body overflow value to restore when the last one closes.
const openStack = []
const returnFocus = new WeakMap()
let savedOverflow = null
let pressedOn = null

function all(root, selector) {
  const list = [...root.querySelectorAll(selector)]
  if (root instanceof Element && root.matches(selector)) list.unshift(root)
  return list
}

/* ---------------------------------------------------------------------------------------- */
/* Tabs                                                                                      */
/* ---------------------------------------------------------------------------------------- */

function tabsOf(container) {
  return [...container.querySelectorAll('.tb-tab')].filter(t => t.closest('[data-tb-tabs]') === container)
}

function panelsOf(container) {
  return [...container.querySelectorAll('.tb-tab-panel')].filter(p => p.closest('[data-tb-tabs]') === container)
}

function isDisabled(tab) {
  return tab.disabled || tab.getAttribute('aria-disabled') === 'true'
}

function activateTab(container, tab, focus) {
  const tabs = tabsOf(container)
  const panels = panelsOf(container)
  tabs.forEach(t => {
    const on = t === tab
    t.classList.toggle('is-active', on)
    t.setAttribute('aria-selected', on ? 'true' : 'false')
    t.tabIndex = on ? 0 : -1
  })
  panels.forEach(p => { p.hidden = p.dataset.tbPanel !== tab.dataset.tbTab })
  if (focus) tab.focus()
}

function setupTabs(container) {
  const tabs = tabsOf(container)
  if (!tabs.length) return
  const bar = tabs[0].parentElement
  if (bar && !bar.hasAttribute('role')) bar.setAttribute('role', 'tablist')
  const panels = panelsOf(container)
  tabs.forEach(t => {
    if (!t.hasAttribute('role')) t.setAttribute('role', 'tab')
    if (t.tagName === 'BUTTON' && !t.hasAttribute('type')) t.type = 'button'
    if (!t.id) t.id = nextId('tab')
    const panel = panels.find(p => p.dataset.tbPanel === t.dataset.tbTab)
    if (panel) {
      if (!panel.id) panel.id = nextId('panel')
      t.setAttribute('aria-controls', panel.id)
      if (!panel.hasAttribute('role')) panel.setAttribute('role', 'tabpanel')
      panel.setAttribute('aria-labelledby', t.id)
      if (!panel.hasAttribute('tabindex')) panel.tabIndex = 0
    }
  })
  const active = tabs.find(t => t.classList.contains('is-active') && !isDisabled(t))
    || tabs.find(t => !isDisabled(t))
  if (active) activateTab(container, active, false)
}

function onTabClick(e) {
  const tab = e.target.closest('.tb-tab')
  if (!tab) return false
  const container = tab.closest('[data-tb-tabs]')
  if (!container || isDisabled(tab)) return !!container
  activateTab(container, tab, false)
  return true
}

function onTabKey(e) {
  const tab = e.target.closest('.tb-tab')
  if (!tab) return
  const container = tab.closest('[data-tb-tabs]')
  if (!container) return
  const tabs = tabsOf(container).filter(t => !isDisabled(t))
  const i = tabs.indexOf(tab)
  if (i === -1) return
  let next = null
  if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length]
  else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length]
  else if (e.key === 'Home') next = tabs[0]
  else if (e.key === 'End') next = tabs[tabs.length - 1]
  if (!next) return
  e.preventDefault()
  activateTab(container, next, true)
}

/* ---------------------------------------------------------------------------------------- */
/* Dialogs                                                                                   */
/* ---------------------------------------------------------------------------------------- */

function panelOf(backdrop) {
  return backdrop.querySelector('.tb-dialog') || backdrop
}

function setupDialog(backdrop) {
  const panel = panelOf(backdrop)
  if (!panel.hasAttribute('role')) panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1
  if (!panel.hasAttribute('aria-labelledby') && !panel.hasAttribute('aria-label')) {
    const title = panel.querySelector('.tb-dialog-title')
    if (title) {
      if (!title.id) title.id = nextId('dialog-title')
      panel.setAttribute('aria-labelledby', title.id)
    }
  }
  if (!backdrop.classList.contains('is-open')) backdrop.setAttribute('aria-hidden', 'true')
}

export function openDialog(backdrop, trigger = document.activeElement) {
  if (typeof backdrop === 'string') backdrop = document.getElementById(backdrop)
  if (!backdrop || backdrop.classList.contains('is-open')) return
  setupDialog(backdrop)
  returnFocus.set(backdrop, trigger instanceof HTMLElement ? trigger : null)
  if (!openStack.length) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  openStack.push(backdrop)
  backdrop.removeAttribute('aria-hidden')
  backdrop.classList.add('is-open')
  const panel = panelOf(backdrop)
  const target = panel.querySelector('[autofocus]')
    || panel.querySelector(`.tb-dialog-body :is(${FOCUSABLE}), .tb-dialog-footer :is(${FOCUSABLE})`)
    || panel
  target.focus({ preventScroll: true })
  // If the browser had not applied the visible state yet, the focus call was ignored. Retry
  // on the next frame.
  if (!panel.contains(document.activeElement)) {
    requestAnimationFrame(() => {
      if (backdrop.classList.contains('is-open') && !panel.contains(document.activeElement)) {
        target.focus({ preventScroll: true })
      }
    })
  }
}

export function closeDialog(backdrop) {
  if (typeof backdrop === 'string') backdrop = document.getElementById(backdrop)
  if (!backdrop || !backdrop.classList.contains('is-open')) return
  backdrop.classList.remove('is-open')
  backdrop.setAttribute('aria-hidden', 'true')
  const i = openStack.indexOf(backdrop)
  if (i !== -1) openStack.splice(i, 1)
  if (!openStack.length) {
    document.body.style.overflow = savedOverflow || ''
    savedOverflow = null
  }
  const back = returnFocus.get(backdrop)
  returnFocus.delete(backdrop)
  if (back && back.isConnected) back.focus({ preventScroll: true })
}

function onDialogClick(e) {
  const opener = e.target.closest('[data-tb-dialog-open]')
  if (opener) {
    e.preventDefault()
    openDialog(opener.getAttribute('data-tb-dialog-open'), opener)
    return true
  }
  const closer = e.target.closest('[data-tb-dialog-close]')
  if (closer) {
    const backdrop = closer.closest('.tb-dialog-backdrop')
    if (backdrop) {
      e.preventDefault()
      closeDialog(backdrop)
      return true
    }
  }
  // A click on the backdrop itself closes, but only when the press also started there, so a
  // text selection dragged out of the panel does not close the dialog.
  const target = e.target
  if (target.classList && target.classList.contains('tb-dialog-backdrop') && target.classList.contains('is-open')
    && pressedOn === target) {
    closeDialog(target)
    return true
  }
  return false
}

function trapFocus(e, backdrop) {
  const panel = panelOf(backdrop)
  const items = [...panel.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length)
  if (!items.length) {
    e.preventDefault()
    panel.focus()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (e.shiftKey && (active === first || active === panel)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  } else if (!panel.contains(active)) {
    e.preventDefault()
    first.focus()
  }
}

/* ---------------------------------------------------------------------------------------- */
/* Sortable tables                                                                           */
/* ---------------------------------------------------------------------------------------- */

function cellValue(cell) {
  if (!cell) return ''
  return cell.dataset.tbSortValue ?? cell.textContent.trim()
}

function toNumber(text) {
  const n = parseFloat(String(text).replace(/[^0-9.\-]/g, ''))
  return Number.isNaN(n) ? null : n
}

function sortTable(th) {
  const table = th.closest('table')
  const tbody = table && table.tBodies[0]
  if (!tbody) return
  const index = th.cellIndex
  const first = th.getAttribute('data-tb-sort') === 'desc' ? 'desc' : 'asc'
  let dir
  if (th.classList.contains('is-sorted-asc')) dir = 'desc'
  else if (th.classList.contains('is-sorted-desc')) dir = 'asc'
  else dir = first

  table.querySelectorAll('th[data-tb-sort]').forEach(h => {
    h.classList.remove('is-sorted-asc', 'is-sorted-desc')
    h.setAttribute('aria-sort', 'none')
  })
  th.classList.add(dir === 'asc' ? 'is-sorted-asc' : 'is-sorted-desc')
  th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending')

  const rows = [...tbody.rows]
  const numeric = rows.some(r => r.cells[index] && r.cells[index].classList.contains('is-num'))
  const sign = dir === 'asc' ? 1 : -1
  rows.sort((a, b) => {
    const va = cellValue(a.cells[index])
    const vb = cellValue(b.cells[index])
    if (numeric) {
      const na = toNumber(va)
      const nb = toNumber(vb)
      // Rows with no number always sink to the bottom, whatever the direction.
      if (na === null && nb === null) return 0
      if (na === null) return 1
      if (nb === null) return -1
      return (na - nb) * sign
    }
    return va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' }) * sign
  })
  tbody.append(...rows)
}

function setupSortHeader(th) {
  if (!th.hasAttribute('tabindex')) th.tabIndex = 0
  if (!th.hasAttribute('aria-sort')) {
    const sorted = th.classList.contains('is-sorted-asc') ? 'ascending'
      : th.classList.contains('is-sorted-desc') ? 'descending' : 'none'
    th.setAttribute('aria-sort', sorted)
  }
}

/* ---------------------------------------------------------------------------------------- */
/* Progress                                                                                  */
/* ---------------------------------------------------------------------------------------- */

function setupProgress(el) {
  if (!el.hasAttribute('role')) el.setAttribute('role', 'progressbar')
  if (el.classList.contains('tb-progress--indeterminate')) {
    el.removeAttribute('aria-valuenow')
    return
  }
  el.setAttribute('aria-valuemin', '0')
  el.setAttribute('aria-valuemax', '100')
  const raw = el.getAttribute('data-tb-value')
  if (raw === null) return
  const value = Math.max(0, Math.min(100, parseFloat(raw) || 0))
  el.style.setProperty('--value', value)
  el.setAttribute('aria-valuenow', String(value))
}

/* ---------------------------------------------------------------------------------------- */
/* Document listeners, bound once                                                            */
/* ---------------------------------------------------------------------------------------- */

function bindDocument() {
  if (bound || typeof document === 'undefined') return
  bound = true

  document.addEventListener('pointerdown', e => { pressedOn = e.target }, true)

  document.addEventListener('click', e => {
    if (onDialogClick(e)) return
    if (onTabClick(e)) return
    const th = e.target.closest('th[data-tb-sort]')
    if (th) sortTable(th)
  })

  document.addEventListener('keydown', e => {
    const top = openStack[openStack.length - 1]
    if (top && e.key === 'Escape') {
      e.preventDefault()
      closeDialog(top)
      return
    }
    if (top && e.key === 'Tab') {
      trapFocus(e, top)
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const th = e.target.closest && e.target.closest('th[data-tb-sort]')
      if (th && e.target === th) {
        e.preventDefault()
        sortTable(th)
        return
      }
    }
    if (e.target.closest && e.target.closest('.tb-tab')) onTabKey(e)
  })
}

export function initSurfaces(root = document) {
  if (!root || !root.querySelectorAll) return
  bindDocument()
  all(root, '[data-tb-tabs]').forEach(setupTabs)
  all(root, '.tb-dialog-backdrop').forEach(setupDialog)
  all(root, 'th[data-tb-sort]').forEach(setupSortHeader)
  all(root, '.tb-progress').forEach(setupProgress)
}
