// Card collapse. Every titled card in the page's main gets a chevron, last in its header actions,
// that folds the card down to its header and opens it again. The rest of the header's actions hide
// while it is folded. The state lasts until reload: it is a way to make room for a while, and it
// never touches the saved layout.
// Left out: cards with no .tb-card-title (a stat strip, a chat header drawn by script), cards nested
// inside another card, and a card that is itself a pane of a fitted page (tb-page--fit), where
// folding would leave an empty column. A card opts out with data-tb-no-collapse.
// Cards drawn later by script, such as widgets, get the button when they arrive. After a fold,
// 'tb:layout' fires on document so a page can refit what it measured.
// The listeners are bound once on import.
import { tb } from './tabula.js'

const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const CHEVRON = lucide('<path d="m18 15-6-6-6 6" />')
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

let uid = 0
const titleOf = card => (card.querySelector('.tb-card-title')?.textContent || 'this card').trim()

function eligible(card) {
  if (card.hasAttribute('data-tb-no-collapse') || card.classList.contains('tb-stat-strip')) return false
  const header = card.querySelector(':scope > .tb-card-header')
  if (!header || !header.querySelector('.tb-card-title')) return false
  if (card.parentElement.closest('.tb-card')) return false
  if (card.parentElement.matches('.tb-page--fit .tb-page-main')) return false
  return true
}

function label(btn, card) {
  const folded = card.classList.contains('is-collapsed')
  const title = titleOf(card)
  btn.setAttribute('aria-expanded', String(!folded))
  btn.setAttribute('aria-label', folded ? `Show ${title}` : `Collapse ${title}`)
  btn.setAttribute('data-tb-tooltip', folded ? 'Show' : 'Collapse')
}

function decorate(card) {
  if (card.querySelector(':scope > .tb-card-header .tb-card-collapse') || !eligible(card)) return
  const header = card.querySelector(':scope > .tb-card-header')
  let actions = header.querySelector(':scope > .tb-card-actions')
  if (!actions) {
    actions = document.createElement('div')
    actions.className = 'tb-card-actions'
    header.append(actions)
  }
  if (!card.id) card.id = `tb-card-${(uid += 1)}`
  actions.insertAdjacentHTML('beforeend', `<button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-card-collapse" type="button" aria-controls="${esc(card.id)}">${CHEVRON}</button>`)
  const btn = actions.lastElementChild
  label(btn, card)
  tb.init(btn)
}

function toggle(card, btn) {
  card.classList.toggle('is-collapsed')
  label(btn, card)
  document.dispatchEvent(new CustomEvent('tb:layout', { detail: { main: card.closest('main'), collapsed: card } }))
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.tb-card-collapse')
  if (!btn) return
  const card = btn.closest('.tb-card')
  if (card) toggle(card, btn)
})

function scan(root) {
  root.querySelectorAll('.tb-card').forEach(decorate)
}

// Runs once the page has drawn its first markup, then follows anything drawn later.
function start() {
  const main = document.querySelector('main.tb-page-main') || document.querySelector('main')
  if (!main) return
  scan(main)
  let queued = false
  new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; scan(main) })
  }).observe(main, { childList: true, subtree: true })
  // Headless screenshots do not run animation frames, so a timer catches up there.
  setTimeout(() => scan(main), 600)
  if (location.hash === '#collapse-first') setTimeout(() => main.querySelector('.tb-card-collapse')?.click(), 700)
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
else setTimeout(start, 0)
