// Dashboard template. Four key figures with a sparkline and a change, revenue over time against a
// comparison period, revenue by region and by product, and a country table. Every figure is asked
// from shared/data.js and formatted through src/format.js; every chart is drawn by src/charts.js.
//
// Clicking a day or week, a region, a product or a country adds a filter. Each chart shows what
// passes every other filter and marks its own selection, so the charts filter each other. The
// filters show as chips in the toolbar, with a link to the matching accounts.
//
// Screenshot flags on the hash, joined with + (for example #p30+select):
//   #p7, #p30, #p90  open on that period       #year     compare with last year
//   #loading         keeps the skeletons       #select   selects Europe and the Insights add-on
//   #tip             shows the tooltip of the busiest point on the line chart
//   #empty           a filter mix with no revenue, so every chart is empty
//   #region-<id>, #product-<id>  one region or one product selected
//   #export          opens the export dialog   (#light and #dark come from shared/nav.js)
import { tb } from '../src/tabula.js'
import { wireCharts, lineChart, donutChart, barChart, sparkline, legendHtml, emptyChart, skeletonChart, showTip, SERIES } from '../src/charts.js'
import { fmtInt, fmtEur, fmtEurRound, fmtEurCompact, fmtPct, fmtDelta, fmtPts, fmtCompact, fmtDate, esc } from '../src/format.js'
import { mountPage } from './shared/nav.js'
import { WIDGETS, catalogueNote } from './shared/widgets.js'
import { LAST, isoOf, weekdayOf, WEEKDAYS, MOMENTS, REGIONS, REGION_BY_ID, COUNTRIES, COUNTRY_BY_CODE, PRODUCTS, PRODUCT_BY_ID, sum, daily, split } from './shared/data.js'

const FLAGS = new Set(location.hash.slice(1).split('+').filter(Boolean))

mountPage('dashboard', { layout: 'free', widgets: WIDGETS, note: catalogueNote })

const $ = s => document.querySelector(s)
const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const I = {
  x: lucide('<path d="M18 6 6 18" /><path d="m6 6 12 12" />'),
  arrow: lucide('<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />'),
  up: lucide('<path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />'),
  down: lucide('<path d="M16 17h6v-6" /><path d="m22 17-8.5-8.5-5 5L2 7" />'),
  flat: lucide('<path d="M5 12h14" />'),
  info: lucide('<circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />'),
}

/* Time */

const PERIODS = {
  '7d': { id: '7d', days: 7, name: 'Last 7 days' },
  '30d': { id: '30d', days: 30, name: 'Last 30 days' },
  '90d': { id: '90d', days: 90, name: 'Last 90 days' },
  '12m': { id: '12m', days: 365, name: 'Last 12 months' },
}
const shortDate = d => fmtDate(isoOf(d)).replace(/ \d{4}$/, '')
const rangeText = (from, to) => (from === to ? fmtDate(isoOf(from)) : `${shortDate(from)} to ${fmtDate(isoOf(to))}`)

const state = {
  period: FLAGS.has('p7') ? '7d' : FLAGS.has('p30') ? '30d' : FLAGS.has('p90') ? '90d' : '12m',
  compare: FLAGS.has('year') ? 'year' : 'prev',
  measure: 'revenue',
  filters: [], // one per kind: time, region, product, country
  sort: { col: 2, dir: 'desc' },
  allCountries: false,
  loading: true,
}
const period = () => {
  const p = PERIODS[state.period]
  return { ...p, from: LAST - p.days + 1, to: LAST }
}
const filterOf = kind => state.filters.find(f => f.kind === kind)

// Weeks for twelve months (and ninety days in a sparkline), days otherwise. Buckets are offsets
// from the start of the window, so the comparison window cuts into the same buckets.
function buckets(p = period(), forSpark = false) {
  const weekly = p.id === '12m' || (forSpark && p.id === '90d')
  const out = []
  if (!weekly) {
    for (let d = p.from; d <= p.to; d += 1) out.push({ a: d - p.from, b: d - p.from })
    return out
  }
  // Whole weeks counted back from the last day, so the newest point is never a part week. A few
  // days left over at the start of the window are not drawn.
  for (let e = p.to; e - 6 >= p.from; e -= 7) out.unshift({ a: e - 6 - p.from, b: e - p.from })
  return out
}

