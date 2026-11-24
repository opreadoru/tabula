// Analytics template. Charts only, over the last twelve months: revenue by region as a stacked
// area, the funnel from a visit to a renewal, revenue by category per month as stacked bars,
// orders by weekday and hour, accounts as a scatter and a histogram, and the revenue hierarchy in
// the four tree views with an inspector.
//
// The region picker in the toolbar filters everything. A week on the area or a month on the bars
// narrows the funnel and the heatmap. A range dragged on the scatter narrows the histogram, and a
// bar of the histogram narrows the scatter. Choosing a region in the tree filters the charts too.
//
// Screenshot flags on the hash, joined with +: #brush selects a range on the scatter and pins an
// account, #select picks Europe and a month, #view-tree, #view-columns, #view-icicle, #view-table
// open the hierarchy in that view (src/tree.js), #deep selects a product under a country,
// #pick-<id> selects that node.
import { tb } from '../src/tabula.js'
import { wireCharts, areaChart, barChart, heatmap, scatterChart, funnelChart, legendHtml, emptyChart, tipRow, sparkline, SERIES } from '../src/charts.js'
import { mountTree } from '../src/tree.js'
import { expandButton } from '../src/expand.js'
import { fmtInt, fmtEur, fmtEurRound, fmtEurCompact, fmtPct, fmtPctN, fmtDelta, fmtCompact, fmtDate, band, probHtml, esc } from '../src/format.js'
import { mountPage } from './shared/nav.js'
import {
  LAST, YEAR, isoOf, WEEKDAYS, WEEKDAYS_LONG, REGIONS, REGION_BY_ID, COUNTRY_BY_CODE, CATEGORIES, PRODUCTS, PRODUCT_BY_ID,
  SEGMENTS, ACCOUNTS, HIERARCHY, sum, split, monthly, hourly, funnel,
} from './shared/data.js'

const FLAGS = new Set(location.hash.slice(1).split('+').filter(Boolean))
mountPage('analytics')

const $ = s => document.querySelector(s)
const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const I = {
  x: lucide('<path d="M18 6 6 18" /><path d="m6 6 12 12" />'),
  arrow: lucide('<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />'),
  pointer: lucide('<path d="M14 4.1 12 6" /><path d="m5.1 8-2.9-.8" /><path d="m6 12-1.9 2" /><path d="M7.2 2.2 8 5.1" /><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" />'),
  tree: lucide('<rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" />'),
}
document.querySelectorAll('[data-expand]').forEach(el => { el.outerHTML = expandButton(el.dataset.expand) })

/* Time: the last twelve months, as whole weeks counted back from the last day and as months. */

const FROM = YEAR[0].from
const shortDate = d => fmtDate(isoOf(d)).replace(/ \d{4}$/, '')
const rangeText = (from, to) => (from === to ? fmtDate(isoOf(from)) : `${shortDate(from)} to ${fmtDate(isoOf(to))}`)
const WEEKS = []
for (let e = LAST; e - 6 >= FROM; e -= 7) WEEKS.unshift({ from: e - 6, to: e })

/* State and filters */

const state = {
  region: null,
  time: null, // { from, to, label, chart }
  range: null, // { x0, x1, y0, y1 } on the scatter: orders and average order
  bin: null, // histogram bin index
  point: null, // account pinned on the scatter
  areaShare: false,
  barsShare: false,
  heatUnit: 1,
  heatCell: null,
}
const place = () => (state.region ? { region: state.region } : {})
const window_ = () => (state.time ? { from: state.time.from, to: state.time.to } : { from: FROM, to: LAST })

/* Trends */

