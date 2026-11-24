// Data table template. The 480 accounts as a fitted page of three panes: a filter rail, a dense
// table with sorting, row selection and a sparkline in each row, and a detail pane for the
// selected account. J and K move through the rows in the order shown. Add data takes CSV files by
// drag and drop; each new account imports in its own row with live progress.
//
// The page reads ?region=, ?country=, ?product=, ?segment= and ?status= (the dashboard and the
// analytics inspector link here with them), and #at-risk.
// Screenshot flags on the hash, joined with +: #loading, #checked (four rows checked), #add
// (the dialog with a sample staged), #importing (a sample mid-import), #keys, #empty, #no-rail,
// #row-<n> (the n-th row selected).
import { tb } from '../src/tabula.js'
import { openDialog, closeDialog } from '../src/behaviours-surfaces.js'
import { sparkline } from '../src/charts.js'
import { fmtInt, fmtEur, fmtEurRound, fmtEurCompact, fmtPct, fmtPctN, fmtDelta, fmtDate, fmtBytes, band, probHtml, esc, NBSP } from '../src/format.js'
import { mountPage } from './shared/nav.js'
import { statusTag, ownerHtml, timelineHtml } from './shared/account.js'
import {
  ACCOUNTS, TEAM, TEAM_BY_ID, REGIONS, REGION_BY_ID, COUNTRIES, COUNTRY_BY_CODE, SEGMENTS, SEGMENT_BY_ID, PRODUCT_BY_ID,
  PLANS, STATUSES, LAST, isoOf, dayOf, eventsOf,
} from './shared/data.js'

const FLAGS = new Set(location.hash.slice(1).split('+').filter(Boolean))
mountPage('accounts')