// The window in view, narrowed by a time filter, and the one it is compared with.
function windows() {
  const p = period()
  const t = filterOf('time')
  const cur = t ? { from: Math.max(t.from, p.from), to: Math.min(t.to, p.to) } : { from: p.from, to: p.to }
  const len = cur.to - cur.from + 1
  const shift = state.compare === 'year' ? 364 : len
  const prev = { from: cur.from - shift, to: cur.to - shift }
  const text = state.compare === 'year' ? 'vs the same days last year' : len === 1 ? 'vs the day before' : `vs the ${fmtInt(len)} days before`
  return { cur, prev: prev.from >= 0 ? prev : null, text, shift }
}

/* Filters. Each one narrows the query that the data functions take. */

const makers = {
  time: (from, to, label) => ({ kind: 'time', key: `${from}-${to}`, label, q: { from, to } }),
  region: id => ({ kind: 'region', key: id, label: `Region: ${REGION_BY_ID[id].name}`, q: { region: id } }),
  product: id => ({ kind: 'product', key: id, label: `Product: ${PRODUCT_BY_ID[id].name}`, q: { product: id } }),
  country: code => ({ kind: 'country', key: code, label: `Country: ${COUNTRY_BY_CODE[code].name}`, q: { country: code } }),
}

// The query for the period and every filter except the given kind. A time filter narrows the
// period; win replaces the period (for the comparison).
function query(except = null, win = null) {
  const p = period()
  const q = { from: p.from, to: p.to }
  state.filters.forEach(f => {
    if (f.kind === except) return
    if (f.kind === 'time') { q.from = Math.max(q.from, f.q.from); q.to = Math.min(q.to, f.q.to) } else Object.assign(q, f.q)
  })
  if (win) Object.assign(q, win)
  return q
}
const untimed = win => ({ ...query('time'), ...win })

function setFilter(f) {
  state.filters = [...state.filters.filter(x => x.kind !== f.kind), f]
  update()
}
function toggleFilter(f) {
  const cur = filterOf(f.kind)
  if (cur && cur.key === f.key) removeFilter(f.kind)
  else setFilter(f)
}
function removeFilter(kind) {
  state.filters = state.filters.filter(f => f.kind !== kind)
  update()
}
function clearFilters() {
  const saved = state.filters
  if (!saved.length) return
  state.filters = []
  update()
  tb.toast({ message: `${fmtInt(saved.length)} filter${saved.length === 1 ? '' : 's'} cleared.`, action: { label: 'Undo', onClick: () => { state.filters = saved; update() } } })
}

const clearButton = () => (state.filters.length ? '<button class="tb-button tb-button--sm" type="button" data-clear-filters>Clear filters</button>' : '')
const empty = (h = 200) => emptyChart('No revenue matches these filters.', { action: clearButton(), height: h })

/* Key figures */

const metrics = q => {
  const revenue = sum('revenue', q)
  const orders = sum('orders', q)
  const visitors = sum('visitors', q)
  return { revenue, orders, visitors, aov: orders ? revenue / orders : null, conversion: visitors ? orders / visitors : null }
}
const KPIS = [
  { id: 'revenue', value: m => m.revenue, fmt: fmtEurRound, big: fmtEurRound },
  { id: 'orders', value: m => m.orders, fmt: fmtInt, big: fmtInt },
  { id: 'aov', value: m => m.aov, fmt: v => (v === null ? 'n/a' : fmtEur(v)), big: v => (v === null ? 'n/a' : fmtEurRound(v)) },
  { id: 'conversion', value: m => m.conversion, fmt: v => (v === null ? 'n/a' : fmtPct(v)), big: v => (v === null ? 'n/a' : fmtPct(v)), points: true },
]