function renderArea() {
  const body = $('#an-area-body')
  const regions = state.region ? REGIONS.filter(r => r.id === state.region) : REGIONS
  $('#an-area-legend').innerHTML = legendHtml(regions.map(r => ({ name: r.name, colour: SERIES[REGIONS.indexOf(r)] })))
  const points = WEEKS.map((w, i) => {
    const first = Array.from({ length: 7 }, (_, k) => w.from + k).find(d => isoOf(d).endsWith('-01'))
    return { key: `${w.from}-${w.to}`, tick: first === undefined ? '' : fmtDate(isoOf(first)).split(' ')[1], title: `Week of ${rangeText(w.from, w.to)}`, i }
  })
  const series = regions.map(r => ({ name: r.name, colour: SERIES[REGIONS.indexOf(r)], values: WEEKS.map(w => sum('revenue', { region: r.id, from: w.from, to: w.to })) }))
  const t = state.time
  let selected = null
  if (t) {
    const hit = WEEKS.map((w, i) => (w.to >= t.from && w.from <= t.to ? i : -1)).filter(i => i >= 0)
    if (hit.length) selected = [hit[0], hit[hit.length - 1]]
  }
  body.innerHTML = areaChart({ id: 'area', width: body.clientWidth, height: 250, points, series, share: state.areaShare, selected, yFormat: fmtEurCompact, valueFormat: fmtEurRound, note: 'Click to narrow the funnel and the heatmap to this week' })
}

function renderFunnel() {
  const body = $('#an-funnel-body')
  // Visits outnumber signups a hundred to one, so the bars start at the signup and the visits
  // are told in the footer.
  const stages = funnel({ ...place(), ...window_() })
  const [visits, ...rest] = stages
  body.innerHTML = funnelChart({ id: 'funnel', width: body.clientWidth, stages: rest.map(s => ({ key: s.id, name: s.name, value: s.value })), valueFormat: fmtInt })
  const w = window_()
  $('#an-funnel-foot').innerHTML = `<span class="tb-text tb-text--sm tb-text--muted">${fmtCompact(visits.value)} visits, ${fmtPct(rest[0].value / visits.value)} signed up. ${rangeText(w.from, w.to)}.</span>`
}

function renderBars() {
  const body = $('#an-bars-body')
  $('#an-bars-legend').innerHTML = legendHtml(CATEGORIES.map((c, i) => ({ name: c.name, colour: SERIES[i] })))
  const series = CATEGORIES.map((c, i) => ({ name: c.name, colour: SERIES[i], values: monthly('revenue', { ...place(), category: c.id, from: FROM, to: LAST }).map(m => m.value) }))
  const t = state.time
  const selected = t ? new Set(YEAR.filter(m => m.to >= t.from && m.from <= t.to).map(m => m.id)) : null
  body.innerHTML = barChart({
    id: 'bars', width: body.clientWidth, height: 250, share: state.barsShare, showValues: !state.barsShare,
    groups: YEAR.map(m => ({ key: m.id, label: m.label, title: m.long })), series, selected,
    yFormat: fmtEurCompact, valueFormat: fmtEurCompact, note: 'Click to narrow the funnel and the heatmap to this month',
  })
}

function renderHeat() {
  const body = $('#an-heat-body')
  const unit = state.heatUnit
  const grid = hourly({ ...place(), ...window_() })
  const values = grid.map(row => Array.from({ length: 24 / unit }, (_, c) => row.slice(c * unit, c * unit + unit).reduce((s, v) => s + v, 0)))
  const hh = h => `${String(h).padStart(2, '0')}:00`
  const cols = Array.from({ length: 24 / unit }, (_, c) => ({ label: unit === 3 || c % 3 === 0 ? String(c * unit).padStart(2, '0') : '', title: `${hh(c * unit)} to ${hh((c * unit + unit) % 24)}` }))
  const total = values.flat().reduce((s, v) => s + v, 0)
  body.innerHTML = heatmap({
    id: 'heat', width: body.clientWidth, rows: WEEKDAYS.map((d, i) => ({ label: d, title: WEEKDAYS_LONG[i] })), cols, values,
    colour: 'var(--tb-accent)', valueFormat: fmtInt, cellText: unit === 3, selected: state.heatCell,
    legend: { label: 'Orders', min: fmtInt(0), max: fmtInt(Math.max(...values.flat())), note: `${fmtInt(total)} orders` },
  })
}

/* Customers. One point per account with orders: its orders against its average order, both on a
   log scale, coloured by its churn risk band. New accounts are hollow. */

