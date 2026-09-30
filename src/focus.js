// Card focus. Holding the header of a card for half a second puts the rest of the page out of
// focus: everything around the card blurs, dims and turns inert, and the card comes forward, fully
// usable. Esc or a click outside brings the page back, and keyboard focus returns to where it was.
// While the pointer is held, a ring of small dots circles it, so the hold reads as something
// happening; moving away or letting go early cancels it.
// A press on a button, link, field or menu in the header never starts it, nor does the layout
// editor, where the header is where sections are dragged. Only cards in the page's main take part.
// The listeners are bound once on import.

const HOLD = 500
const SLOP = 6
const SKIP = 'button, a, input, select, textarea, label, [role="button"], [contenteditable], .tb-dropdown, .tb-edit-toolbar'
// Layers that live on the body and must keep working while a card is in focus.
const KEEP = '.tb-toast-stack, .tb-tooltip, .tb-dialog-backdrop, .tb-hold-ring, [aria-live], script, style, template'
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const html = document.documentElement

let hold = null
let focused = null
let swallowClick = false
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

const titleOf = card => (card.querySelector('.tb-card-title')?.textContent || card.getAttribute('aria-label') || 'Section').trim()

function ring(x, y) {
  const el = document.createElement('div')
  el.className = 'tb-hold-ring'
  el.setAttribute('aria-hidden', 'true')
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  el.style.setProperty('--_hold', `${HOLD}ms`)
  el.innerHTML = '<span></span><span></span><span></span><span></span>'
  document.body.append(el)
  return el
}

function cancelHold() {
  if (!hold) return
  clearTimeout(hold.timer)
  if (hold.ring && !hold.done) hold.ring.remove()
  hold = null
}

function focusCard(card) {
  const dimmed = []
  let node = card
  while (node.parentElement && node !== document.body) {
    ;[...node.parentElement.children].forEach(sib => {
      if (sib === node || sib.inert || sib.matches(KEEP)) return
      sib.inert = true
      sib.classList.add('tb-focus-dim')
      dimmed.push(sib)
    })
    node = node.parentElement
  }
  const anchored = getComputedStyle(card).position === 'static'
  const tabbed = !card.hasAttribute('tabindex')
  focused = { card, dimmed, anchored, tabbed, before: document.activeElement }
  html.classList.add('tb-focus-on')
  card.classList.add('is-focused')
  if (anchored) card.classList.add('is-focus-anchor')
  if (tabbed) card.tabIndex = -1
  card.focus({ preventScroll: true })
  card.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' })
  announce(`${titleOf(card)} in focus. Escape or a click outside brings the page back.`)
}

function unfocus() {
  if (!focused) return
  const f = focused
  focused = null
  f.dimmed.forEach(el => { el.inert = false; el.classList.remove('tb-focus-dim') })
  html.classList.remove('tb-focus-on')
  f.card.classList.remove('is-focused', 'is-focus-anchor')
  if (f.tabbed) f.card.removeAttribute('tabindex')
  if (f.before && f.before !== document.body && document.contains(f.before)) f.before.focus({ preventScroll: true })
  announce('Page back.')
}

document.addEventListener('pointerdown', e => {
  if (focused) {
    if (!focused.card.contains(e.target) && !e.target.closest(KEEP)) unfocus()
    return
  }
  if (e.button !== 0 || !e.isPrimary) return
  const header = e.target.closest('.tb-card-header')
  if (!header || e.target.closest(SKIP)) return
  const card = header.closest('.tb-card')
  if (!card || !card.closest('.tb-page-main') || card.closest('.tb-edit')) return
  cancelHold()
  hold = { card, id: e.pointerId, x: e.clientX, y: e.clientY, done: false, ring: reduced.matches ? null : ring(e.clientX, e.clientY) }
  hold.timer = setTimeout(() => {
    hold.done = true
    if (hold.ring) {
      const r = hold.ring
      r.classList.add('is-done')
      r.addEventListener('animationend', () => r.remove(), { once: true })
      setTimeout(() => r.remove(), 400)
    }
    focusCard(hold.card)
  }, HOLD)
}, true)

document.addEventListener('pointermove', e => {
  if (!hold || hold.done || e.pointerId !== hold.id) return
  if (Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > SLOP) cancelHold()
}, true)

function release(e) {
  if (!hold || e.pointerId !== hold.id) return
  // The click that ends a hold would otherwise land on the header.
  if (hold.done) { swallowClick = true; setTimeout(() => { swallowClick = false }, 60) }
  cancelHold()
}
document.addEventListener('pointerup', release, true)
document.addEventListener('pointercancel', release, true)
window.addEventListener('blur', cancelHold)
document.addEventListener('click', e => { if (swallowClick) { e.preventDefault(); e.stopPropagation(); swallowClick = false } }, true)
document.addEventListener('selectstart', e => { if (hold) e.preventDefault() })
document.addEventListener('contextmenu', e => { if (hold) e.preventDefault() })

// Esc brings the page back, once a menu or dialog open inside the card has had its turn.
document.addEventListener('keydown', e => {
  if (!focused || e.key !== 'Escape' || e.defaultPrevented) return
  if (document.querySelector('.tb-dialog-backdrop.is-open') || focused.card.querySelector('.tb-popover.is-open')) return
  e.preventDefault()
  unfocus()
})