function deltaHtml(kpi, w) {
  if (!w.prev) return '<span class="tb-text--muted">No earlier data to compare</span>'
  const a = kpi.value(metrics(untimed(w.cur)))
  const b = kpi.value(metrics(untimed(w.prev)))
  if (a === null || b === null) return `<span class="tb-text--muted">n/a ${w.text}</span>`
  const diff = a - b
  const rel = kpi.points ? diff : b ? diff / b : 0
  // A change that rounds to zero at one decimal reads as no change.
  const dir = Math.abs(rel) < 0.0005 ? 'flat' : diff > 0 ? 'up' : 'down'
  const text = dir === 'flat' ? (kpi.points ? fmtPts(0) : fmtDelta(0)) : kpi.points ? fmtPts(diff) : b ? fmtDelta(diff / b) : fmtInt(diff)
  const tone = dir === 'flat' ? '' : dir === 'up' ? ' tb-stat-delta--good' : ' tb-stat-delta--bad'
  const title = `${kpi.fmt(a)} against ${kpi.fmt(b)}, ${rangeText(w.cur.from, w.cur.to)} against ${rangeText(w.prev.from, w.prev.to)}`
  return `<span class="tb-stat-delta${tone}" title="${esc(title)}">${I[dir]}${text}</span><span>${w.text}</span>`
}

function sparkFor(kpi, width) {
  const p = period()
  const bs = buckets(p, true)
  const values = bs.map(b => kpi.value(metrics(untimed({ from: p.from + b.a, to: p.from + b.b }))))
  const t = filterOf('time')
  let band = null
  if (t) {
    const hit = bs.map((b, i) => (p.from + b.b >= t.q.from && p.from + b.a <= t.q.to ? i : -1)).filter(i => i >= 0)
    if (hit.length) band = [hit[0], hit[hit.length - 1]]
  }
  return sparkline({ values, width, height: 32, band })
}

function renderKpis() {
  const q = query()
  const m = metrics(q)
  const w = windows()
  const days = q.to - q.from + 1
  const countries = split('revenue', 'country', { ...q, country: null }).entries()
  const best = [...countries].map(([code]) => ({ code, aov: sum('revenue', { ...q, country: code }) / (sum('orders', { ...q, country: code }) || 1) })).filter(c => filterOf('country') ? c.code === filterOf('country').key : true).sort((a, b) => b.aov - a.aov)[0]
  const notes = {
    revenue: `${fmtEurRound(m.revenue / days)} a day on average`,
    orders: `${fmtInt(Math.round(m.orders / days))} a day on average`,
    aov: best && m.orders ? `Highest in ${COUNTRY_BY_CODE[best.code].name}, ${fmtEurRound(best.aov)}` : '',
    conversion: `${fmtInt(m.visitors)} visits`,
  }
  KPIS.forEach(kpi => {
    const body = $(`[data-kpi="${kpi.id}"] .db-kpi-body`)
    if (state.loading) {
      body.innerHTML = '<span class="tb-stat-value"><span class="tb-skeleton pg-skel-value"></span></span><span class="tb-stat-spark"><span class="tb-skeleton pg-skel-spark"></span></span><span class="tb-skeleton pg-skel-line"></span>'
      return
    }
    const v = kpi.value(m)
    const sparkW = Math.max(0, Math.min(120, body.clientWidth - 210))
    body.innerHTML = `<span class="tb-stat-value" title="${esc(kpi.fmt(v))}">${kpi.big(v)}</span>
      <span class="tb-stat-spark">${sparkFor(kpi, sparkW)}</span>
      <span class="tb-stat-sub">${deltaHtml(kpi, w)}</span>
      <span class="tb-stat-sub">${notes[kpi.id]}</span>`
  })
}

/* Over time: the measure per day or week, with the comparison window as a dashed line. */

const measureFmt = () => (state.measure === 'revenue' ? { axis: fmtEurCompact, value: fmtEurRound } : { axis: fmtCompact, value: fmtInt })