const ROWS = ACCOUNTS.filter(a => a.orders > 0).map(a => ({ a, orders: a.orders, aov: a.revenue / a.orders }))
const X = { min: 3, max: 3000, log: true, ticks: [3, 10, 30, 100, 300, 1000, 3000], format: fmtInt }
const Y = { min: 50, max: 1000, log: true, ticks: [50, 100, 200, 500, 1000], format: fmtEurRound }
const BINS = [0, 5000, 10000, 20000, 40000, 80000, 160000, Infinity]
const binOf = rev => BINS.findIndex((b, i) => rev >= b && rev < BINS[i + 1])
const binLabel = i => (BINS[i + 1] === Infinity ? `${fmtEurCompact(BINS[i])} and over` : i === 0 ? `Under ${fmtEurCompact(BINS[1])}` : `${fmtEurCompact(BINS[i])} to ${fmtEurCompact(BINS[i + 1])}`)
const inRange = r => !state.range || (r.orders >= state.range.x0 && r.orders <= state.range.x1 && r.aov >= state.range.y0 && r.aov <= state.range.y1)
const RISK = { low: 'Low risk', mid: 'Medium risk', high: 'High risk' }

function renderScatter() {
  const body = $('#an-scatter-body')
  $('#an-brush-clear').hidden = !state.range
  const rows = ROWS.filter(r => !state.region || r.a.region === state.region)
  if (!rows.length) { body.innerHTML = emptyChart('No accounts in this region.'); renderPoint(); return }
  const points = rows.map(r => {
    const b = band(r.a.risk)
    const colour = `var(--tb-prob-${b})`
    const dimBin = state.bin !== null && binOf(r.a.revenue) !== state.bin
    return {
      key: r.a.id, x: r.orders, y: r.aov, colour, filled: r.a.status !== 'New', r: dimBin ? 2.5 : 3.5,
      title: `${r.a.name}, ${r.a.id}`,
      rows: [
        tipRow('var(--tb-fg-subtle)', 'Orders', fmtInt(r.orders)),
        tipRow('var(--tb-fg-subtle)', 'Average order', fmtEur(r.aov)),
        tipRow('var(--tb-fg-subtle)', 'Revenue', fmtEurRound(r.a.revenue)),
        tipRow(colour, 'Churn risk', fmtPct(r.a.risk)),
      ],
    }
  })
  body.innerHTML = `${scatterChart({ id: 'scatter', width: body.clientWidth, height: 290, points, x: X, y: Y, brush: state.range, pinned: state.point, note: 'Click to pin this account' })}
    <div class="tb-legend tb-legend--inline tb-chart-legend">${Object.entries(RISK).map(([b, name]) => `<span class="tb-legend-item"><span class="tb-swatch tb-swatch--dot tb-tone-${b}"></span>${name}</span>`).join('')}
      <span class="tb-legend-item"><span class="tb-swatch tb-swatch--dot tb-swatch--hollow" style="--tone: var(--tb-fg-muted)"></span>New account</span>
      <span class="tb-spacer"></span><span class="tb-num tb-text--muted">${fmtInt(rows.filter(inRange).length)} of ${fmtInt(rows.length)} accounts</span></div>`
  // A histogram bar dims the points outside it.
  if (state.bin !== null) body.querySelectorAll('.tb-chart-pt').forEach(pt => { if (binOf(ROWS.find(r => r.a.id === pt.dataset.key).a.revenue) !== state.bin) pt.classList.add('is-dim') })
  renderPoint()
}

function renderPoint() {
  const foot = $('#an-point')
  const a = state.point && ACCOUNTS.find(x => x.id === state.point)
  if (!a) { foot.innerHTML = `<span class="tb-text tb-text--sm tb-text--muted tb-row tb-gap-2">${I.pointer}Click a point to pin an account here</span>`; return }
  foot.innerHTML = `<span class="tb-mono tb-text--sm">${a.id}</span>
    <span class="an-point-name">${esc(a.name)}</span>
    <span class="tb-text--muted">${esc(COUNTRY_BY_CODE[a.country].name)}</span>
    <span class="tb-num">${fmtEurRound(a.revenue)}</span>
    ${probHtml(a.risk, false)}
    <span class="tb-spacer"></span>
    <a class="tb-button tb-button--sm" href="./detail.html?id=${encodeURIComponent(a.id)}">Open account${I.arrow}</a>
    <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-unpin aria-label="Unpin ${esc(a.name)}">${I.x}</button>`
}