const $ = s => document.querySelector(s)
const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const I = {
  x: lucide('<path d="M18 6 6 18" /><path d="m6 6 12 12" />'),
  arrow: lucide('<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />'),
  filterX: lucide('<path d="M12.531 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l.427-.473" /><path d="m16.5 3.5 5 5" /><path d="m21.5 3.5-5 5" />'),
  inbox: lucide('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />'),
  file: lucide('<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" />'),
}
const plural = (n, one, many = `${one}s`) => `${fmtInt(n)} ${n === 1 ? one : many}`
const shortDate = iso => fmtDate(iso).replace(/ \d{4}$/, '')
const ago = iso => { const d = LAST - dayOf(iso); return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${fmtInt(d)} days ago` }

/* Rows. The accounts, with owners changed on this page, and accounts added through Add data. */

const rows = ACCOUNTS.map(a => ({ ...a }))
const byId = () => new Map(rows.map(r => [r.id, r]))

/* Filters. Facets combine with AND; values inside a facet combine with OR. */

const BINS = [0, 5000, 10000, 20000, 40000, 80000, 160000, Infinity]
const BANDS = [{ id: 'low', name: `Under ${fmtPctN(0.1)}` }, { id: 'mid', name: `${fmtPctN(0.1)} to ${fmtPctN(0.4)}` }, { id: 'high', name: `Over ${fmtPctN(0.4)}` }]
const emptyFilters = () => ({ statuses: [], segments: [], regions: [], plans: [], bands: [], country: '', owner: '', product: '', min: '', max: '', q: '' })
let filters = emptyFilters()
const params = new URLSearchParams(location.search)
if (params.get('region') && REGION_BY_ID[params.get('region')]) filters.regions = [params.get('region')]
if (params.get('country') && COUNTRY_BY_CODE[params.get('country')]) filters.country = params.get('country')
if (params.get('product') && PRODUCT_BY_ID[params.get('product')]) filters.product = params.get('product')
if (params.get('segment') && SEGMENT_BY_ID[params.get('segment')]) filters.segments = [params.get('segment')]
if (params.get('status') && STATUSES.includes(params.get('status'))) filters.statuses = [params.get('status')]
if (FLAGS.has('at-risk')) filters.statuses = ['At risk']

const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const FACETS = {
  statuses: r => filters.statuses.includes(r.status),
  segments: r => filters.segments.includes(r.segment),
  regions: r => filters.regions.includes(r.region),
  plans: r => filters.plans.includes(r.plan),
  bands: r => r.risk !== null && filters.bands.includes(band(r.risk)),
  country: r => r.country === filters.country,
  owner: r => r.owner === filters.owner,
  product: r => r.products.includes(filters.product),
  revenue: r => (filters.min === '' || r.revenue >= +filters.min) && (filters.max === '' || r.revenue < +filters.max),
  q: r => [r.name, r.id, r.contact, COUNTRY_BY_CODE[r.country].name].some(v => norm(v).includes(norm(filters.q.trim()))),
}
const facetOn = {
  statuses: () => filters.statuses.length > 0, segments: () => filters.segments.length > 0, regions: () => filters.regions.length > 0,
  plans: () => filters.plans.length > 0, bands: () => filters.bands.length > 0, country: () => !!filters.country, owner: () => !!filters.owner,
  product: () => !!filters.product, revenue: () => filters.min !== '' || filters.max !== '', q: () => filters.q.trim() !== '',
}
const activeFacets = () => Object.keys(FACETS).filter(f => facetOn[f]())
// Rows being imported always show, so their progress stays in view.
const passes = (r, except = null) => r.importing || activeFacets().every(f => f === except || FACETS[f](r))

/* Sorting. Done here rather than by the system's DOM sort, because J and K follow the same order. */

let sort = { key: 'revenue', dir: 'desc' }
const SORT_VALUE = {
  name: r => r.name, country: r => COUNTRY_BY_CODE[r.country].name, segment: r => SEGMENTS.findIndex(s => s.id === r.segment),
  owner: r => TEAM_BY_ID[r.owner]?.name || '', revenue: r => r.revenue, change: r => r.change ?? -Infinity, orders: r => r.orders,
  last: r => r.lastOrder || '', risk: r => r.risk ?? -1, status: r => STATUSES.indexOf(r.status),
}
function visible() {
  const key = SORT_VALUE[sort.key]
  const list = rows.filter(r => passes(r))
  return list.sort((a, b) => {
    if (a.importing !== b.importing) return a.importing ? -1 : 1
    const [va, vb] = [key(a), key(b)]
    const cmp = typeof va === 'string' ? va.localeCompare(vb, 'en') : va - vb
    return (sort.dir === 'asc' ? cmp : -cmp) || a.name.localeCompare(b.name, 'en')
  })
}

/* Page state */

const state = { selected: null, checked: new Set(), lastCheck: null, loading: true, list: [], lastIndex: 0, rail: true }
try { state.rail = localStorage.getItem('dt-rail') !== '0' } catch { /* private mode */ }
const main = $('#dt-main')
const rail = $('#dt-rail')
const rowsEl = $('#dt-rows')
const wrap = $('#dt-wrap')
const detail = $('#dt-detail')

/* Rail. Built once; counts and states refresh in place so focus and typing survive. */

function railHtml() {
  const check = (facet, value, content) => `<label class="tb-checkbox tb-filter-option">
      <input type="checkbox" data-facet="${facet}" value="${esc(value)}" />
      <span><span class="tb-filter-option-name">${content}</span><span class="tb-filter-option-count" data-count="${facet}:${esc(value)}"></span></span>
    </label>`
  const group = (id, title, body, action = '') => `<div class="tb-filter-group" role="group" aria-labelledby="dt-group-${id}">
      <div class="tb-filter-group-head"><h3 class="tb-filter-group-title" id="dt-group-${id}">${title}</h3>${action}</div>${body}</div>`
  return [
    group('status', 'Status', STATUSES.map(s => check('statuses', s, esc(s))).join('')),
    group('risk', 'Churn risk', `<div class="tb-chip-group">${BANDS.map(b => `<button class="tb-tag tb-tag--interactive" type="button" data-band="${b.id}" aria-pressed="false"><span class="tb-swatch tb-swatch--dot tb-tone-${b.id}"></span>${b.name}<span class="tb-tag-count" data-count="bands:${b.id}"></span></button>`).join('')}</div>`),
    group('revenue', 'Revenue, 12 months', `<svg class="dt-hist" id="dt-hist" viewBox="0 0 184 52" role="group" aria-label="Accounts by revenue. Select a bar to filter on that range."></svg>`,
      '<button class="tb-button tb-button--minimal tb-button--sm tb-filter-reset" type="button" data-clear="revenue" hidden>Clear</button>'),
    group('segment', 'Segment', SEGMENTS.map(s => check('segments', s.id, esc(s.name))).join('')),
    group('region', 'Region', REGIONS.map(r => check('regions', r.id, esc(r.name))).join('')),
    group('country', 'Country', '<select class="tb-select tb-select--sm" id="dt-country" aria-label="Country"></select>'),
    group('plan', 'Plan', `<div class="tb-chip-group">${PLANS.map(p => `<button class="tb-tag tb-tag--interactive" type="button" data-plan="${p}" aria-pressed="false">${p}<span class="tb-tag-count" data-count="plans:${p}"></span></button>`).join('')}</div>`),
    group('owner', 'Owner', '<select class="tb-select tb-select--sm" id="dt-owner" aria-label="Owner"></select>'),
    group('product', 'Product', '<select class="tb-select tb-select--sm" id="dt-product" aria-label="Product"></select>'),
  ].join('')
}
const tally = (list, key) => list.reduce((m, r) => { const k = key(r); m[k] = (m[k] || 0) + 1; return m }, {})

function syncRail() {
  const settled = rows.filter(r => !r.importing)
  // Each facet counts the rows that pass every other filter, so a count says what ticking it gives.
  const except = f => settled.filter(r => passes(r, f))
  const counts = {
    statuses: tally(except('statuses'), r => r.status),
    segments: tally(except('segments'), r => r.segment),
    regions: tally(except('regions'), r => r.region),
    plans: tally(except('plans'), r => r.plan),
    bands: tally(except('bands'), r => band(r.risk)),
  }
  rail.querySelectorAll('[data-count]').forEach(el => {
    const [facet, value] = el.dataset.count.split(':')
    const n = counts[facet][value] || 0
    el.textContent = fmtInt(n)
    el.closest('.tb-filter-option, .tb-tag').classList.toggle('is-zero', n === 0)
  })
  rail.querySelectorAll('input[data-facet]').forEach(input => { input.checked = filters[input.dataset.facet].includes(input.value) })
  rail.querySelectorAll('[data-band]').forEach(b => b.setAttribute('aria-pressed', String(filters.bands.includes(b.dataset.band))))
  rail.querySelectorAll('[data-plan]').forEach(b => b.setAttribute('aria-pressed', String(filters.plans.includes(b.dataset.plan))))

  const byCountry = tally(except('country'), r => r.country)
  const codes = COUNTRIES.map(c => c.code).filter(c => byCountry[c] || c === filters.country)
  $('#dt-country').innerHTML = `<option value="">All countries (${fmtInt(except('country').length)})</option>${codes.map(c => `<option value="${c}">${esc(COUNTRY_BY_CODE[c].name)} (${fmtInt(byCountry[c] || 0)})</option>`).join('')}`
  $('#dt-country').value = filters.country
  const byOwner = tally(except('owner'), r => r.owner)
  $('#dt-owner').innerHTML = `<option value="">Anyone (${fmtInt(except('owner').length)})</option>${TEAM.map(p => `<option value="${p.id}">${esc(p.name)} (${fmtInt(byOwner[p.id] || 0)})</option>`).join('')}`
  $('#dt-owner').value = filters.owner
  const inProduct = id => except('product').filter(r => r.products.includes(id)).length
  $('#dt-product').innerHTML = `<option value="">Any product</option>${Object.values(PRODUCT_BY_ID).map(p => `<option value="${p.id}">${esc(p.name)} (${fmtInt(inProduct(p.id))})</option>`).join('')}`
  $('#dt-product').value = filters.product

  // Revenue histogram: accounts per bucket, the selected range in accent.
  const revs = except('revenue').map(r => r.revenue)
  const buckets = BINS.slice(0, -1).map((lo, i) => revs.filter(v => v >= lo && v < BINS[i + 1]).length)
  const peak = Math.max(1, ...buckets)
  const ranged = facetOn.revenue()
  const bw = 184 / buckets.length
  const hist = $('#dt-hist')
  const focused = hist.contains(document.activeElement) ? document.activeElement.dataset.bucket : null
  hist.innerHTML = buckets.map((n, i) => {
    const h = n ? Math.max(2, (n / peak) * 34) : 0
    const on = ranged && String(BINS[i]) === filters.min
    const fill = ranged ? (on ? 'var(--tb-accent)' : 'var(--tb-border)') : 'var(--tb-fg-subtle)'
    const range = BINS[i + 1] === Infinity ? `${fmtEurCompact(BINS[i])} and over` : `${fmtEurCompact(BINS[i])} to ${fmtEurCompact(BINS[i + 1])}`
    return `<g class="dt-bar" data-bucket="${i}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${range}, ${plural(n, 'account')}">
      <title>${range}: ${plural(n, 'account')}</title>
      <rect x="${(i * bw).toFixed(1)}" y="0" width="${(bw - 2).toFixed(1)}" height="38" fill="transparent"/>
      <rect x="${(i * bw).toFixed(1)}" y="${(38 - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"/>
    </g>`
  }).join('') + `<line x1="0" x2="184" y1="38.5" y2="38.5" stroke="var(--tb-border-strong)"/>
    ${[0, 3, 6].map(i => `<text x="${(i * bw).toFixed(1)}" y="50" class="dt-hist-tick">${fmtEurCompact(BINS[i])}</text>`).join('')}`
  if (focused) hist.querySelector(`[data-bucket="${focused}"]`)?.focus()
  rail.querySelector('[data-clear="revenue"]').hidden = !ranged

  const n = activeFacets().filter(f => f !== 'q').length
  $('#dt-reset').disabled = n === 0 && !facetOn.q()
  $('#dt-rail-title').textContent = n ? `Filters (${fmtInt(n)})` : 'Filters'
}

/* Summary: over the rows shown, so it answers "what am I looking at". */

function renderSummary() {
  const box = $('#dt-summary')
  if (state.loading) { box.innerHTML = [120, 140, 120, 100].map(w => `<div class="tb-stat"><span class="tb-skeleton" style="width: ${w}px; height: 36px"></span></div>`).join(''); return }
  const list = state.list.filter(r => !r.importing)
  const revenue = list.reduce((s, r) => s + r.revenue, 0)
  const risky = list.filter(r => r.status === 'At risk')
  const atRisk = risky.reduce((s, r) => s + r.revenue, 0)
  const expected = list.reduce((s, r) => s + r.revenue * (r.risk || 0), 0)
  const fresh = list.filter(r => r.status === 'New').length
  box.innerHTML = `
    <div class="tb-stat"><span class="tb-stat-label">Accounts</span><span class="tb-stat-value">${fmtInt(list.length)}</span><span class="tb-stat-sub">of ${fmtInt(rows.filter(r => !r.importing).length)} in total</span></div>
    <div class="tb-stat"><span class="tb-stat-label">Revenue, 12 months</span><span class="tb-stat-value" title="${fmtEur(revenue)}">${fmtEurRound(revenue)}</span><span class="tb-stat-sub">${list.length ? `${fmtEurRound(revenue / list.length)} an account` : 'No account shown'}</span></div>
    <div class="tb-stat"><span class="tb-stat-label">At risk</span><span class="tb-stat-value">${fmtInt(risky.length)}</span><span class="tb-stat-sub">${revenue ? `${fmtPct(atRisk / revenue)} of revenue, ${fmtEurCompact(expected)} expected loss` : 'No revenue shown'}</span></div>
    <div class="tb-stat"><span class="tb-stat-label">New</span><span class="tb-stat-value">${fmtInt(fresh)}</span><span class="tb-stat-sub">joined in the last 90 days</span></div>`
}

/* Table */

function skeletonRows() {
  return Array.from({ length: 14 }, (_, r) => `<tr class="dt-skeleton-row">${Array.from({ length: 12 }, (_, i) => `<td>${i === 0 ? '' : `<span class="tb-skeleton" style="width: ${Math.max(30, 80 - ((r * 7 + i * 13) % 40))}%"></span>`}</td>`).join('')}</tr>`).join('')
}
const importingHtml = r => `<span class="dt-importing" title="Importing"><span class="tb-progress tb-progress--sm" role="progressbar" aria-label="Import of ${esc(r.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(r.progress * 100)}"><span class="tb-progress-bar" style="--value: ${(r.progress * 100).toFixed(1)}"></span></span><span class="tb-num tb-text--sm">${fmtPctN(Math.floor(r.progress * 100) / 100)}</span></span>`

function rowHtml(r) {
  const selected = r.id === state.selected
  const checked = state.checked.has(r.id)
  const c = COUNTRY_BY_CODE[r.country]
  const tone = r.change === null ? '' : r.change >= 0 ? 'tb-stat-delta--good' : 'tb-stat-delta--bad'
  const none = '<span class="tb-text--muted">None yet</span>'
  return `<tr data-id="${r.id}" class="${[selected && 'is-selected', checked && 'is-checked', r.importing && 'is-importing'].filter(Boolean).join(' ')}" tabindex="${selected ? 0 : -1}" aria-selected="${selected}">
    <td class="dt-check-cell"><label class="tb-checkbox"><input type="checkbox" data-check="${r.id}"${checked ? ' checked' : ''}${r.importing ? ' disabled' : ''} aria-label="Select ${esc(r.name)}" /><span></span></label></td>
    <td title="${esc(`${r.name}, ${r.id}`)}"><span class="dt-name">${esc(r.name)}</span><span class="dt-id tb-mono">${r.id}</span></td>
    <td>${r.importing ? importingHtml(r) : statusTag(r.status)}</td>
    <td class="is-num">${r.risk === null ? '' : probHtml(r.risk)}</td>
    <td class="is-num" title="${fmtEur(r.revenue)}">${r.importing ? '' : r.generated ? none : fmtEurRound(r.revenue)}</td>
    <td class="dt-spark-cell">${r.importing || r.generated ? '' : sparkline({ values: r.monthly, width: 72, height: 20 })}</td>
    <td class="is-num">${r.change === null ? '' : `<span class="tb-stat-delta ${tone}">${fmtDelta(r.change)}</span>`}</td>
    <td class="is-num">${r.importing || r.generated ? '' : fmtInt(r.orders)}</td>
    <td class="tb-num" title="${r.lastOrder ? fmtDate(r.lastOrder) : ''}">${r.lastOrder ? shortDate(r.lastOrder) : ''}</td>
    <td title="${esc(c.name)}"><span class="tb-mono tb-text--sm">${r.country}</span></td>
    <td>${esc(SEGMENT_BY_ID[r.segment].name.replace('Small business', 'Small'))}</td>
    <td title="${esc(TEAM_BY_ID[r.owner]?.name || '')}">${esc(TEAM_BY_ID[r.owner]?.name.split(' ')[0] || '')}</td>
  </tr>`
}

function renderTable(flash = []) {
  if (state.loading) { rowsEl.innerHTML = skeletonRows(); $('#dt-count').textContent = 'Loading'; return }
  const had = document.activeElement
  const refocus = rowsEl.contains(had) ? (had.dataset.check ? `[data-check="${had.dataset.check}"]` : had.dataset.id ? `tr[data-id="${had.dataset.id}"]` : null) : null
  state.list = visible()
  const settled = rows.filter(r => !r.importing).length
  const shown = state.list.filter(r => !r.importing).length
  $('#dt-count').textContent = shown === settled ? plural(settled, 'account') : `${fmtInt(shown)} of ${fmtInt(settled)}`
  if (!state.list.length) {
    const n = activeFacets().length
    rowsEl.innerHTML = `<tr class="dt-empty-row"><td colspan="12"><div class="tb-empty">
      <span class="tb-empty-icon">${I.filterX}</span>
      <p class="tb-empty-title">No account matches</p>
      <p class="tb-empty-description">The ${n === 1 ? 'filter' : `${fmtInt(n)} filters`} on this view leave nothing.</p>
      <div class="tb-empty-action"><button class="tb-button" type="button" data-reset>Reset filters</button></div>
    </div></td></tr>`
  } else {
    rowsEl.innerHTML = state.list.map(rowHtml).join('')
  }
  flash.forEach(id => rowsEl.querySelector(`tr[data-id="${id}"]`)?.classList.add('dt-flash'))
  if (refocus) rowsEl.querySelector(refocus)?.focus({ preventScroll: true })
  syncChecks()
  document.querySelectorAll('#dt-table th[data-dt-sort]').forEach(th => {
    const on = th.dataset.dtSort === sort.key
    th.classList.toggle('is-sorted-asc', on && sort.dir === 'asc')
    th.classList.toggle('is-sorted-desc', on && sort.dir === 'desc')
    th.setAttribute('aria-sort', on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none')
  })
}

function syncChecks() {
  // Checked rows that a filter hides stay checked, and the count says so.
  const selectable = state.list.filter(r => !r.importing)
  const shown = selectable.filter(r => state.checked.has(r.id)).length
  const all = $('#dt-check-all')
  all.checked = selectable.length > 0 && shown === selectable.length
  all.indeterminate = shown > 0 && shown < selectable.length
  all.disabled = state.loading || !selectable.length
  const n = state.checked.size
  $('#dt-bulk').hidden = n === 0
  $('#dt-bulk-count').textContent = `${fmtInt(n)} selected${n > shown ? `, ${fmtInt(n - shown)} hidden` : ''}`
  rowsEl.querySelectorAll('tr[data-id]').forEach(tr => tr.classList.toggle('is-checked', state.checked.has(tr.dataset.id)))
}

// Scrolls the table just enough to show the row, below the sticky header.
function keepRowInView(id) {
  const tr = rowsEl.querySelector(`tr[data-id="${id}"]`)
  if (!tr) return
  const head = wrap.querySelector('thead').offsetHeight
  if (tr.offsetTop - head < wrap.scrollTop) wrap.scrollTop = tr.offsetTop - head
  else if (tr.offsetTop + tr.offsetHeight > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = tr.offsetTop + tr.offsetHeight - wrap.clientHeight
}

/* Detail pane */

let shownId = null
function renderDetail() {
  const foot = $('#dt-detail-foot')
  if (state.loading) {
    detail.innerHTML = `<div class="dt-detail-inner">${[50, 100, 100, 70, 90, 60, 100, 80].map(w => `<span class="tb-skeleton" style="width: ${w}%; height: 18px"></span>`).join('')}</div>`
    foot.hidden = true
    return
  }
  const r = byId().get(state.selected)
  document.querySelectorAll('[data-move]').forEach(b => { b.disabled = !state.list.length })
  if (!r) {
    $('#dt-pos').textContent = ''
    detail.innerHTML = `<div class="tb-empty"><span class="tb-empty-icon">${I.inbox}</span><p class="tb-empty-title">No account selected</p><p class="tb-empty-description">Select a row, or press J to start at the top of the list.</p></div>`
    foot.hidden = true
    return
  }
  const index = state.list.indexOf(r)
  $('#dt-pos').textContent = index >= 0 ? `${fmtInt(index + 1)} of ${fmtInt(state.list.length)}` : 'Hidden by filters'
  const c = COUNTRY_BY_CODE[r.country]
  const since = dayOf(r.since) < 0 ? fmtDate(r.since) : fmtDate(r.since)
  detail.innerHTML = r.importing
    ? `<div class="dt-detail-inner"><div class="dt-detail-head"><h3 class="dt-detail-name">${esc(r.name)}</h3></div>
        <div class="tb-stack tb-gap-2"><div class="tb-progress-label"><span>Importing</span><span class="tb-num">${fmtPctN(Math.floor(r.progress * 100) / 100)}</span></div>
        <span class="tb-progress" role="progressbar" aria-label="Import" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(r.progress * 100)}"><span class="tb-progress-bar" style="--value: ${(r.progress * 100).toFixed(1)}"></span></span>
        <p class="tb-text tb-text--sm tb-text--muted">From ${esc(r.file)}. Revenue and orders show once the first invoice arrives.</p></div></div>`
    : `<div class="dt-detail-inner">
      <div class="dt-detail-head">
        <div><h3 class="dt-detail-name">${esc(r.name)}</h3><span class="tb-mono tb-text--sm tb-text--muted">${r.id}</span></div>
        ${statusTag(r.status)}
      </div>
      <div class="dt-figures">
        <div class="tb-stat"><span class="tb-stat-label">Revenue</span><span class="tb-stat-value">${fmtEurRound(r.revenue)}</span></div>
        <div class="tb-stat"><span class="tb-stat-label">Change</span><span class="tb-stat-value">${r.change === null ? 'n/a' : fmtDelta(r.change)}</span></div>
        <div class="tb-stat"><span class="tb-stat-label">Orders</span><span class="tb-stat-value">${fmtInt(r.orders)}</span></div>
        <div class="tb-stat"><span class="tb-stat-label">Average order</span><span class="tb-stat-value">${r.orders ? fmtEurRound(r.revenue / r.orders) : 'n/a'}</span></div>
      </div>
      <div class="tb-stack tb-gap-1"><span class="tb-caps">Revenue by month</span>${sparkline({ values: r.monthly, width: 292, height: 44 })}</div>
      <dl class="tb-dl tb-dl--dense">
        <dt>Churn risk</dt><dd>${probHtml(r.risk)}</dd>
        <dt>Country</dt><dd>${esc(c.name)}, ${esc(REGION_BY_ID[r.region].name)}</dd>
        <dt>Segment</dt><dd>${esc(SEGMENT_BY_ID[r.segment].name)}, ${esc(r.plan)} plan</dd>
        <dt>Seats</dt><dd>${fmtInt(r.seats)}</dd>
        <dt>Owner</dt><dd>${ownerHtml(r.owner)}</dd>
        <dt>Contact</dt><dd>${esc(r.contact)}</dd>
        <dt>Customer since</dt><dd>${since}</dd>
        <dt>Last order</dt><dd>${fmtDate(r.lastOrder)}, ${ago(r.lastOrder).toLowerCase()}</dd>
      </dl>
      <div class="tb-stack tb-gap-1"><span class="tb-caps">Products</span><div class="dt-products">${r.products.map(p => `<span class="tb-tag">${esc(PRODUCT_BY_ID[p].name)}</span>`).join('')}</div></div>
      <div class="tb-stack tb-gap-2"><span class="tb-caps">Recent activity</span>${r.generated ? '<p class="tb-text tb-text--sm tb-text--muted">Imported today.</p>' : timelineHtml(eventsOf(r.id), { limit: 4, dense: true })}</div>
    </div>`
  foot.hidden = !!r.importing || !!r.generated
  foot.innerHTML = `<span class="tb-text tb-text--sm tb-text--muted"><span class="dt-kbd">Enter</span> opens it</span><a class="tb-button tb-button--primary tb-button--sm" href="./detail.html?id=${encodeURIComponent(r.id)}">Open account${I.arrow}</a>`
  // Moving to another account opens its detail at the top; redrawing the same one keeps the place.
  if (shownId !== r.id) detail.scrollTop = 0
  shownId = r.id
}

function update({ flash = [], withDetail = true } = {}) {
  syncRail()
  renderTable(flash)
  renderSummary()
  if (withDetail) renderDetail()
}

/* Selection and movement */

function select(id, { focusRow = false } = {}) {
  state.selected = id
  const i = state.list.findIndex(r => r.id === id)
  if (i >= 0) state.lastIndex = i
  rowsEl.querySelectorAll('tr[data-id]').forEach(tr => {
    const on = tr.dataset.id === id
    tr.classList.toggle('is-selected', on)
    tr.setAttribute('aria-selected', String(on))
    tr.tabIndex = on ? 0 : -1
  })
  renderDetail()
  if (id) {
    keepRowInView(id)
    if (focusRow) rowsEl.querySelector(`tr[data-id="${id}"]`)?.focus({ preventScroll: true })
  }
}
function move(step) {
  const list = state.list
  if (!list.length) return
  const i = list.findIndex(r => r.id === state.selected)
  // A selected account hidden by a filter moves from where it used to be in the list.
  const from = i >= 0 ? i : Math.min(state.lastIndex, list.length) - (step > 0 ? 1 : 0)
  select(list[Math.max(0, Math.min(list.length - 1, from + step))].id, { focusRow: rowsEl.contains(document.activeElement) })
}
function toggleCheck(id) {
  const r = byId().get(id)
  if (!r || r.importing) return
  if (state.checked.has(id)) state.checked.delete(id)
  else state.checked.add(id)
  state.lastCheck = id
  const input = rowsEl.querySelector(`input[data-check="${id}"]`)
  if (input) input.checked = state.checked.has(id)
  syncChecks()
}
function clearChecks() {
  state.checked.clear()
  rowsEl.querySelectorAll('input[data-check]').forEach(i => { i.checked = false })
  syncChecks()
}
function resetFilters() {
  filters = emptyFilters()
  $('#dt-search').value = ''
  history.replaceState(null, '', location.pathname)
  update()
}
const toggleIn = (list, v) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v])

/* Bulk: assign an owner, export the checked rows. */

$('#dt-owner-menu').innerHTML = TEAM.map(p => `<button class="tb-menu-item" type="button" role="menuitem" data-assign="${p.id}"><span class="tb-avatar tb-avatar--sm tb-avatar--neutral" aria-hidden="true">${esc(p.initials)}</span><span class="tb-menu-label">${esc(p.name)}</span><span class="tb-menu-hint">${esc(p.role)}</span></button>`).join('')
$('#dt-owner-menu').addEventListener('click', e => {
  const item = e.target.closest('[data-assign]')
  if (!item) return
  const owner = item.dataset.assign
  const map = byId()
  const changing = [...state.checked].filter(id => map.get(id).owner !== owner)
  if (!changing.length) { tb.toast({ message: `Every selected account is already with ${TEAM_BY_ID[owner].name}.` }); return }
  const before = new Map(changing.map(id => [id, map.get(id).owner]))
  changing.forEach(id => { map.get(id).owner = owner })
  clearChecks()
  update({ flash: changing })
  tb.toast({
    message: `${plural(changing.length, 'account')} moved to ${TEAM_BY_ID[owner].name}. The change lasts until the page reloads.`, intent: 'success', timeout: 6000,
    action: { label: 'Undo', onClick: () => { before.forEach((o, id) => { map.get(id).owner = o }); update({ flash: changing }) } },
  })
})
$('#dt-bulk-export').addEventListener('click', () => {
  const map = byId()
  const list = [...state.checked].map(id => map.get(id))
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const text = [['id', 'name', 'country', 'segment', 'plan', 'owner', 'revenue_eur', 'orders', 'last_order', 'churn_risk', 'status'].join(','),
    ...list.map(r => [r.id, r.name, r.country, r.segment, r.plan, TEAM_BY_ID[r.owner].name, r.revenue.toFixed(2), r.orders, r.lastOrder, r.risk.toFixed(3), r.status].map(cell).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `accounts_${fmtInt(list.length)}.csv`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  tb.toast({ message: `${a.download} downloaded, ${plural(list.length, 'account')}.`, intent: 'success' })
})
$('#dt-bulk-clear').addEventListener('click', clearChecks)

/* Add data. Files are read in the browser; each CSV line becomes an account. */

const add = { staged: [] }
const dialog = $('#dt-add')
$('#dt-add-owner').innerHTML = TEAM.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')
const extOf = name => (name.includes('.') ? name.split('.').pop().toLowerCase() : '')

async function readFile(file) {
  if (extOf(file.name) !== 'csv') return { names: [], skipped: 'Not a CSV file' }
  const text = await file.text()
  const lines = text.split(/\r?\n/).map(l => l.split(',')[0].replace(/^"|"$/g, '').trim()).filter(Boolean)
  // A first line that reads like a header is left out.
  if (lines.length && /^(name|account|company)/i.test(lines[0])) lines.shift()
  if (!lines.length) return { names: [], skipped: 'No lines' }
  return { names: lines.slice(0, 200) }
}

function renderStaged() {
  const box = $('#dt-staged')
  const button = $('#dt-add-confirm')
  const ready = add.staged.filter(s => s.read && s.read.names.length)
  const reading = add.staged.some(s => !s.read)
  const total = ready.reduce((n, s) => n + s.read.names.length, 0)
  button.disabled = !ready.length || reading
  button.textContent = reading ? 'Reading files' : total ? `Add ${plural(total, 'account')}` : 'Add accounts'
  const skipped = add.staged.filter(s => s.read && !s.read.names.length).length
  $('#dt-add-note').textContent = skipped ? `${plural(skipped, 'file')} will be left out.` : total ? `They go to ${TEAM_BY_ID[$('#dt-add-owner').value].name}.` : ''
  if (!add.staged.length) { box.innerHTML = ''; return }
  box.innerHTML = `<div class="tb-table-wrap dt-staged-wrap"><table class="tb-table dt-staged">
    <thead><tr><th>File</th><th class="is-num">Size</th><th class="is-num">Accounts</th><th>Check</th><th><span class="tb-sr-only">Remove</span></th></tr></thead>
    <tbody>${add.staged.map(s => {
      const r = s.read
      const check = !r ? '<span class="tb-tag">Checking</span>' : r.names.length ? '<span class="tb-tag tb-tag--success">Ready</span>' : `<span class="tb-tag tb-tag--warning">${esc(r.skipped)}</span>`
      return `<tr${r && !r.names.length ? ' class="is-muted"' : ''}>
        <td><span class="tb-row tb-gap-2" style="flex-wrap: nowrap">${I.file}<span title="${esc(s.name)}">${esc(s.name)}</span></span></td>
        <td class="is-num">${fmtBytes(s.size)}</td>
        <td class="is-num">${r ? fmtInt(r.names.length) : '<span class="tb-spinner tb-spinner--sm"></span>'}</td>
        <td>${check}</td>
        <td><button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-unstage="${esc(s.key)}" aria-label="Remove ${esc(s.name)}">${I.x}</button></td>
      </tr>`
    }).join('')}</tbody></table></div>`
}

function stage(files) {
  ;[...files].forEach(file => {
    const key = `${file.name}:${file.size}`
    if (add.staged.some(s => s.key === key)) return
    const item = { key, file, name: file.name, size: file.size, read: null }
    add.staged.push(item)
    readFile(file).then(read => { item.read = read; renderStaged() }).catch(() => { item.read = { names: [], skipped: 'Could not read' }; renderStaged() })
  })
  renderStaged()
}

// A small CSV of new accounts, so the flow can be tried without a file at hand.
function sampleFile() {
  const names = ['Hollow Creek Bakery', 'Northfield Dental', 'Saltmarsh Surf School', 'Ridgeback Couriers', 'Amberlight Studios', 'Tallpine Outfitters']
  return new File([`name,country\n${names.map(n => `${n},US`).join('\n')}\n`], 'new-accounts.csv', { type: 'text/csv' })
}

let seq = rows.length + 1000
function importStaged() {
  const owner = $('#dt-add-owner').value
  const created = []
  add.staged.filter(s => s.read && s.read.names.length).forEach(s => s.read.names.forEach((name, k) => {
    seq += 1
    created.push({
      id: `AC-${seq}`, name, country: 'US', region: 'na', segment: 'smb', plan: 'Core', owner, contact: '', seats: 0,
      since: isoOf(LAST), products: ['core'], trend: 0, risk: null, lastOrder: null, status: 'New', monthly: new Array(12).fill(0),
      monthlyOrders: new Array(12).fill(0), revenue: 0, orders: 0, change: null,
      importing: true, progress: 0, delay: k * 2, speed: 0.06 + ((k * 37) % 7) / 100, file: s.name, generated: true,
    })
  }))
  if (!created.length) return
  rows.unshift(...created)
  add.staged = []
  closeDialog(dialog)
  wrap.scrollTop = 0
  update({ withDetail: false })
  select(created[0].id)
  tick()
  tb.toast({
    message: `${plural(created.length, 'account')} being added.`, intent: 'success',
    action: { label: 'Undo', onClick: () => { created.forEach(c => { const i = rows.indexOf(c); if (i >= 0) rows.splice(i, 1) }); if (created.some(c => c.id === state.selected)) state.selected = null; update() } },
  })
}

// Live progress: each importing row moves on its own; the cells update in place so focus and
// hover survive. A row that finishes becomes a New account and flashes.
let ticking = 0
function tick() {
  clearTimeout(ticking)
  const live = rows.filter(r => r.importing)
  if (!live.length) return
  const done = []
  live.forEach(r => {
    if (r.delay > 0) { r.delay -= 1; return }
    r.progress = Math.min(1, r.progress + r.speed)
    if (r.progress >= 1) { r.importing = false; r.risk = 0.03; done.push(r.id) }
  })
  if (done.length) update({ flash: done, withDetail: false })
  else live.forEach(r => {
    const cell = rowsEl.querySelector(`tr[data-id="${r.id}"] td:nth-child(3)`)
    if (cell) cell.innerHTML = importingHtml(r)
  })
  if (live.some(r => r.id === state.selected) || done.includes(state.selected)) renderDetail()
  if (!FLAGS.has('importing') || rows.some(r => r.importing && r.progress < 0.5)) ticking = setTimeout(tick, 300)
}

const drop = $('#dt-drop')
const fileInput = $('#dt-file')
const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files')
drop.addEventListener('click', e => { if (!e.target.closest('button')) fileInput.click() })
drop.addEventListener('keydown', e => { if (e.target === drop && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fileInput.click() } })
;['dragenter', 'dragover'].forEach(type => drop.addEventListener(type, e => {
  if (!hasFiles(e)) return
  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer.dropEffect = 'copy'
  drop.classList.add('is-over')
}))
drop.addEventListener('dragleave', e => { if (!drop.contains(e.relatedTarget)) drop.classList.remove('is-over') })
drop.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); drop.classList.remove('is-over'); stage(e.dataTransfer.files) })
fileInput.addEventListener('change', () => { stage(fileInput.files); fileInput.value = '' })
$('#dt-sample').addEventListener('click', e => { e.stopPropagation(); stage([sampleFile()]) })
$('#dt-staged').addEventListener('click', e => {
  const b = e.target.closest('[data-unstage]')
  if (b) { add.staged = add.staged.filter(s => s.key !== b.dataset.unstage); renderStaged() }
})
$('#dt-add-owner').addEventListener('change', renderStaged)
$('#dt-add-confirm').addEventListener('click', importStaged)
const openAdd = (trigger = document.activeElement) => { renderStaged(); openDialog(dialog, trigger) }
$('#dt-add-open').addEventListener('click', e => openAdd(e.currentTarget))
// Files dropped anywhere on the page open the dialog with them.
document.addEventListener('dragover', e => { if (hasFiles(e)) { e.preventDefault(); if (!dialog.classList.contains('is-open')) main.classList.add('is-drop-target') } })
document.addEventListener('dragleave', e => { if (!e.relatedTarget) main.classList.remove('is-drop-target') })
document.addEventListener('drop', e => {
  if (!hasFiles(e)) return
  e.preventDefault()
  main.classList.remove('is-drop-target')
  if (!dialog.classList.contains('is-open')) openAdd($('#dt-add-open'))
  stage(e.dataTransfer.files)
})

/* Rail wiring */

rail.innerHTML = railHtml()
rail.addEventListener('change', e => {
  const t = e.target
  if (t.dataset.facet) filters[t.dataset.facet] = toggleIn(filters[t.dataset.facet], t.value)
  else if (t.id === 'dt-country') filters.country = t.value
  else if (t.id === 'dt-owner') filters.owner = t.value
  else if (t.id === 'dt-product') filters.product = t.value
  else return
  update()
})
function pickBucket(i) {
  const same = filters.min === String(BINS[i])
  filters.min = same ? '' : String(BINS[i])
  filters.max = same || BINS[i + 1] === Infinity ? '' : String(BINS[i + 1])
  update()
}
rail.addEventListener('click', e => {
  const bar = e.target.closest('.dt-bar')
  if (bar) return pickBucket(+bar.dataset.bucket)
  const b = e.target.closest('[data-band]')
  if (b) { filters.bands = toggleIn(filters.bands, b.dataset.band); update(); return }
  const p = e.target.closest('[data-plan]')
  if (p) { filters.plans = toggleIn(filters.plans, p.dataset.plan); update(); return }
  if (e.target.closest('[data-clear="revenue"]')) { filters.min = ''; filters.max = ''; update() }
})
rail.addEventListener('keydown', e => {
  const bar = e.target.closest('.dt-bar')
  if (bar && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickBucket(+bar.dataset.bucket) }
})
$('#dt-reset').addEventListener('click', resetFilters)

function setRail(on, remember = true) {
  state.rail = on
  main.classList.toggle('is-rail-hidden', !on)
  $('#dt-rail-label').textContent = on ? 'Hide filters' : 'Show filters'
  if (remember) try { localStorage.setItem('dt-rail', on ? '1' : '0') } catch { /* private mode */ }
}
$('#dt-rail-toggle').addEventListener('click', () => setRail(!state.rail))

/* Search */

const search = $('#dt-search')
let searchTimer = 0
search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { filters.q = search.value; update() }, 150) })
search.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !search.value) { e.stopPropagation(); search.blur() }
  if (e.key === 'Enter' && state.list[0]) { e.preventDefault(); select(state.list[0].id, { focusRow: true }) }
})

/* Table wiring */

const thead = $('#dt-table thead')
function sortBy(th) {
  const key = th.dataset.dtSort
  const first = th.getAttribute('data-tb-sort') === 'desc' ? 'desc' : 'asc'
  sort = sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: first }
  renderTable()
  renderDetail()
  if (state.selected) keepRowInView(state.selected)
}
thead.addEventListener('click', e => { const th = e.target.closest('th[data-dt-sort]'); if (th) { e.stopPropagation(); sortBy(th) } })
thead.addEventListener('keydown', e => {
  const th = e.target.closest('th[data-dt-sort]')
  if (!th || e.target !== th || (e.key !== 'Enter' && e.key !== ' ')) return
  e.preventDefault()
  e.stopPropagation()
  sortBy(th)
})
$('#dt-check-all').addEventListener('change', e => {
  state.list.filter(r => !r.importing).forEach(r => { if (e.target.checked) state.checked.add(r.id); else state.checked.delete(r.id) })
  renderTable()
})
rowsEl.addEventListener('click', e => {
  if (e.target.closest('[data-reset]')) return resetFilters()
  const tr = e.target.closest('tr[data-id]')
  if (!tr) return
  const box = e.target.closest('.dt-check-cell')
  if (box) {
    // Shift-click checks the range from the last checked row, in the order shown.
    const input = box.querySelector('input')
    if (e.shiftKey && state.lastCheck && e.target === input) {
      const ids = state.list.filter(r => !r.importing).map(r => r.id)
      const [a, b] = [ids.indexOf(state.lastCheck), ids.indexOf(tr.dataset.id)].sort((x, y) => x - y)
      if (a >= 0) ids.slice(a, b + 1).forEach(id => { if (input.checked) state.checked.add(id); else state.checked.delete(id) })
      rowsEl.querySelectorAll('input[data-check]').forEach(i => { i.checked = state.checked.has(i.dataset.check) })
      syncChecks()
    }
    return
  }
  select(tr.dataset.id)
})
rowsEl.addEventListener('dblclick', e => {
  const tr = e.target.closest('tr[data-id]')
  const r = tr && byId().get(tr.dataset.id)
  if (r && !r.generated) location.href = `./detail.html?id=${encodeURIComponent(r.id)}`
})
rowsEl.addEventListener('change', e => {
  const id = e.target.dataset.check
  if (!id) return
  if (e.target.checked) state.checked.add(id)
  else state.checked.delete(id)
  state.lastCheck = id
  syncChecks()
})
rowsEl.addEventListener('keydown', e => {
  const tr = e.target.closest('tr[data-id]')
  if (!tr || e.target !== tr) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1) }
  else if (e.key === ' ') { e.preventDefault(); toggleCheck(tr.dataset.id) }
})
document.querySelectorAll('[data-move]').forEach(b => b.addEventListener('click', () => move(+b.dataset.move)))

/* Keyboard. Single keys act on the list; they are ignored while typing, with a modifier held, or
   while a dialog or menu is open. */

const SHORTCUTS = [['J', 'Next account'], ['K', 'Previous account'], ['Enter', 'Open the account'], ['X', 'Select or unselect for bulk actions'], ['Esc', 'Clear the selection'], ['/', 'Search'], ['F', 'Show or hide the filters'], ['?', 'This list']]
$('#dt-keys-list').innerHTML = SHORTCUTS.map(([k, v]) => `<dt><kbd class="dt-kbd">${k}</kbd></dt><dd>${v}</dd>`).join('')
const openKeys = () => openDialog($('#dt-keys'), document.activeElement)
$('#dt-keys-open').addEventListener('click', openKeys)

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || state.loading) return
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return
  if (document.querySelector('.tb-dialog-backdrop.is-open, .tb-popover.is-open')) return
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
  const r = byId().get(state.selected)
  let done = true
  if (k === 'j') move(1)
  else if (k === 'k') move(-1)
  else if (k === 'x' && r) toggleCheck(r.id)
  else if (k === 'Enter' && r && !r.generated && !e.target.closest('button, a')) location.href = `./detail.html?id=${encodeURIComponent(r.id)}`
  else if (k === '/') search.focus()
  else if (k === '?') openKeys()
  else if (k === 'f') setRail(!state.rail)
  else if (k === 'Escape' && state.checked.size) clearChecks()
  else done = false
  if (done) e.preventDefault()
})

/* Start. A short loading state; #loading keeps it for screenshots. */

$('#dt-context').textContent = `${fmtInt(ACCOUNTS.length)} accounts, revenue over the last 12 months to ${fmtDate(isoOf(LAST))}`
setRail(FLAGS.has('no-rail') ? false : state.rail, false)
if (FLAGS.has('empty')) { filters.q = 'no account is called this'; search.value = filters.q }
update()
tb.init(document)

function start() {
  state.loading = false
  update({ withDetail: false })
  // #row-<n> selects the n-th row, for the video and screenshots.
  const rowFlag = [...FLAGS].find(f => /^row-\d+$/.test(f))
  const first = state.list[rowFlag ? Math.min(state.list.length, +rowFlag.slice(4)) - 1 : 0]
  select(first ? first.id : null)
  if (FLAGS.has('checked')) { state.list.slice(1, 5).forEach(r => state.checked.add(r.id)); renderTable() }
  if (FLAGS.has('keys')) openKeys()
  if (FLAGS.has('add')) { openAdd($('#dt-add-open')); stage([sampleFile()]) }
  if (FLAGS.has('importing')) { stage([sampleFile()]); setTimeout(importStaged, 100) }
  tb.init(document)
}
if (!FLAGS.has('loading')) setTimeout(start, 400)