function renderLine() {
  const body = $('#db-line-body')
  const p = period()
  const weekly = p.id === '12m'
  const noun = state.measure === 'revenue' ? 'Revenue' : 'Orders'
  $('#db-line-title').textContent = `${noun} per ${weekly ? 'week' : 'day'}`
  const w = windows()
  const legend = [{ name: p.name, colour: 'var(--tb-accent)', kind: 'line' }]
  if (w.prev) legend.push({ name: state.compare === 'year' ? 'Same days last year' : 'The period before', colour: 'var(--tb-fg-subtle)', kind: 'dashed' })
  $('#db-line-legend').innerHTML = legendHtml(legend)
  if (state.loading) { body.innerHTML = skeletonChart(250); return }
  const q = query('time')
  if (!sum('orders', q)) { body.innerHTML = empty(250); return }
  const cur = daily(state.measure, q)
  const shift = state.compare === 'year' ? 364 : p.days
  const prevOk = p.from - shift >= 0
  const prev = prevOk ? daily(state.measure, { ...q, from: p.from - shift, to: p.to - shift }) : null
  const bs = buckets(p)
  const total = (arr, b) => arr.slice(b.a, b.b + 1).reduce((s, v) => s + v, 0)
  const tickEvery = p.id === '7d' ? 1 : p.id === '30d' ? 7 : 14
  const points = bs.map((b, i) => {
    const from = p.from + b.a
    const to = p.from + b.b
    let tick = ''
    if (weekly) {
      // The week that holds the first of a month carries the month's name.
      const first = Array.from({ length: to - from + 1 }, (_, k) => from + k).find(d => isoOf(d).endsWith('-01'))
      tick = first === undefined ? '' : fmtDate(isoOf(first)).split(' ')[1]
    }
    else if (p.id === '7d') tick = `${WEEKDAYS[weekdayOf(from)]} ${+isoOf(from).slice(8, 10)}`
    else if (weekdayOf(from) === 0 && Math.floor((from - p.from) / 7) % (tickEvery / 7) === 0) tick = shortDate(from)
    return { key: `${from}-${to}`, tick, title: weekly ? `Week of ${rangeText(from, to)}` : `${WEEKDAYS[weekdayOf(from)]} ${fmtDate(isoOf(from))}`, from, to, i }
  })
  const t = filterOf('time')
  let selected = null
  if (t) {
    const hit = points.filter(pt => pt.to >= t.q.from && pt.from <= t.q.to).map(pt => pt.i)
    if (hit.length) selected = [hit[0], hit[hit.length - 1]]
  }
  const markers = MOMENTS.filter(mo => mo.day >= p.from && mo.day <= p.to).map(mo => ({ index: points.findIndex(pt => mo.day >= pt.from && mo.day <= pt.to), label: mo.name }))
  const fmt = measureFmt()
  const series = [{ name: p.name, colour: 'var(--tb-accent)', values: bs.map(b => total(cur, b)), area: true }]
  if (prev) series.push({ name: state.compare === 'year' ? 'Same days last year' : 'The period before', colour: 'var(--tb-fg-subtle)', values: bs.map(b => total(prev, b)), dashed: true })
  body.innerHTML = lineChart({
    id: 'line', width: body.clientWidth, height: 250, points, series, selected, markers,
    yFormat: fmt.axis, valueFormat: fmt.value, note: `Click to filter to this ${weekly ? 'week' : 'day'}`,
    label: `${noun} per ${weekly ? 'week' : 'day'} against the comparison. Arrow keys move, Enter filters.`,
  })
}

/* Revenue by region, a donut with its legend. */

function renderDonut() {
  const body = $('#db-donut-body')
  const foot = $('#db-donut-foot')
  if (state.loading) { body.innerHTML = skeletonChart(200); foot.innerHTML = ''; return }
  const q = query('region')
  const by = split('revenue', 'region', q)
  const total = [...by.values()].reduce((s, v) => s + v, 0)
  if (!total) { body.innerHTML = empty(); foot.innerHTML = ''; return }
  const sel = filterOf('region')
  const items = REGIONS.map((r, i) => ({ key: r.id, name: r.name, value: by.get(r.id), colour: SERIES[i] }))
  body.innerHTML = donutChart({ id: 'donut', items, selected: sel?.key ?? null, center: { value: fmtEurCompact(total), label: 'revenue' }, valueFormat: fmtEurCompact, label: 'Filter by region', note: 'Click to filter to this region' })
  const w = windows()
  const lead = items.slice().sort((a, b) => b.value - a.value)[0]
  if (!w.prev) { foot.innerHTML = `<span class="tb-text tb-text--sm tb-text--muted">${esc(lead.name)} brings ${fmtPct(lead.value / total)} of revenue</span>`; return }
  const growth = items.map(it => {
    const before = sum('revenue', { ...untimed(w.prev), region: it.key })
    const now = sum('revenue', { ...untimed(w.cur), region: it.key })
    return { ...it, g: before ? now / before - 1 : null }
  }).filter(it => it.g !== null && it.value > 0).sort((a, b) => b.g - a.g)
  foot.innerHTML = growth.length > 1
    ? `<span class="tb-text tb-text--sm tb-text--muted">${esc(lead.name)} brings ${fmtPct(lead.value / total)}. ${esc(growth[0].name)} grows fastest, <b class="tb-num">${fmtDelta(growth[0].g)}</b> ${w.text}.</span>`
    : `<span class="tb-text tb-text--sm tb-text--muted">${esc(lead.name)} brings all of the revenue in view</span>`
}

