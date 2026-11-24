// Detail template. One account in full: its key figures, revenue and orders by month, what drives
// its churn risk, its timeline, what it is, how its revenue splits by product, and similar
// accounts. Clicking a month on the chart narrows the timeline to that month. Notes added here go
// on the timeline and stay in this browser.
//
// The page reads ?id=AC-1001; without it, it opens the largest account at risk.
// Screenshot flags on the hash, joined with +: #month (selects the busiest month), #note (opens
// the note dialog), plus #light and #dark.
import { tb } from '../src/tabula.js'
import { openDialog, closeDialog } from '../src/behaviours-surfaces.js'
import { wireCharts, barChart, donutChart, sparkline, legendHtml, SERIES } from '../src/charts.js'
import { expandButton } from '../src/expand.js'
import { fmtInt, fmtEur, fmtEurRound, fmtEurCompact, fmtPct, fmtDelta, fmtDate, probHtml, band, esc } from '../src/format.js'
import { mountPage } from './shared/nav.js'
import { statusTag, ownerHtml, timelineHtml } from './shared/account.js'
import { ACCOUNTS, ACCOUNT_BY_ID, YEAR, LAST, dayOf, COUNTRY_BY_CODE, REGION_BY_ID, SEGMENT_BY_ID, PRODUCTS, PRODUCT_BY_ID, USER, eventsOf } from './shared/data.js'

const FLAGS = new Set(location.hash.slice(1).split('+').filter(Boolean))
mountPage('accounts')

const $ = s => document.querySelector(s)
const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const I = {
  up: lucide('<path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />'),
  down: lucide('<path d="M16 17h6v-6" /><path d="m22 17-8.5-8.5-5 5L2 7" />'),
  arrow: lucide('<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />'),
  x: lucide('<path d="M18 6 6 18" /><path d="m6 6 12 12" />'),
}
document.querySelectorAll('[data-expand]').forEach(el => { el.outerHTML = expandButton(el.dataset.expand) })

// The account: from the URL, or the largest account at risk.
const byRevenue = [...ACCOUNTS].sort((a, b) => b.revenue - a.revenue)
const fallback = byRevenue.find(a => a.status === 'At risk') || byRevenue[0]
const account = ACCOUNT_BY_ID.get(new URLSearchParams(location.search).get('id')) || fallback
const at = byRevenue.indexOf(account)
const prev = byRevenue[at - 1]
const next = byRevenue[at + 1]
document.title = `${account.name}, Tabula templates`

/* Notes added here, per account, in this browser. */

