// Expandable charts. Any button with data-tb-expand inside a card opens that card's chart in a
// full-screen dialog (tb-dialog--full): the card title, the legends from its header, and the chart
// at the larger size. Esc, the close button and the backdrop close it, and focus goes back to the
// button, all through the system dialog behaviour.
//
// Two ways to draw the chart large:
//   setExpandRender(card, (host, card) => cleanup)  the page draws it again into host itself (the
//     analysis tree moves its live canvas in and fits it). Return a function that puts it back.
//   nothing registered  the card body is cloned and every chart SVG in it is scaled through its
//     viewBox, up to MAX_SCALE times its drawn size.
// The listener is bound once on import, so a card rendered later only needs the button. 
import { openDialog } from './behaviours-surfaces.js'

const MAX_SCALE = 1.8
const renders = new WeakMap()
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const MAXIMIZE = lucide('<path d="M15 3h6v6" /><path d="m21 3-7 7" /><path d="m3 21 7-7" /><path d="M9 21H3v-6" />')
const CLOSE = lucide('<path d="M18 6 6 18" /><path d="m6 6 12 12" />')

// The button, for markup built in script. Static pages write the same markup by hand.
export const expandButton = title => `<button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-card-expand" type="button" data-tb-expand aria-label="Expand ${esc(title)}" data-tb-tooltip="Expand">${MAXIMIZE}</button>`

export function setExpandRender(card, fn) { renders.set(card, fn) }

let backdrop = null
let cleanup = null

function dialog() {
  if (backdrop) return backdrop
  backdrop = document.createElement('div')
  backdrop.className = 'tb-dialog-backdrop'
  backdrop.id = 'tb-expand'
  backdrop.innerHTML = `<div class="tb-dialog tb-dialog--full" role="dialog" aria-modal="true" aria-labelledby="tb-expand-title">
      <div class="tb-dialog-header">
        <h2 class="tb-dialog-title" id="tb-expand-title"></h2>
        <span class="tb-expand-legends" style="display: contents"></span>
        <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-tb-dialog-close aria-label="Close">${CLOSE}</button>
      </div>
      <div class="tb-dialog-body"><div class="tb-card-expand-view"></div></div>
    </div>`
  document.body.append(backdrop)
  // The system dialog has no close event. Watching its class runs the page's clean-up, whichever
  // way it closed.
  new MutationObserver(() => {
    if (backdrop.classList.contains('is-open')) return
    const done = cleanup
    cleanup = null
    if (done) done()
    setTimeout(() => { if (!backdrop.classList.contains('is-open')) backdrop.querySelector('.tb-card-expand-view').innerHTML = '' }, 200)
  }).observe(backdrop, { attributes: true, attributeFilter: ['class'] })
  return backdrop
}

// Chart SVGs, leaving out icons and anything too small to be a chart (sparklines stay small).
const chartSvgs = root => [...root.querySelectorAll('svg')].filter(s => !s.classList.contains('tb-icon') && !s.closest('.tb-icon'))

function cloneBody(card) {
  const bodies = [...card.querySelectorAll(':scope > .tb-card-body, :scope > .tb-card-footer')]
  const source = bodies.length ? bodies : [card]
  const sized = source.flatMap(b => chartSvgs(b).map(s => s.getBoundingClientRect()))
  const out = document.createDocumentFragment()
  let i = 0
  source.forEach(b => {
    const copy = b.cloneNode(true)
    copy.querySelectorAll('.tb-edit-toolbar, [data-tb-expand]').forEach(el => el.remove())
    // The copy is a picture of the chart. Ids stay unique, and nothing in it takes focus.
    ;[copy, ...copy.querySelectorAll('[id]')].forEach(el => el.removeAttribute('id'))
    copy.querySelectorAll('[tabindex], button, a[href], input').forEach(el => el.setAttribute('tabindex', '-1'))
    copy.querySelectorAll('[aria-live]').forEach(el => el.removeAttribute('aria-live'))
    chartSvgs(copy).forEach(svg => {
      const r = sized[i++]
      if (!r || r.width < 64) return
      if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${Math.round(r.width)} ${Math.round(r.height)}`)
      svg.removeAttribute('width')
      svg.removeAttribute('height')
      svg.style.maxWidth = `${Math.round(r.width * MAX_SCALE)}px`
      svg.style.flex = '0 1 auto'
    })
    out.append(copy)
  })
  return out
}

export function openExpanded(card, trigger = document.activeElement) {
  const bd = dialog()
  const view = bd.querySelector('.tb-card-expand-view')
  const title = card.querySelector('.tb-card-title')?.textContent.trim() || card.getAttribute('aria-label') || 'Chart'
  bd.querySelector('#tb-expand-title').textContent = title
  const legends = bd.querySelector('.tb-expand-legends')
  legends.innerHTML = ''
  card.querySelectorAll(':scope > .tb-card-header .tb-legend').forEach(l => legends.append(l.cloneNode(true)))
  view.innerHTML = ''
  view.classList.remove('is-live')
  const render = renders.get(card)
  if (render) {
    view.classList.add('is-live')
    openDialog(bd, trigger)
    cleanup = render(view, card) || null
  } else {
    view.append(cloneBody(card))
    openDialog(bd, trigger)
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', e => {
    const button = e.target.closest && e.target.closest('[data-tb-expand]')
    if (!button) return
    const card = button.closest('.tb-card, [data-tb-section]')
    if (card) openExpanded(card, button)
  })
  // Screenshot flag: #expand-first opens the first chart on the page once it has drawn.
  if (location.hash === '#expand-first') {
    setTimeout(() => {
      const button = document.querySelector('main [data-tb-expand]')
      if (button) openExpanded(button.closest('.tb-card, [data-tb-section]'), button)
    }, 1400)
  }
}