/* Revenue by product, this window against the comparison, side by side. */

function renderBars() {
  const body = $('#db-bars-body')
  const w = windows()
  const legend = [{ name: 'This period', colour: 'var(--tb-series-1)' }]
  if (w.prev) legend.push({ name: state.compare === 'year' ? 'Last year' : 'The period before', colour: 'var(--tb-series-6)' })
  $('#db-bars-legend').innerHTML = legendHtml(legend)
  if (state.loading) { body.innerHTML = skeletonChart(250); return }
  const q = query('product')
  const now = split('revenue', 'product', q)
  if (![...now.values()].some(v => v > 0)) { body.innerHTML = empty(250); return }
  const before = w.prev ? split('revenue', 'product', { ...q, from: q.from - w.shift, to: q.to - w.shift }) : null
  const sel = filterOf('product')
  const series = [{ name: 'This period', colour: 'var(--tb-series-1)', values: PRODUCTS.map(p => now.get(p.id)) }]
  if (before) series.push({ name: state.compare === 'year' ? 'Last year' : 'The period before', colour: 'var(--tb-series-6)', values: PRODUCTS.map(p => before.get(p.id)) })
  body.innerHTML = barChart({
    id: 'bars', width: body.clientWidth, height: 250, stacked: false, showValues: false, gap: 0.3,
    groups: PRODUCTS.map(p => ({ key: p.id, label: p.short, title: p.name })), series,
    selected: sel ? new Set([sel.key]) : null, yFormat: fmtEurCompact, valueFormat: fmtEurRound,
    note: 'Click to filter to this product', label: 'Revenue by product against the comparison. Arrow keys move, Enter filters.',
  })
}

/* Countries. Sorting uses the system headers; the page keeps the order across renders and applies
   it before cutting the list. */

const SORT_KEYS = [c => c.name, c => c.region, c => c.revenue, c => c.orders, c => c.aov, c => c.change ?? -Infinity, c => c.share]