function renderHist() {
  const body = $('#an-hist-body')
  $('#an-hist-legend').innerHTML = legendHtml(SEGMENTS.map((s, i) => ({ name: s.name, colour: SERIES[i] })))
  const rows = ROWS.filter(r => (!state.region || r.a.region === state.region) && inRange(r))
  const counts = SEGMENTS.map(s => BINS.slice(0, -1).map((_, i) => rows.filter(r => r.a.segment === s.id && binOf(r.a.revenue) === i).length))
  if (!rows.length) { body.innerHTML = emptyChart('No accounts in the selected range.'); $('#an-hist-foot').innerHTML = ''; return }
  body.innerHTML = barChart({
    id: 'hist', width: body.clientWidth, height: 250, gap: 0.08, maxBar: 200, valueFormat: fmtInt, yFormat: fmtInt,
    groups: BINS.slice(0, -1).map((b, i) => ({ key: String(i), label: fmtEurCompact(b), title: binLabel(i) })),
    series: SEGMENTS.map((s, i) => ({ name: s.name, colour: SERIES[i], values: counts[i] })),
    selected: state.bin !== null ? new Set([String(state.bin)]) : null, note: 'Click to highlight these accounts on the scatter',
  })
  const median = [...rows].sort((a, b) => a.a.revenue - b.a.revenue)[Math.floor(rows.length / 2)].a.revenue
  $('#an-hist-foot').innerHTML = `<span class="tb-text tb-text--sm tb-text--muted">${fmtInt(rows.length)} accounts, half of them under <b class="tb-num">${fmtEurRound(median)}</b> a year</span>`
}

/* Hierarchy: the tree views and the inspector for the selected node. */

const nounAt = [null, 'regions', 'countries', 'products']
const depth = n => (n.id === 'root' ? 0 : REGION_BY_ID[n.id] ? 1 : COUNTRY_BY_CODE[n.id] ? 2 : 3)
const queryOf = n => {
  const d = depth(n)
  if (d === 1) return { region: n.id }
  if (d === 2) return { country: n.id }
  if (d === 3) { const [code, product] = n.id.split('-'); return { country: code, product } }
  return {}
}

function renderInspector(n) {
  const body = $('#an-inspector-body')
  const foot = $('#an-inspector-foot')
  if (!n) {
    body.innerHTML = `<div class="tb-empty tb-empty--compact"><span class="tb-empty-icon">${I.tree}</span><p class="tb-empty-title">Nothing selected</p><p class="tb-empty-description">Choose a region, a country or a product.</p></div>`
    foot.hidden = true
    return
  }
  const path = tree.pathTo(n.id)
  const parent = tree.parentOf.get(n.id)
  const months = monthly('revenue', { ...queryOf(n), from: FROM, to: LAST }).map(m => m.value)
  const q = queryOf(n)
  const accounts = ACCOUNTS.filter(a => (!q.region || a.region === q.region) && (!q.country || a.country === q.country) && (!q.product || a.products.includes(q.product)))
  body.innerHTML = `<h4 class="tb-h4">${esc(n.label)}</h4>
    <nav class="tb-breadcrumbs tb-breadcrumbs--wrap" aria-label="Path">${`<ol>${path.map(p => `<li><button class="tb-breadcrumb" type="button" data-pick="${esc(p.id)}"${p === n ? ' aria-current="page"' : ''}>${esc(p.label)}</button></li>`).join('')}</ol>`}</nav>
    <div class="tb-stat an-inspector-stat">
      <span class="tb-stat-label">Revenue, last 12 months</span>
      <span class="tb-stat-value">${fmtEurRound(n.value)}</span>
      <span class="tb-stat-spark">${sparkline({ values: months, width: 96, height: 28 })}</span>
    </div>
    <dl class="tb-dl">
      <dt>Share of ${parent ? esc(parent.label) : 'all'}</dt><dd>${parent ? fmtPct(n.value / parent.value) : fmtPct(1)}</dd>
      <dt>Change on the year before</dt><dd>${n.growth === null ? 'n/a' : `<span class="tb-stat-delta ${n.growth >= 0 ? 'tb-stat-delta--good' : 'tb-stat-delta--bad'}">${fmtDelta(n.growth)}</span>`}</dd>
      <dt>Orders</dt><dd>${fmtInt(n.orders)}</dd>
      <dt>Average order</dt><dd>${fmtEur(n.value / (n.orders || 1))}</dd>
      <dt>Accounts</dt><dd>${fmtInt(accounts.length)}</dd>
      <dt>Churn risk</dt><dd>${probHtml(n.risk)}</dd>
    </dl>`
  const params = new URLSearchParams(Object.entries(q))
  foot.hidden = false
  foot.innerHTML = `${q.region || q.country ? `<button class="tb-button" type="button" data-region-from="${esc(q.region || COUNTRY_BY_CODE[q.country].region)}">Filter the charts</button>` : ''}
    <a class="tb-button tb-button--primary" href="./table.html${params.size ? `?${params}` : ''}">Open ${fmtInt(accounts.length)} accounts${I.arrow}</a>`
}