const NOTES_KEY = 'de-notes'
const loadNotes = () => { try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || {} } catch { return {} } }
const saveNotes = all => { try { localStorage.setItem(NOTES_KEY, JSON.stringify(all)) } catch { /* private mode */ } }
const nowIso = () => {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const events = () => [...(loadNotes()[account.id] || []), ...eventsOf(account.id)].sort((x, y) => (x.at < y.at ? 1 : -1))

const state = { measure: 'revenue', month: null, kind: 'all' }

/* Toolbar */

function renderToolbar() {
  $('#de-crumb').textContent = account.name
  $('#de-context').innerHTML = `<span class="tb-mono tb-text--sm tb-text--muted">${account.id}</span>${statusTag(account.status)}<span class="tb-tag tb-tag--minimal">${esc(SEGMENT_BY_ID[account.segment].name)}, ${esc(account.plan)} plan</span>`
  const link = (el, a) => {
    el.toggleAttribute('aria-disabled', !a)
    if (a) { el.href = `./detail.html?id=${encodeURIComponent(a.id)}`; el.dataset.tbTooltip = `${a.name}, next by revenue` } else el.removeAttribute('href')
  }
  link($('#de-prev'), prev)
  link($('#de-next'), next)
  if (prev) $('#de-prev').dataset.tbTooltip = `${prev.name}, previous by revenue`
}

/* Key figures */

function renderFigures() {
  const a = account
  const aov = a.orders ? a.revenue / a.orders : null
  const peers = ACCOUNTS.filter(x => x.segment === a.segment && x.orders)
  const peerAov = peers.reduce((s, x) => s + x.revenue, 0) / peers.reduce((s, x) => s + x.orders, 0)
  const tone = a.change === null ? '' : a.change >= 0 ? ' tb-stat-delta--good' : ' tb-stat-delta--bad'
  $('#de-figures').innerHTML = `
    <div class="tb-stat"><span class="tb-stat-label">Revenue, 12 months</span><span class="tb-stat-value" title="${fmtEur(a.revenue)}">${fmtEurRound(a.revenue)}</span><span class="tb-stat-spark">${sparkline({ values: a.monthly, width: 72, height: 24 })}</span></div>
    <div class="tb-stat"><span class="tb-stat-label">Last 3 months</span><span class="tb-stat-value">${fmtEurRound(a.monthly.slice(9).reduce((s, v) => s + v, 0))}</span><span class="tb-stat-sub">${a.change === null ? 'No earlier months' : `<span class="tb-stat-delta${tone}">${a.change >= 0 ? I.up : I.down}${fmtDelta(a.change)}</span>on the 3 before`}</span></div>
    <div class="tb-stat"><span class="tb-stat-label">Orders</span><span class="tb-stat-value">${fmtInt(a.orders)}</span><span class="tb-stat-sub">${fmtInt(a.orders / 52)} a week</span></div>
    <div class="tb-stat"><span class="tb-stat-label">Average order</span><span class="tb-stat-value">${aov ? fmtEurRound(aov) : 'n/a'}</span><span class="tb-stat-sub">${fmtEurRound(peerAov)} for ${esc(SEGMENT_BY_ID[a.segment].name.toLowerCase())}</span></div>
    <div class="tb-stat"><span class="tb-stat-label">Churn risk</span><span class="tb-stat-value">${probHtml(a.risk)}</span></div>
    <div class="tb-stat"><span class="tb-stat-label">Seats</span><span class="tb-stat-value">${fmtInt(a.seats)}</span><span class="tb-stat-sub">since ${fmtDate(a.since)}</span></div>`
}

/* Revenue or orders by month, against the average account of the same segment. Clicking a
   month narrows the timeline to it. */

function renderChart() {
  const body = $('#de-chart-body')
  const a = account
  const values = state.measure === 'revenue' ? a.monthly : a.monthlyOrders
  const peers = ACCOUNTS.filter(x => x.segment === a.segment && x.id !== a.id)
  const avg = YEAR.map((_, k) => peers.reduce((s, x) => s + (state.measure === 'revenue' ? x.monthly[k] : x.monthlyOrders[k]), 0) / peers.length)
  const fmt = state.measure === 'revenue' ? { axis: fmtEurCompact, value: fmtEurRound } : { axis: fmtInt, value: fmtInt }
  const segment = SEGMENT_BY_ID[a.segment].name.toLowerCase()
  $('#de-chart-title').textContent = `${state.measure === 'revenue' ? 'Revenue' : 'Orders'} by month`
  $('#de-chart-legend').innerHTML = legendHtml([{ name: a.name, colour: 'var(--tb-series-1)' }, { name: `Average ${segment} account`, colour: 'var(--tb-series-6)' }])
  body.innerHTML = barChart({
    id: 'months', width: body.clientWidth, height: 240, stacked: false, showValues: false, gap: 0.3,
    groups: YEAR.map(m => ({ key: m.id, label: m.label, title: m.long })),
    series: [{ name: a.name, colour: 'var(--tb-series-1)', values }, { name: `Average ${segment} account`, colour: 'var(--tb-series-6)', values: avg }],
    selected: state.month ? new Set([state.month]) : null, yFormat: fmt.axis, valueFormat: fmt.value,
    note: 'Click to show this month on the timeline',
  })
}

/* Churn risk: the score, and the facts behind it, read from the account's own figures. */

function renderRisk() {
  const a = account
  const list = events()
  const overdue = list.filter(e => e.kind === 'invoice' && e.tone === 'danger').length
  const open = list.filter(e => e.title === 'Support ticket opened').length - list.filter(e => e.title === 'Support ticket resolved').length
  const idle = LAST - dayOf(a.lastOrder)
  const factor = (up, text) => `<li class="de-factor de-factor--${up ? 'up' : 'down'}">${up ? I.up : I.down}<span>${text}</span></li>`
  const factors = [
    a.change !== null && factor(a.change < -0.05, `Revenue ${a.change < 0 ? 'fell' : 'rose'} <b class="tb-num">${fmtPct(Math.abs(a.change))}</b> in the last three months.`),
    factor(idle > 14, `The last order was ${idle === 0 ? 'today' : `${fmtInt(idle)} day${idle === 1 ? '' : 's'} ago`}, on ${fmtDate(a.lastOrder)}.`),
    overdue ? factor(true, `${fmtInt(overdue)} invoice${overdue === 1 ? ' is' : 's are'} overdue.`) : factor(false, 'Every invoice is paid.'),
    open > 0 ? factor(true, `${fmtInt(open)} support ticket${open === 1 ? ' is' : 's are'} still open.`) : factor(false, 'No support ticket is open.'),
    factor(a.products.length < 2, `${a.products.length === 1 ? 'One product' : `${fmtInt(a.products.length)} products`}. Accounts with more than one renew more often.`),
  ].filter(Boolean)
  const b = band(a.risk)
  $('#de-risk-body').innerHTML = `<div class="de-risk-body">
    <div class="tb-stack tb-gap-1">
      <span class="de-risk-value">${fmtPct(a.risk)}</span>
      <span class="tb-prob tb-prob--${b}" aria-hidden="true"><span class="tb-prob-bar" style="--value: ${(a.risk * 100).toFixed(1)}"></span></span>
      <span class="tb-text tb-text--sm tb-text--muted">${b === 'high' ? 'High: act this week.' : b === 'mid' ? 'Medium: keep an eye on it.' : 'Low: nothing to do.'}</span>
    </div>
    <ul class="de-factors" aria-label="What moves the score">${factors.join('')}</ul>
  </div>`
}

/* Timeline, filtered by kind and by the month picked on the chart. */

const KINDS = [['all', 'All'], ['order', 'Orders'], ['invoice', 'Invoices'], ['ticket', 'Tickets'], ['note', 'Notes']]
function renderTimeline() {
  const all = events()
  const month = state.month && YEAR.find(m => m.id === state.month)
  const list = all.filter(e => (state.kind === 'all' || e.kind === state.kind) && (!month || e.at.slice(0, 7) === month.id))
  $('#de-kinds').innerHTML = KINDS.map(([id, name]) => {
    const n = id === 'all' ? all.length : all.filter(e => e.kind === id).length
    return `<button class="tb-tag tb-tag--interactive" type="button" data-kind="${id}" aria-pressed="${state.kind === id}">${name}<span class="tb-tag-count">${fmtInt(n)}</span></button>`
  }).join('') + (month ? `<span class="tb-tag tb-tag--accent">${esc(month.long)}<button class="tb-tag-remove" type="button" data-clear-month aria-label="Show every month">${I.x}</button></span>` : '')
  $('#de-timeline-body').innerHTML = list.length
    ? timelineHtml(list)
    : `<div class="tb-empty tb-empty--compact"><p class="tb-empty-title">Nothing ${month ? `in ${esc(month.long)}` : 'here'}</p><div class="tb-empty-action"><button class="tb-button tb-button--sm" type="button" data-clear-month>Show everything</button></div></div>`
}

/* Side: what the account is, its products and similar accounts. */

function renderSide() {
  const a = account
  const c = COUNTRY_BY_CODE[a.country]
  $('#de-about').innerHTML = `<dl class="tb-dl tb-dl--dense">
    <dt>Country</dt><dd>${esc(c.name)}, ${esc(REGION_BY_ID[a.region].name)}</dd>
    <dt>Segment</dt><dd>${esc(SEGMENT_BY_ID[a.segment].name)}</dd>
    <dt>Plan</dt><dd>${esc(a.plan)}</dd>
    <dt>Owner</dt><dd>${ownerHtml(a.owner)}</dd>
    <dt>Contact</dt><dd>${esc(a.contact)}</dd>
    <dt>Customer since</dt><dd>${fmtDate(a.since)}</dd>
    <dt>Last order</dt><dd>${fmtDate(a.lastOrder)}</dd>
  </dl>`

  // Revenue by product: the account's products, weighted by their usual share.
  const weights = a.products.map(p => PRODUCT_BY_ID[p].mix)
  const total = weights.reduce((s, w) => s + w, 0)
  const items = a.products.map((p, i) => ({ key: p, name: PRODUCT_BY_ID[p].name, value: (a.revenue * weights[i]) / total, colour: SERIES[PRODUCTS.findIndex(x => x.id === p)] }))
  $('#de-products').innerHTML = donutChart({ id: 'products', items, size: 152, valueFormat: fmtEurCompact, center: { value: fmtInt(items.length), label: items.length === 1 ? 'product' : 'products' } })

  // Similar: same segment and region, closest in revenue.
  const similar = ACCOUNTS.filter(x => x.id !== a.id && x.segment === a.segment && x.region === a.region)
    .sort((x, y) => Math.abs(x.revenue - a.revenue) - Math.abs(y.revenue - a.revenue)).slice(0, 5)
  $('#de-related').innerHTML = `<ul class="tb-list tb-list--divided">${similar.map(x => `<li class="tb-list-item">
      <a class="tb-list-item-link de-related-row" href="./detail.html?id=${encodeURIComponent(x.id)}">
        <span class="de-related-name">${esc(x.name)}</span>
        ${sparkline({ values: x.monthly, width: 56, height: 18 })}
        <span class="tb-num tb-text--sm">${fmtEurCompact(x.revenue)}</span>
      </a>
    </li>`).join('')}</ul>`
}

/* Notes */

const noteText = $('#de-note-text')
noteText.addEventListener('input', () => { $('#de-note-save').disabled = !noteText.value.trim() })
$('#de-note-open').addEventListener('click', e => { noteText.value = ''; $('#de-note-save').disabled = true; openDialog($('#de-note'), e.currentTarget) })
$('#de-note-save').addEventListener('click', () => {
  const text = noteText.value.trim()
  if (!text) return
  const all = loadNotes()
  const note = { at: nowIso(), kind: 'note', title: 'Note', detail: text, by: USER.name, local: true }
  all[account.id] = [note, ...(all[account.id] || [])]
  saveNotes(all)
  closeDialog($('#de-note'))
  state.kind = 'all'
  state.month = null
  renderTimeline()
  renderChart()
  tb.toast({
    message: 'Note added to the timeline.', intent: 'success',
    action: { label: 'Undo', onClick: () => { const now = loadNotes(); now[account.id] = (now[account.id] || []).filter(n => n.at !== note.at || n.detail !== note.detail); saveNotes(now); renderTimeline() } },
  })
})

/* Wiring */

const main = $('#de-main')
wireCharts(main, {
  onActivate(chart, key) {
    if (chart !== 'months') return
    state.month = state.month === key ? null : key
    renderChart()
    renderTimeline()
  },
})
main.addEventListener('click', e => {
  const kind = e.target.closest('[data-kind]')
  if (kind) { state.kind = kind.dataset.kind; renderTimeline(); return }
  if (e.target.closest('[data-clear-month]')) { state.month = null; state.kind = 'all'; renderChart(); renderTimeline() }
})
document.querySelectorAll('[data-measure]').forEach(b => b.addEventListener('click', () => {
  state.measure = b.dataset.measure
  document.querySelectorAll('[data-measure]').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
  renderChart()
}))
let lastWidth = main.clientWidth
new ResizeObserver(() => { if (main.clientWidth !== lastWidth) { lastWidth = main.clientWidth; renderChart(); renderSide() } }).observe(main)
document.addEventListener('shell:dock', () => setTimeout(() => { renderChart(); renderSide() }, 0))

if (FLAGS.has('month')) state.month = YEAR[account.monthly.indexOf(Math.max(...account.monthly))].id
renderToolbar()
renderFigures()
renderChart()
renderRisk()
renderTimeline()
renderSide()
tb.init(document)
if (FLAGS.has('note')) setTimeout(() => $('#de-note-open').click(), 100)