function renderCountries() {
  const tbody = $('#db-countries-table tbody')
  const foot = $('#db-countries-foot')
  if (state.loading) {
    tbody.innerHTML = Array.from({ length: 8 }, () => `<tr>${'<td><span class="tb-skeleton pg-skel-cell"></span></td>'.repeat(7)}</tr>`).join('')
    foot.innerHTML = ''
    $('#db-countries-count').textContent = ''
    return
  }
  const q = query('country')
  const w = windows()
  const rev = split('revenue', 'country', q)
  const ord = split('orders', 'country', q)
  const before = w.prev ? split('revenue', 'country', { ...q, from: q.from - w.shift, to: q.to - w.shift }) : null
  const total = [...rev.values()].reduce((s, v) => s + v, 0)
  const list = COUNTRIES.filter(c => rev.get(c.code) > 0).map(c => ({
    code: c.code, name: c.name, region: REGION_BY_ID[c.region].name,
    revenue: rev.get(c.code), orders: ord.get(c.code), aov: rev.get(c.code) / (ord.get(c.code) || 1),
    change: before && before.get(c.code) ? rev.get(c.code) / before.get(c.code) - 1 : null,
    share: total ? rev.get(c.code) / total : 0,
  }))
  const { col, dir } = state.sort
  const key = SORT_KEYS[col]
  list.sort((a, b) => {
    const [va, vb] = [key(a), key(b)]
    const cmp = typeof va === 'string' ? va.localeCompare(vb, 'en') : va - vb
    return (dir === 'asc' ? cmp : -cmp) || b.revenue - a.revenue
  })
  $('#db-countries-table thead').querySelectorAll('th').forEach((th, i) => {
    th.classList.toggle('is-sorted-asc', i === col && dir === 'asc')
    th.classList.toggle('is-sorted-desc', i === col && dir === 'desc')
    th.setAttribute('aria-sort', i === col ? (dir === 'asc' ? 'ascending' : 'descending') : 'none')
  })
  $('#db-countries-count').textContent = list.length ? `${fmtInt(list.length)} countr${list.length === 1 ? 'y' : 'ies'}` : ''
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7">${empty(160)}</td></tr>`
    foot.innerHTML = ''
    return
  }
  const sel = filterOf('country')
  const shown = state.allCountries ? list : list.slice(0, 8)
  const maxShare = Math.max(...list.map(c => c.share))
  tbody.innerHTML = shown.map(c => {
    const on = sel && sel.key === c.code
    const tone = c.change === null ? '' : c.change >= 0 ? 'tb-stat-delta--good' : 'tb-stat-delta--bad'
    return `<tr data-country="${c.code}" tabindex="0" class="${on ? 'is-selected' : ''}" aria-selected="${!!on}">
      <td>${esc(c.name)}</td>
      <td class="tb-text--muted">${esc(c.region)}</td>
      <td class="is-num" title="${fmtEur(c.revenue)}">${fmtEurRound(c.revenue)}</td>
      <td class="is-num">${fmtInt(c.orders)}</td>
      <td class="is-num">${fmtEur(c.aov)}</td>
      <td class="is-num"><span class="tb-stat-delta ${tone}">${c.change === null ? 'n/a' : fmtDelta(c.change)}</span></td>
      <td><span class="db-share"><span class="tb-bar tb-bar--sm tb-tone-accent" style="--value: ${((c.share / maxShare) * 100).toFixed(1)}"></span><span class="tb-num tb-text--sm">${fmtPct(c.share)}</span></span></td>
    </tr>`
  }).join('')
  foot.innerHTML = list.length > 8
    ? `<span class="tb-text tb-text--sm tb-text--muted">${state.allCountries ? `All ${fmtInt(list.length)}` : `Top 8 of ${fmtInt(list.length)}`}</span><button class="tb-button tb-button--sm" type="button" data-all-countries>${state.allCountries ? 'Show top 8' : `Show all ${fmtInt(list.length)}`}</button>`
    : `<span class="tb-text tb-text--sm tb-text--muted">All ${fmtInt(list.length)} shown</span>`
}

// The system handler sorts the rows on screen and marks the header. This listener runs after it,
// reads the header, and draws the whole list again in that order.
const readSort = th => { state.sort = { col: th.cellIndex, dir: th.classList.contains('is-sorted-asc') ? 'asc' : 'desc' }; renderCountries() }
document.addEventListener('click', e => { const th = e.target.closest('#db-countries-table th[data-tb-sort]'); if (th) readSort(th) })
document.addEventListener('keydown', e => {
  const th = e.target.closest && e.target.closest('#db-countries-table th[data-tb-sort]')
  if (th && (e.key === 'Enter' || e.key === ' ')) readSort(th)
})

/* Toolbar: the period, the comparison, the chips and the link to the accounts. */

function accountsHref() {
  const q = new URLSearchParams()
  state.filters.forEach(f => { if (f.kind !== 'time') q.set(f.kind, f.key) })
  return `./table.html${q.size ? `?${q}` : ''}`
}