const tree = mountTree($('#an-tree'), {
  root: HIERARCHY,
  title: 'Revenue by region, country and product',
  size: n => n.value,
  sizeLabel: 'Revenue',
  sizeText: n => fmtEurCompact(n.value),
  score: n => n.risk,
  scoreName: 'Churn risk',
  noun: (n, count) => (count === 1 ? nounAt[depth(n) + 1].replace(/ies$/, 'y').replace(/s$/, '') : nounAt[depth(n) + 1]),
  columns: [
    { label: 'Change', num: true, html: n => (n.growth === null ? 'n/a' : fmtDelta(n.growth)) },
    { label: 'Orders', num: true, html: n => fmtInt(n.orders) },
  ],
  collapsed: ['eu', 'apac', 'latam'],
  mode: 'columns',
  storageKey: 'an-tree-view',
  onSelect: renderInspector,
})

/* Toolbar */

function renderChips() {
  $('#an-range').textContent = rangeText(FROM, LAST)
  $('#an-region').value = state.region || ''
  const chips = []
  if (state.region) chips.push({ kind: 'region', label: `Region: ${REGION_BY_ID[state.region].name}` })
  if (state.time) chips.push({ kind: 'time', label: state.time.label })
  if (state.range) chips.push({ kind: 'range', label: `${fmtInt(state.range.x0)} to ${fmtInt(state.range.x1)} orders, ${fmtEurRound(state.range.y0)} to ${fmtEurRound(state.range.y1)} per order` })
  if (state.bin !== null) chips.push({ kind: 'bin', label: `Yearly revenue ${binLabel(state.bin)}` })
  $('#an-chips').innerHTML = chips.map(c => `<span class="tb-tag tb-tag--accent pg-chip" title="${esc(c.label)}"><span>${esc(c.label)}</span><button class="tb-tag-remove" type="button" data-remove="${c.kind}" aria-label="Remove filter ${esc(c.label)}">${I.x}</button></span>`).join('')
    + (chips.length > 1 ? '<button class="tb-button tb-button--minimal tb-button--sm" type="button" data-clear>Clear all</button>' : '')
}

const clear = { region: () => { state.region = null }, time: () => { state.time = null }, range: () => { state.range = null }, bin: () => { state.bin = null } }

function update() {
  const a = document.activeElement
  const mark = a?.closest?.('[data-mark]')
  const refocus = mark ? `[data-chart="${mark.dataset.chart}"][data-key="${CSS.escape(mark.dataset.key)}"]` : null
  renderChips()
  renderArea()
  renderFunnel()
  renderBars()
  renderHeat()
  renderScatter()
  renderHist()
  if (refocus) document.querySelector(refocus)?.focus()
}

$('#an-region').innerHTML = `<option value="">All regions</option>${REGIONS.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}`
$('#an-region').addEventListener('change', e => { state.region = e.target.value || null; update() })
$('#an-chips').addEventListener('click', e => {
  const r = e.target.closest('[data-remove]')
  if (r) { clear[r.dataset.remove](); update(); return }
  if (e.target.closest('[data-clear]')) { Object.values(clear).forEach(f => f()); update() }
})
$('#an-save').addEventListener('click', () => tb.toast({ message: 'View saved to Saved views.', intent: 'success', action: { label: 'Undo', onClick: () => tb.toast({ message: 'View removed from Saved views.' }) } }))