function renderChips() {
  const p = period()
  $('#db-range').textContent = rangeText(p.from, p.to)
  document.querySelectorAll('[data-period]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.period === state.period)))
  const box = $('#db-chips')
  if (!state.filters.length) { box.innerHTML = ''; return }
  const accounts = state.filters.some(f => f.kind !== 'time')
  box.innerHTML = `${state.filters.map(f => `<span class="tb-tag tb-tag--accent pg-chip" title="${esc(f.label)}"><span>${esc(f.label)}</span><button class="tb-tag-remove" type="button" data-remove="${f.kind}" aria-label="Remove filter ${esc(f.label)}">${I.x}</button></span>`).join('')}
    ${state.filters.length > 1 ? '<button class="tb-button tb-button--minimal tb-button--sm" type="button" data-clear-filters>Clear all</button>' : ''}
    ${accounts ? `<a class="tb-button tb-button--sm" href="${accountsHref()}">Matching accounts${I.arrow}</a>` : ''}`
}

function setPeriod(id) {
  if (id === state.period) return
  const before = state.filters.length
  state.period = id
  const p = period()
  // A date that falls outside the new period no longer means anything.
  state.filters = state.filters.filter(f => f.kind !== 'time' || (f.q.to >= p.from && f.q.from <= p.to))
  if (state.filters.length < before) tb.toast({ message: `The selected dates fall outside ${p.name.toLowerCase()}, so that filter was removed.` })
  busy(update)
}

// Recomputing shows the progress bar and dims the charts for a moment, then draws.
let busyTimer = 0
function busy(done, ms = 320) {
  clearTimeout(busyTimer)
  $('#db-progress').hidden = false
  $('#db-main').classList.add('pg-busy')
  renderChips()
  busyTimer = setTimeout(() => {
    $('#db-progress').hidden = true
    $('#db-main').classList.remove('pg-busy')
    done()
  }, ms)
}

/* Export */

const exportKind = () => document.querySelector('input[name="db-export-kind"]:checked').value
const fileName = kind => `dashboard_${kind}_${state.period}${state.filters.length ? '_filtered' : ''}.csv`
function syncExport() {
  const q = query()
  const scope = state.filters.length ? 'that match the current filters' : 'in the period'
  $('#db-export-scope').textContent = exportKind() === 'days'
    ? `Downloads revenue, orders and visits for each of the ${fmtInt(q.to - q.from + 1)} days from ${rangeText(q.from, q.to)}, ${scope}, as a CSV file.`
    : `Downloads one row for each country with revenue from ${rangeText(q.from, q.to)}, ${scope}, as a CSV file.`
  $('#db-export-file').textContent = fileName(exportKind())
  $('#db-export-confirm').disabled = !sum('orders', q)
}
document.querySelectorAll('input[name="db-export-kind"]').forEach(r => r.addEventListener('change', syncExport))
$('#db-export-open').addEventListener('click', syncExport)

const csvCell = v => (/[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
function exportCsv() {
  const q = query()
  const kind = exportKind()
  let table
  if (kind === 'days') {
    const [r, o, v] = ['revenue', 'orders', 'visitors'].map(m => daily(m, q))
    table = [['date', 'revenue_eur', 'orders', 'visits']].concat(r.map((x, i) => [isoOf(q.from + i), x.toFixed(2), o[i], v[i]]))
  } else {
    const rev = split('revenue', 'country', q)
    const ord = split('orders', 'country', q)
    table = [['code', 'country', 'region', 'revenue_eur', 'orders']].concat(COUNTRIES.filter(c => rev.get(c.code) > 0).map(c => [c.code, c.name, REGION_BY_ID[c.region].name, rev.get(c.code).toFixed(2), ord.get(c.code)]))
  }
  const name = fileName(kind)
  const url = URL.createObjectURL(new Blob([`${table.map(row => row.map(csvCell).join(',')).join('\n')}\n`], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { name, count: table.length - 1 }
}
$('#db-export-confirm').addEventListener('click', e => {
  const button = e.currentTarget
  button.classList.add('is-loading')
  setTimeout(() => {
    const { name, count } = exportCsv()
    button.classList.remove('is-loading')
    button.closest('.tb-dialog-backdrop').querySelector('[data-tb-dialog-close]').click()
    tb.toast({ message: `${name} downloaded, ${fmtInt(count)} row${count === 1 ? '' : 's'}.`, intent: 'success' })
  }, 500)
})

/* Drawing everything. Focus stays on the mark, legend item or row that had it. */

function update() {
  const a = document.activeElement
  const mark = a && a.closest && a.closest('[data-mark], [data-legend]')
  const refocus = mark ? `[data-chart="${mark.dataset.chart}"][data-key="${mark.dataset.key}"]${mark.matches('[data-legend]') ? '[data-legend]' : ''}`
    : a && a.dataset && a.dataset.country ? `tr[data-country="${a.dataset.country}"]` : null
  renderChips()
  renderKpis()
  renderLine()
  renderDonut()
  renderBars()
  renderCountries()
  if (refocus) document.querySelector(refocus)?.focus()
}

/* Pointer, keyboard and clicks */

const main = $('#db-main')
wireCharts(main, {
  onActivate(chart, key) {
    if (chart === 'line') {
      const [from, to] = key.split('-').map(Number)
      toggleFilter(makers.time(from, to, from === to ? `${WEEKDAYS[weekdayOf(from)]} ${fmtDate(isoOf(from))}` : `Week of ${rangeText(from, to)}`))
    } else if (chart === 'donut') toggleFilter(makers.region(key))
    else if (chart === 'bars') toggleFilter(makers.product(key))
  },
})
main.addEventListener('click', e => {
  if (e.target.closest('[data-clear-filters]')) return clearFilters()
  if (e.target.closest('[data-all-countries]')) { state.allCountries = !state.allCountries; renderCountries(); return }
  const row = e.target.closest('tr[data-country]')
  if (row) toggleFilter(makers.country(row.dataset.country))
})
main.addEventListener('keydown', e => {
  const row = e.target.closest('tr[data-country]')
  if (!row || e.target !== row) return
  const next = e.key === 'ArrowDown' ? row.nextElementSibling : e.key === 'ArrowUp' ? row.previousElementSibling : null
  if (next) { e.preventDefault(); next.focus() }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFilter(makers.country(row.dataset.country)) }
})

$('#db-chips').addEventListener('click', e => {
  const remove = e.target.closest('[data-remove]')
  if (remove) {
    const saved = filterOf(remove.dataset.remove)
    removeFilter(remove.dataset.remove)
    tb.toast({ message: `Filter removed: ${saved.label}.`, action: { label: 'Undo', onClick: () => setFilter(saved) } })
    ;($('#db-chips [data-remove]') || $('[data-period][aria-pressed="true"]')).focus()
    return
  }
  if (e.target.closest('[data-clear-filters]')) clearFilters()
})

// Escape takes off the newest filter, unless a dialog or a menu used it first.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.tb-dialog-backdrop.is-open, .tb-popover.is-open')) return
  if (state.filters.length) removeFilter(state.filters[state.filters.length - 1].kind)
})

document.querySelectorAll('[data-period]').forEach(b => b.addEventListener('click', () => setPeriod(b.dataset.period)))
$('#db-compare').value = state.compare
$('#db-compare').addEventListener('change', e => { state.compare = e.target.value; busy(update) })
document.querySelectorAll('[data-measure]').forEach(b => b.addEventListener('click', () => {
  state.measure = b.dataset.measure
  document.querySelectorAll('[data-measure]').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
  renderLine()
}))
document.querySelectorAll('.pg-info').forEach(el => { el.innerHTML = I.info })

// Charts are drawn to the width of their card, so they are drawn again when it changes.
let resizeTimer = 0
let lastWidth = main.clientWidth
new ResizeObserver(() => {
  if (main.clientWidth === lastWidth) return
  lastWidth = main.clientWidth
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(update, 60)
}).observe(main)
document.addEventListener('shell:dock', () => setTimeout(update, 0))

/* Start: skeletons first, then the charts. The flags set up the states used for screenshots. */

if (FLAGS.has('select')) state.filters.push(makers.region('eu'), makers.product('insights'))
if (FLAGS.has('empty')) state.filters.push(makers.region('latam'), makers.country('US'))
// #region-<id> and #product-<id> select one region or product, for the video and screenshots.
FLAGS.forEach(f => {
  if (f.startsWith('region-') && REGION_BY_ID[f.slice(7)]) state.filters.push(makers.region(f.slice(7)))
  if (f.startsWith('product-') && PRODUCT_BY_ID[f.slice(8)]) state.filters.push(makers.product(f.slice(8)))
})

update()
tb.init(document)

if (!FLAGS.has('loading')) {
  setTimeout(() => {
    state.loading = false
    update()
    if (FLAGS.has('tip')) {
      const marks = [...document.querySelectorAll('[data-chart="line"][data-mark]')]
      const values = marks.map(m => { const [a, b] = m.dataset.key.split('-').map(Number); return sum(state.measure, { ...query('time'), from: a, to: b }) })
      const top = marks[values.indexOf(Math.max(...values))]
      if (top) { const r = top.getBoundingClientRect(); showTip(top, r.left + r.width / 2, r.top + 60) }
    }
    if (FLAGS.has('export')) $('#db-export-open').click()
  }, 500)
}