const main = $('#an-main')
wireCharts(main, {
  onActivate(chart, key) {
    if (chart === 'area') {
      const [from, to] = key.split('-').map(Number)
      state.time = state.time && state.time.from === from && state.time.to === to ? null : { from, to, label: `Week of ${rangeText(from, to)}` }
    } else if (chart === 'bars') {
      const m = YEAR.find(x => x.id === key)
      state.time = state.time && state.time.from === m.from && state.time.to === m.to ? null : { from: m.from, to: m.to, label: m.long }
    } else if (chart === 'heat') {
      state.heatCell = state.heatCell === key ? null : key
      renderHeat()
      return
    } else if (chart === 'scatter') {
      state.point = state.point === key ? null : key
      renderScatter()
      $(`[data-chart="scatter"][data-key="${key}"]`)?.focus()
      return
    } else if (chart === 'hist') {
      state.bin = state.bin === +key ? null : +key
    } else return
    update()
  },
  onBrush(chart, range) {
    if (chart !== 'scatter') return
    if (!range) { if (state.point) { state.point = null; renderScatter() } return }
    // Rounded so the chip reads like something a person would type.
    const r2 = v => { const mag = 10 ** Math.floor(Math.log10(v) - 1); return Math.round(v / mag) * mag }
    state.range = { x0: r2(range.x0), x1: r2(range.x1), y0: Math.round(range.y0 / 10) * 10, y1: Math.round(range.y1 / 10) * 10 }
    update()
  },
})
main.addEventListener('click', e => {
  if (e.target.closest('[data-unpin]')) { state.point = null; renderScatter(); return }
  const pick = e.target.closest('[data-pick]')
  if (pick) { tree.select(pick.dataset.pick, true); return }
  const from = e.target.closest('[data-region-from]')
  if (from) { state.region = from.dataset.regionFrom; update(); $('#trends').scrollIntoView({ behavior: 'smooth' }) }
})
$('#an-brush-clear').addEventListener('click', () => { state.range = null; update() })

const modeButtons = (attr, apply) => document.querySelectorAll(`[${attr}]`).forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll(`[${attr}]`).forEach(x => x.setAttribute('aria-pressed', String(x === b)))
  apply(b)
}))
modeButtons('data-area-mode', b => { state.areaShare = b.dataset.areaMode === 'share'; renderArea() })
modeButtons('data-bars-mode', b => { state.barsShare = b.dataset.barsMode === 'share'; renderBars() })
modeButtons('data-heat-unit', b => { state.heatUnit = +b.dataset.heatUnit; state.heatCell = null; renderHeat() })

// Escape takes off the newest kind of filter, unless a dialog or menu used it first.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.tb-dialog-backdrop.is-open, .tb-popover.is-open')) return
  const kind = ['bin', 'range', 'time', 'region'].find(k => (k === 'bin' ? state.bin !== null : state[k]))
  if (kind) { clear[kind](); update() }
})

let lastWidth = main.clientWidth
let resizeTimer = 0
new ResizeObserver(() => {
  if (main.clientWidth === lastWidth) return
  lastWidth = main.clientWidth
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(update, 60)
}).observe(main)
document.addEventListener('shell:dock', () => setTimeout(update, 0))

/* Start */

if (FLAGS.has('select')) { state.region = 'eu'; const m = YEAR[8]; state.time = { from: m.from, to: m.to, label: m.long } }
if (FLAGS.has('brush')) {
  state.range = { x0: 100, x1: 1000, y0: 250, y1: 400 }
  state.point = ROWS.filter(inRange).sort((a, b) => b.a.risk - a.a.risk)[0]?.a.id ?? null
}
update()
renderInspector(null)
tb.init(document)
if (FLAGS.has('deep')) tree.select('DE-insights', true)
// #pick-<id> selects one node of the hierarchy, for the video and screenshots.
const pick = [...FLAGS].find(f => f.startsWith('pick-'))
if (pick) tree.select(pick.slice(5), true)
const anchor = [...FLAGS].find(f => ['trends', 'customers', 'hierarchy'].includes(f)) || (/^#view-/.test(location.hash) ? 'hierarchy' : null)
if (anchor && !FLAGS.has('noscroll')) setTimeout(() => document.getElementById(anchor)?.scrollIntoView(), 100)
