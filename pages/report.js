// Report template: a quarterly business review as a document. An outline that follows the scroll
// and counts open comments; sections with Edit, History and Comment; charts and tables inside the
// document; a rail for the status, the versions and the exports. A version moves from Draft to In
// review to Approved, and is Superseded when a later one is approved; any two versions compare
// word by word. Text and figures come from report-data.js, built on shared/data.js.
//
// Screenshot flags on the hash: #export, #versions (opens the comparison of the newest version),
// #history (the history of the summary), #sec-<id> scrolls to a section, plus #light and #dark.
import { tb } from '../src/tabula.js'
import { openDialog, closeDialog } from '../src/behaviours-surfaces.js'
import { wireCharts, lineChart, barChart, legendHtml, SERIES } from '../src/charts.js'
import { expandButton } from '../src/expand.js'
import { fmtInt, fmtEur, fmtEurRound, fmtEurCompact, fmtPct, fmtPctN, fmtDelta, fmtDate, fmtTime, fmtDateTime, probHtml, esc } from '../src/format.js'
import { mountPage } from './shared/nav.js'
import { USER, TEAM, TEAM_BY_ID, isoOf, weekdayOf, COUNTRY_BY_CODE, daily } from './shared/data.js'
import { REPORT, ALTERNATIVES, VERSIONS, SEED_COMMENTS, FIGURES, NAMED, Q, LY } from './report-data.js'

mountPage('report')

const $ = id => document.getElementById(id)
const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const I = {
  comment: lucide('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />'),
  edit: lucide('<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />'),
  download: lucide('<path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" />'),
  print: lucide('<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" /><rect x="6" y="14" width="12" height="8" rx="1" />'),
  eyeOff: lucide('<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" />'),
  chevron: lucide('<path d="m6 9 6 6 6-6" />'),
  close: lucide('<path d="M18 6 6 18" /><path d="m6 6 12 12" />'),
  history: lucide('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />'),
  check: lucide('<path d="M20 6 9 17l-5-5" />'),
  file: lucide('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />'),
  link: lucide('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />'),
  lock: lucide('<rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />'),
}
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode: lasts until reload */ } },
}
const localIso = (d = new Date()) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const person = name => TEAM.find(t => t.name === name) || { name, initials: name === USER.name ? USER.initials : name.split(/[ .]+/).map(w => w[0]).join('').slice(0, 2) }

/* Sections, in reading order. Editable ones have an original wording. */

const SECTIONS = [
  { id: 'summary', title: 'Summary' },
  { id: 'revenue', title: 'Revenue' },
  { id: 'findings', title: 'Key findings' },
  ...REPORT.findings.map((f, i) => ({ id: `f${i + 1}`, title: f.title, finding: f, sub: true })),
  { id: 'customers', title: 'Customers' },
  { id: 'recommendations', title: 'Recommendations' },
  { id: 'method', title: 'Method' },
  { id: 'sources', title: 'Sources' },
]
const SEC = Object.fromEntries(SECTIONS.map(s => [s.id, s]))
const ORIGINAL = {
  summary: REPORT.summary,
  ...Object.fromEntries(REPORT.findings.map((f, i) => [`f${i + 1}`, f.text])),
  customers: REPORT.customers,
  recommendations: REPORT.recommendations.map(r => r.text),
  method: REPORT.method,
}
const EDITABLE = Object.keys(ORIGINAL)

// Draft while the author works on it, In review once sent, Approved once signed off, Superseded
// when a later version is approved. Only the newest version is ever worked on.
const STATUSES = [
  { id: 'draft', label: 'Draft', tone: '', text: () => 'Visible to the authors only.' },
  { id: 'review', label: 'In review', tone: 'accent', text: () => `With ${REPORT.meta.reviewer} for review.` },
  { id: 'approved', label: 'Approved', tone: 'success', text: () => `Locked. Changes go into ${nextVersion()}.` },
  { id: 'superseded', label: 'Superseded', tone: 'minimal', text: () => 'Replaced by a later approved version.' },
]
const FORMATS = [
  { id: 'pdf', label: 'PDF', ext: 'pdf', hint: 'Paginated, for the board pack.', icon: I.file },
  { id: 'docx', label: 'DOCX', ext: 'docx', hint: 'Editable, for the next draft.', icon: I.file },
  { id: 'link', label: 'Share link', ext: '', hint: 'Read-only page for the team.', icon: I.link },
]

const state = { edits: store.get('rp-edits', {}), comments: store.get('rp-comments', SEED_COMMENTS), redact: false, editing: null, exports: [] }

/* History. Two records, kept apart on purpose. The trail logs every change to a section inside
   the version being worked on, and any earlier wording can come back from its History. A version
   is a snapshot taken when the report leaves the author: sent for review, approved. Editing never
   makes a version, so the version list reads like the official record. The seed: v1 approved then
   superseded, v2 approved and sent to the board, v3 the draft being worked on. */

function presentIn(v) {
  const upTo = VERSIONS.slice(0, VERSIONS.findIndex(x => x.id === v.id) + 1)
  return new Set(upTo.flatMap(x => x.added))
}
function seedHistory() {
  const [v1, v2, v3] = VERSIONS
  const pick = (v, map) => Object.fromEntries(Object.entries(map).filter(([id]) => presentIn(v).has(id)))
  return {
    versions: [
      { id: v1.id, status: 'superseded', by: v1.by.name, note: v1.note, createdAt: v1.at, sentAt: v1.at, sentBy: v1.by.name, approvedAt: '2026-09-04T10:30', approvedBy: REPORT.meta.reviewer,
        texts: pick(v1, { ...ORIGINAL, summary: ALTERNATIVES.summary[0], method: ALTERNATIVES.method[0] }), exports: [{ format: 'PDF', at: '2026-09-04T11:02', redacted: true }] },
      { id: v2.id, status: 'approved', by: v2.by.name, note: v2.note, createdAt: v2.at, sentAt: v2.at, sentBy: v2.by.name, approvedAt: '2026-09-16T09:40', approvedBy: REPORT.meta.reviewer,
        texts: pick(v2, { ...ORIGINAL, summary: ALTERNATIVES.summary[1] }), exports: [{ format: 'PDF', at: '2026-09-16T10:05', redacted: false }] },
      { id: v3.id, status: 'draft', by: v3.by.name, note: v3.note, createdAt: v3.at, base: { ...ORIGINAL }, texts: null, exports: [] },
    ],
    trail: [],
  }
}
const history = store.get('rp-history', null) || seedHistory()
const saveHistory = () => store.set('rp-history', history)
const cur = () => history.versions.at(-1)
const prevOf = v => history.versions[history.versions.indexOf(v) - 1] || null
const statusOf = (v = cur()) => STATUSES.find(x => x.id === v.status)
const nextVersion = () => `v${+cur().id.slice(1) + 1}`
const textsFor = id => state.edits[id] || ORIGINAL[id]
const liveTexts = () => Object.fromEntries(EDITABLE.map(id => [id, textsFor(id)]))
const textsOf = v => (v === cur() ? liveTexts() : v.texts || {})
function logChange(id, kind, detail = '') {
  history.trail.push({ id: `t${Date.now().toString(36)}${history.trail.length}`, v: cur().id, section: id, at: localIso(), by: USER.name, kind, detail, texts: textsFor(id) })
  saveHistory()
}

/* Hiding names: each account named in the report becomes its ID. */

const hide = s => (state.redact ? NAMED.reduce((out, [name, id]) => out.split(name).join(id), s) : s)
const show = s => esc(hide(s))

/* Document */

function bodyHtml(id, raw = false) {
  const texts = textsFor(id).map(t => (raw ? esc(t) : show(t)))
  if (id === 'recommendations') {
    return `<ol class="rp-recs">${texts.map((t, i) => `<li class="rp-rec">
      <span class="rp-rec-num tb-num">${REPORT.recommendations[i].id}</span>
      <div class="rp-rec-main"><p class="rp-rec-text" data-edit>${t}</p>
      <span class="tb-tag tb-tag--minimal">Owner: ${esc(REPORT.recommendations[i].owner)}</span></div></li>`).join('')}</ol>`
  }
  return texts.map(t => `<p class="rp-p" data-edit>${t}</p>`).join('')
}
const marksHtml = id => (state.edits[id] ? '<span class="tb-tag tb-tag--accent">Edited</span>' : '')
function actionsHtml(s) {
  const editable = EDITABLE.includes(s.id)
  return `<div class="rp-sec-actions">
    ${editable ? `<button class="tb-button tb-button--minimal tb-button--sm" type="button" data-act="edit">${I.edit}Edit</button>
    <button class="tb-button tb-button--minimal tb-button--sm" type="button" data-act="history">${I.history}History</button>` : ''}
    ${s.id !== 'findings' ? `<button class="tb-button tb-button--minimal tb-button--sm" type="button" data-act="comment">${I.comment}Comment</button>` : ''}
  </div>`
}

// Revenue: four figures, the quarter week by week against last year, and the regions.
function revenueHtml() {
  const F = FIGURES
  const regions = [...F.byRegion].sort((a, b) => b.now - a.now)
  return `<p class="rp-p">The quarter week by week, against the same weeks of last year, then by region.</p>
    <div class="rp-kpis">
      <div class="tb-stat"><span class="tb-stat-label">Revenue</span><span class="tb-stat-value">${fmtEurCompact(F.revenue)}</span><span class="tb-stat-sub"><span class="tb-stat-delta tb-stat-delta--good">${fmtDelta(F.vsLY)}</span>on Q3 2025</span></div>
      <div class="tb-stat"><span class="tb-stat-label">Orders</span><span class="tb-stat-value">${fmtInt(F.orders)}</span></div>
      <div class="tb-stat"><span class="tb-stat-label">Average order</span><span class="tb-stat-value">${fmtEurRound(F.aov)}</span></div>
      <div class="tb-stat"><span class="tb-stat-label">Conversion</span><span class="tb-stat-value">${fmtPct(F.convNow)}</span><span class="tb-stat-sub">${fmtPct(F.convLY)} a year before</span></div>
    </div>
    <figure class="tb-card rp-figure" data-figure="weekly">
      <div class="rp-figure-head"><p class="tb-caps">Revenue per week</p>${legendHtml([{ name: 'Q3 2026', colour: 'var(--tb-accent)', kind: 'line' }, { name: 'Q3 2025', colour: 'var(--tb-fg-subtle)', kind: 'dashed' }])}${expandButton('Revenue per week')}</div>
      <div class="rp-chart" data-chart-host="weekly"></div>
    </figure>
    <div class="tb-table-wrap rp-table-wrap"><table class="tb-table rp-table">
      <thead><tr><th>Region</th><th class="is-num">Q3 2026</th><th class="is-num">Q3 2025</th><th class="is-num">Change</th><th class="is-num">Share</th></tr></thead>
      <tbody>${regions.map(r => `<tr><td>${esc(r.name)}</td><td class="is-num">${fmtEurRound(r.now)}</td><td class="is-num">${fmtEurRound(r.before)}</td>
        <td class="is-num"><span class="tb-stat-delta ${r.growth >= 0 ? 'tb-stat-delta--good' : 'tb-stat-delta--bad'}">${fmtDelta(r.growth)}</span></td><td class="is-num">${fmtPct(r.share)}</td></tr>`).join('')}</tbody>
    </table></div>`
}

// Customers: the accounts at risk, largest first.
function riskTableHtml() {
  return `<div class="tb-table-wrap rp-table-wrap"><table class="tb-table rp-table">
    <thead><tr><th>Account</th><th>Owner</th><th class="is-num">Revenue, 12 months</th><th class="is-num">Change</th><th class="is-num">Churn risk</th></tr></thead>
    <tbody>${FIGURES.risky.slice(0, 6).map(a => `<tr>
      <td><span class="rp-entity">${show(a.name)}</span><span class="tb-text tb-text--sm tb-text--muted">${a.id}, ${esc(COUNTRY_BY_CODE[a.country].name)}</span></td>
      <td>${esc(TEAM_BY_ID[a.owner].name)}</td>
      <td class="is-num">${fmtEurRound(a.revenue)}</td>
      <td class="is-num">${a.change === null ? 'n/a' : `<span class="tb-stat-delta ${a.change >= 0 ? 'tb-stat-delta--good' : 'tb-stat-delta--bad'}">${fmtDelta(a.change)}</span>`}</td>
      <td class="is-num">${probHtml(a.risk)}</td>
    </tr>`).join('')}</tbody></table></div>`
}

function findingHtml(x, i) {
  const f = x.finding
  return `<section class="rp-section rp-finding rp-finding--${f.tone}" id="sec-${x.id}" data-sec="${x.id}">
    <div class="rp-sec-head"><p class="tb-caps rp-finding-num">Finding ${i + 1}</p>${actionsHtml(x)}</div>
    <h3 class="tb-h4 rp-finding-title">${esc(x.title)}<span class="rp-marks">${marksHtml(x.id)}</span></h3>
    <dl class="tb-dl tb-dl--stacked rp-figures">${f.figures.map(([k, v]) => `<div><dt>${k}</dt><dd class="tb-num">${v}</dd></div>`).join('')}</dl>
    <div class="rp-sec-body">${bodyHtml(x.id)}</div>
    <div class="rp-sec-comments" data-comments="${x.id}"></div>
  </section>`
}

function sectionHtml(s) {
  if (s.sub) return ''
  if (s.id === 'findings') {
    return `<section class="rp-section" id="sec-findings" data-sec="findings">
      <div class="rp-sec-head"><h2 class="tb-h3 rp-sec-title">Key findings</h2>${actionsHtml(s)}</div>
      <p class="rp-p">Three things moved the quarter. Each finding shows its own figures.</p>
      ${SECTIONS.filter(x => x.sub).map(findingHtml).join('')}
      <figure class="tb-card rp-figure" data-figure="products">
        <div class="rp-figure-head"><p class="tb-caps">Revenue by product</p>${legendHtml([{ name: 'Q3 2026', colour: 'var(--tb-series-1)' }, { name: 'Q3 2025', colour: 'var(--tb-series-6)' }])}${expandButton('Revenue by product')}</div>
        <div class="rp-chart" data-chart-host="products"></div>
      </figure>
    </section>`
  }
  let body = ''
  if (EDITABLE.includes(s.id)) body = `<div class="rp-sec-body">${bodyHtml(s.id)}</div>${s.id === 'customers' ? riskTableHtml() : ''}`
  else if (s.id === 'revenue') body = revenueHtml()
  else body = `<ul class="rp-sources">${REPORT.sources.map(x => `<li><span class="tb-mono rp-source-name">${esc(x.name)}</span><span class="tb-text tb-text--sm tb-text--muted">${esc(x.what)}, ${fmtInt(x.rows)} rows</span></li>`).join('')}</ul>`
  return `<section class="rp-section" id="sec-${s.id}" data-sec="${s.id}">
    <div class="rp-sec-head"><h2 class="tb-h3 rp-sec-title">${esc(s.title)}<span class="rp-marks">${EDITABLE.includes(s.id) ? marksHtml(s.id) : ''}</span></h2>${actionsHtml(s)}</div>
    ${body}
    <div class="rp-sec-comments" data-comments="${s.id}"></div>
  </section>`
}

function renderDoc() {
  const m = REPORT.meta
  const meta = [['Period', m.period], ['Audience', m.audience], ['Author', m.author], ['Reviewer', m.reviewer], ['Updated', fmtDate(m.updated)], ['Version', `${cur().id}, ${statusOf().label.toLowerCase()}`]]
  $('rp-doc').innerHTML = `<header class="rp-doc-head">
      <p class="tb-caps">Report, ${REPORT.id}</p>
      <h1 class="tb-h2 rp-doc-title">${esc(REPORT.title)}</h1>
      <dl class="tb-dl tb-dl--stacked rp-meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    </header>
    ${SECTIONS.map(sectionHtml).join('')}`
  $('rp-doc').classList.toggle('is-locked', cur().status === 'approved')
  drawCharts()
  renderComments()
  observeSections()
}

// The two charts in the document, drawn to its width.
function drawCharts() {
  const weekly = document.querySelector('[data-chart-host="weekly"]')
  if (weekly) {
    const now = daily('revenue', Q)
    const before = daily('revenue', LY)
    const weeks = []
    for (let s = 0; s + 6 < now.length; s += 7) weeks.push(s)
    const total = (arr, s) => arr.slice(s, s + 7).reduce((a, v) => a + v, 0)
    weekly.innerHTML = lineChart({
      id: 'rp-weekly', width: weekly.clientWidth, height: 220,
      points: weeks.map((s, i) => ({ key: String(i), tick: i % 2 ? '' : fmtDate(isoOf(Q.from + s)).replace(/ \d{4}$/, ''), title: `Week of ${fmtDate(isoOf(Q.from + s))}` })),
      series: [{ name: 'Q3 2026', colour: 'var(--tb-accent)', values: weeks.map(s => total(now, s)), area: true }, { name: 'Q3 2025', colour: 'var(--tb-fg-subtle)', values: weeks.map(s => total(before, s)), dashed: true }],
      yFormat: fmtEurCompact, valueFormat: fmtEurRound,
    })
  }
  const products = document.querySelector('[data-chart-host="products"]')
  if (products) {
    const list = FIGURES.byProduct
    products.innerHTML = barChart({
      id: 'rp-products', width: products.clientWidth, height: 220, stacked: false, showValues: false, gap: 0.3,
      groups: list.map(p => ({ key: p.id, label: p.short, title: p.name })),
      series: [{ name: 'Q3 2026', colour: 'var(--tb-series-1)', values: list.map(p => p.now) }, { name: 'Q3 2025', colour: 'var(--tb-series-6)', values: list.map(p => p.before) }],
      yFormat: fmtEurCompact, valueFormat: fmtEurRound,
    })
  }
}

// Draws one section again in place, keeping the page where it is.
function rerender(id) {
  const el = $(`sec-${id}`)
  el.querySelector('.rp-sec-body').innerHTML = bodyHtml(id)
  el.querySelector('.rp-marks').innerHTML = marksHtml(id)
  el.classList.remove('is-editing')
  el.querySelector('.rp-edit-bar')?.remove()
  if (state.editing === id) state.editing = null
}

/* Section actions */

function startEdit(id) {
  if (state.editing && state.editing !== id) rerender(state.editing)
  state.editing = id
  const el = $(`sec-${id}`)
  el.classList.add('is-editing')
  el.querySelector('.rp-sec-body').innerHTML = bodyHtml(id, true)
  el.querySelectorAll('[data-edit]').forEach(p => { p.contentEditable = 'true' })
  el.querySelector('.rp-sec-body').insertAdjacentHTML('afterend', `<div class="rp-edit-bar">
    <span class="tb-text tb-text--sm tb-text--muted">Ctrl+Enter to save, Escape to cancel</span><span class="tb-spacer"></span>
    <button class="tb-button tb-button--sm" type="button" data-act="cancel">Cancel</button>
    <button class="tb-button tb-button--sm tb-button--primary" type="button" data-act="save">${I.check}Save</button></div>`)
  el.querySelector('[data-edit]').focus()
}
function saveEdit(id) {
  const texts = [...$(`sec-${id}`).querySelectorAll('[data-edit]')].map(p => p.textContent.replace(/\s+/g, ' ').trim())
  const current = textsFor(id)
  if (texts.join('\n') === ORIGINAL[id].join('\n')) delete state.edits[id]
  else if (texts.join('\n') !== current.join('\n')) state.edits[id] = texts
  const changed = texts.join('\n') !== current.join('\n')
  store.set('rp-edits', state.edits)
  rerender(id)
  if (changed) logChange(id, 'edit')
  working(`${SEC[id].title} saved at ${fmtTime(localIso())}`)
  tb.toast({ message: `${SEC[id].title} saved. The edit stays in this browser.`, intent: 'success' })
}
$('rp-doc').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]')
  if (!btn) return
  const id = btn.closest('[data-sec]').dataset.sec
  const act = btn.dataset.act
  if (act === 'edit') startEdit(id)
  else if (act === 'save') saveEdit(id)
  else if (act === 'cancel') rerender(id)
  else if (act === 'history') openHistory(id, btn)
})
$('rp-doc').addEventListener('keydown', e => {
  if (!state.editing || !e.target.closest('[data-edit]')) return
  if (e.key === 'Escape') rerender(state.editing)
  else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveEdit(state.editing) }
  else if (e.key === 'Enter') e.preventDefault()
})
const working = text => { $('rp-working').textContent = text }

/* Outline, following the scroll */

function renderOutline() {
  $('rp-outline').innerHTML = `<p class="tb-caps rp-outline-head">Contents</p>
    <ol class="rp-outline-list">${SECTIONS.map(s => `<li><a class="rp-outline-link${s.sub ? ' rp-outline-link--sub' : ''}" href="#sec-${s.id}" data-goto="${s.id}"><span class="rp-outline-text">${esc(s.title)}</span><span class="rp-outline-count tb-num" data-count="${s.id}" hidden></span></a></li>`).join('')}</ol>
    <div class="rp-outline-foot">
      <span class="tb-text tb-text--sm tb-text--muted" id="rp-comments-count"></span>
      <label class="tb-switch"><input type="checkbox" id="rp-show-resolved" /><span class="tb-switch-track"></span><span class="tb-text--sm">Resolved</span></label>
    </div>`
}
// On a fitted page (wide screens) the document column scrolls, not the window.
const scroller = () => { const col = document.querySelector('.rp-doc-col'); return getComputedStyle(col).overflowY === 'auto' ? col : null }
let observer
const visible = new Set()
function observeSections() {
  observer?.disconnect()
  visible.clear()
  observer = new IntersectionObserver(entries => {
    entries.forEach(en => (en.isIntersecting ? visible.add(en.target.dataset.sec) : visible.delete(en.target.dataset.sec)))
    // At the end of the document the last section rarely reaches the marker line, so it wins there.
    const box = scroller() || document.scrollingElement
    const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 4
    const current = atEnd ? SECTIONS.at(-1) : [...SECTIONS].reverse().find(s => visible.has(s.id))
    if (current) setActive(current.id)
  }, { root: scroller(), rootMargin: '-40px 0px -55% 0px' })
  document.querySelectorAll('.rp-doc [data-sec]').forEach(el => observer.observe(el))
}
function setActive(id) {
  document.querySelectorAll('.rp-outline-link').forEach(a => {
    const on = a.dataset.goto === id
    a.classList.toggle('is-active', on)
    if (on) a.setAttribute('aria-current', 'location')
    else a.removeAttribute('aria-current')
  })
}
document.addEventListener('click', e => {
  const link = e.target.closest('[data-goto]')
  if (!link) return
  e.preventDefault()
  $(`sec-${link.dataset.goto}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  setActive(link.dataset.goto)
})

/* Status */

const statusTag = st => `<span class="tb-tag${st.tone ? ` tb-tag--${st.tone}` : ''}"><span class="tb-tag-dot"></span>${st.label}</span>`
function nextSteps() {
  const st = cur().status
  if (st === 'draft') return [{ go: 'review', label: `Send ${cur().id} for review` }]
  if (st === 'review') return [{ go: 'approved', label: `Approve ${cur().id}` }, { go: 'draft', label: 'Back to draft' }]
  return [{ go: 'next', label: `Start ${nextVersion()} as a new draft` }]
}
function renderStatus() {
  const v = cur()
  const st = statusOf(v)
  $('rp-status-tag').innerHTML = statusTag(st)
  $('rp-id').textContent = `${REPORT.id} ${v.id}`
  $('rp-status-menu-btn').innerHTML = `Next step${I.chevron}`
  $('rp-status-menu').innerHTML = nextSteps().map(x => `<button class="tb-menu-item" type="button" role="menuitem" data-go="${x.go}"><span class="tb-menu-label">${x.label}</span></button>`).join('')
  $('rp-status-body').innerHTML = `<div class="rp-status-line">${statusTag(st)}<span class="tb-text tb-text--sm tb-text--muted">${REPORT.id}, ${v.id}</span></div>
    <p class="tb-text tb-text--sm rp-status-text">${st.text(v)}</p>`
  const r = person(REPORT.meta.reviewer)
  $('rp-status-foot').innerHTML = `<span class="tb-avatar tb-avatar--sm tb-avatar--neutral" aria-hidden="true">${r.initials}</span><span class="tb-text tb-text--sm">Reviewer <strong>${esc(r.name)}</strong></span>`
  $('rp-doc').classList.toggle('is-locked', v.status === 'approved')
}
function step(go) {
  if (state.editing) rerender(state.editing)
  const v = cur()
  const at = localIso()
  let message
  if (go === 'review') {
    Object.assign(v, { status: 'review', sentAt: at, sentBy: USER.name, texts: liveTexts() })
    message = `${v.id} sent to ${REPORT.meta.reviewer} for review.`
  } else if (go === 'draft') {
    Object.assign(v, { status: 'draft', texts: null })
    message = `${v.id} is back in draft.`
  } else if (go === 'approved') {
    history.versions.forEach(x => { if (x.status === 'approved') x.status = 'superseded' })
    Object.assign(v, { status: 'approved', approvedAt: at, approvedBy: USER.name, texts: liveTexts() })
    message = `${v.id} approved and locked. Earlier approved versions are superseded.`
  } else {
    const id = nextVersion()
    history.versions.push({ id, status: 'draft', by: USER.name, note: `Started from ${v.id} as approved.`, createdAt: at, base: liveTexts(), texts: null, exports: [] })
    message = `${id} started from ${v.id}. ${v.id} stays as it was approved.`
  }
  saveHistory()
  renderStatus()
  renderDoc()
  renderVersions()
  renderExports()
  tb.toast({ message, intent: go === 'approved' ? 'success' : undefined })
}
$('rp-status-menu').addEventListener('click', e => {
  const item = e.target.closest('[data-go]')
  if (!item) return
  // The step redraws this menu, so it waits one tick for the dropdown to close first.
  if (item.dataset.go !== 'approved') { setTimeout(() => step(item.dataset.go)); return }
  askConfirm({
    title: `Approve ${cur().id}?`, icon: I.lock, go: 'Approve',
    text: `Approving locks ${cur().id} as it reads now. Edit turns off and comments stay open. A later change starts ${nextVersion()}, and ${cur().id} stays readable in the version history.`,
    onGo: () => step('approved'),
  })
})
let onConfirm = null
function askConfirm({ title, text, go, icon, onGo }) {
  $('rp-confirm-title').textContent = title
  $('rp-confirm-text').textContent = text
  $('rp-confirm-icon').innerHTML = icon || ''
  $('rp-confirm-go').textContent = go
  onConfirm = onGo
  openDialog('rp-confirm')
}
$('rp-confirm-go').addEventListener('click', () => { closeDialog('rp-confirm'); onConfirm?.() })

/* Versions */

const when = (at, by) => `${fmtDateTime(at)}${by ? `, ${by}` : ''}`
function versionLine(v) {
  if (v.status === 'draft') return `Started ${when(v.createdAt, v.by)}`
  if (v.status === 'review') return `Sent for review ${when(v.sentAt, v.sentBy)}`
  const after = history.versions.slice(history.versions.indexOf(v) + 1).find(x => x.approvedAt)
  return `Approved ${when(v.approvedAt, v.approvedBy)}${v.status === 'superseded' && after ? `, replaced by ${after.id}` : ''}`
}
function changeCounts(v) {
  const before = prevOf(v)
  if (!before) return null
  const a = textsOf(before)
  const b = textsOf(v)
  return { before, added: Object.keys(b).filter(id => !a[id]).length, changed: Object.keys(b).filter(id => a[id] && a[id].join('\n') !== b[id].join('\n')).length }
}
function changeSummary(v) {
  const c = changeCounts(v)
  if (!c) return 'First version'
  const parts = [c.changed && `${fmtInt(c.changed)} ${c.changed === 1 ? 'section' : 'sections'} reworded`, c.added && `${fmtInt(c.added)} added`].filter(Boolean)
  return parts.length ? `${parts.join(', ')} since ${c.before.id}` : `No wording change since ${c.before.id}`
}
function changeShort(v) {
  const c = changeCounts(v)
  if (!c) return 'first version'
  return [c.changed && `${fmtInt(c.changed)} reworded`, c.added && `${fmtInt(c.added)} added`].filter(Boolean).join(', ') || 'no wording change'
}
const versionWho = v => (v.status === 'draft' ? v.by : v.status === 'review' ? v.sentBy : v.approvedBy)
const versionAt = v => (v.status === 'draft' ? v.createdAt : v.status === 'review' ? v.sentAt : v.approvedAt)
function renderVersions() {
  const list = [...history.versions].reverse()
  $('rp-versions-hint').textContent = `${fmtInt(list.length)} versions`
  $('rp-versions-body').innerHTML = `<ol class="tb-list tb-list--divided rp-versions">${list.map(v => `<li>
    <button class="tb-list-item" type="button" data-version="${v.id}" aria-label="${v.id}, ${statusOf(v).label}. Compare with the version before">
      <span class="tb-list-item-body">
        <span class="rp-version-top"><span class="tb-list-item-title tb-num">${v.id}</span>${statusTag(statusOf(v))}<span class="tb-spacer"></span><span class="tb-list-item-meta">${fmtDate(versionAt(v))}</span></span>
        <span class="tb-list-item-meta rp-version-meta">${esc(versionWho(v))}, ${changeShort(v)}</span>
      </span>
    </button></li>`).join('')}</ol>`
}
$('rp-versions-body').addEventListener('click', e => {
  const btn = e.target.closest('[data-version]')
  if (btn) openCompare(history.versions.find(x => x.id === btn.dataset.version), btn)
})

/* A word-by-word comparison: the longest run of words both texts share, and what is added or
   removed around it. A rewrite shares few words, and marked word by word it reads as noise, so it
   shows both whole instead. */
function diffWords(a, b) {
  const A = a.split(/(\s+)/)
  const B = b.split(/(\s+)/)
  const n = A.length
  const m = B.length
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out = []
  const push = (t, x) => { const last = out.at(-1); if (last && last.t === t) last.x += x; else out.push({ t, x }) }
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (A[i] === B[j]) { push('=', A[i]); i++; j++ } else if (L[i + 1][j] >= L[i][j + 1]) push('-', A[i++])
    else push('+', B[j++])
  }
  while (i < n) push('-', A[i++])
  while (j < m) push('+', B[j++])
  const kept = out.filter(o => o.t === '=').reduce((s, o) => s + o.x.length, 0)
  if (kept < Math.max(a.length, b.length) * 0.7) {
    return `<p class="tb-caps rp-diff-label">Before</p><div class="rp-diff-before">${show(a)}</div><p class="tb-caps rp-diff-label">After</p><div>${show(b)}</div>`
  }
  return out.map(({ t, x }) => (t === '=' ? show(x) : t === '+' ? `<ins class="rp-ins">${show(x)}</ins>` : `<del class="rp-del">${show(x)}</del>`)).join('')
}

function dialogShell(id, title) {
  let el = $(id)
  if (!el) {
    el = document.createElement('div')
    el.className = 'tb-dialog-backdrop'
    el.id = id
    el.innerHTML = `<div class="tb-dialog tb-dialog--lg" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
      <div class="tb-dialog-header"><h2 class="tb-dialog-title" id="${id}-title"></h2>
        <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-tb-dialog-close aria-label="Close">${I.close}</button></div>
      <div class="tb-dialog-body rp-dialog-body" id="${id}-body"></div></div>`
    document.body.append(el)
    tb.init(el)
  }
  $(`${id}-title`).textContent = title
  return $(`${id}-body`)
}

function openCompare(v, trigger, against = prevOf(v)) {
  const older = history.versions.slice(0, history.versions.indexOf(v))
  const body = dialogShell('rp-compare', against ? `${v.id} compared with ${against.id}` : `${v.id}, the first version`)
  const a = against ? textsOf(against) : {}
  const b = textsOf(v)
  const same = []
  const blocks = SECTIONS.map(x => x.id).filter(id => EDITABLE.includes(id)).map(id => {
    const title = esc(SEC[id].title)
    if (!b[id] && !a[id]) return ''
    if (!a[id]) return `<section class="rp-cmp"><h3 class="tb-h4 rp-cmp-title">${title}<span class="tb-tag tb-tag--success">New in ${v.id}</span></h3><div class="rp-diff">${b[id].map(show).join('\n\n')}</div></section>`
    if (!b[id]) return `<section class="rp-cmp"><h3 class="tb-h4 rp-cmp-title">${title}<span class="tb-tag tb-tag--danger">Removed in ${v.id}</span></h3></section>`
    if (a[id].join('\n') === b[id].join('\n')) { same.push(SEC[id].title); return '' }
    // Paragraph by paragraph when the count holds, so one rewritten paragraph does not blur the rest.
    const parts = a[id].length === b[id].length ? a[id].map((x, k) => (x === b[id][k] ? show(x) : diffWords(x, b[id][k]))) : [diffWords(a[id].join('\n\n'), b[id].join('\n\n'))]
    return `<section class="rp-cmp"><h3 class="tb-h4 rp-cmp-title">${title}</h3>${parts.map(x => `<div class="rp-diff">${x}</div>`).join('')}</section>`
  }).join('')
  body.innerHTML = `<div class="rp-cmp-head">
      <p class="tb-text tb-text--sm tb-text--muted">${statusTag(statusOf(v))} ${versionLine(v)}. ${changeSummary(v)}.</p>
      ${older.length ? `<label class="rp-cmp-against"><span class="tb-text tb-text--sm">Compare with</span>
        <select class="tb-select tb-select--sm" id="rp-cmp-against">${older.map(o => `<option value="${o.id}"${o === against ? ' selected' : ''}>${o.id}, ${statusOf(o).label.toLowerCase()}</option>`).join('')}</select></label>` : ''}
    </div>
    <p class="tb-text tb-text--sm">${esc(v.note)}${(v.exports || []).length ? ` Exported ${v.exports.map(x => `${x.format} ${fmtDate(x.at)}${x.redacted ? ', names hidden' : ''}`).join('; ')}.` : ''}</p>
    <p class="tb-text tb-text--sm tb-text--muted rp-cmp-legend"><ins class="rp-ins">Added</ins> <del class="rp-del">Removed</del> Charts and tables follow the data and are not compared here.</p>
    ${blocks || '<p class="tb-text">No wording changed.</p>'}
    ${same.length ? `<p class="tb-text tb-text--sm tb-text--muted">Unchanged: ${same.map(esc).join(', ')}.</p>` : ''}`
  $('rp-cmp-against')?.addEventListener('change', e => openCompare(v, trigger, history.versions.find(x => x.id === e.target.value)))
  openDialog('rp-compare', trigger)
}

// A section's history: every wording it had in the current version, newest first.
const KIND = { edit: 'Edited', restore: 'Restored' }
function openHistory(id, trigger) {
  const v = cur()
  const entries = history.trail.filter(t => t.v === v.id && t.section === id).reverse()
  entries.push({ kind: 'start', at: v.createdAt, by: v.by, texts: (v.base || ORIGINAL)[id] || ORIGINAL[id] })
  const now = textsFor(id).join('\n')
  const locked = v.status === 'approved'
  const body = dialogShell('rp-history', `History of ${SEC[id].title}`)
  body.innerHTML = `<p class="tb-text tb-text--sm tb-text--muted">Every wording this section had in ${v.id}. Restoring one adds a new step, so nothing is lost. Earlier versions are in the version history.</p>
    ${locked ? `<p class="tb-text tb-text--sm">${v.id} is approved and locked. Start ${nextVersion()} to change it.</p>` : ''}
    <ol class="tb-list tb-list--divided rp-trail">${entries.map((t, k) => {
      const isNow = t.texts.join('\n') === now && !entries.slice(0, k).some(x => x.texts.join('\n') === now)
      const label = t.kind === 'start' ? `Start of ${v.id}` : `${KIND[t.kind]}${t.detail ? `, ${t.detail}` : ''}`
      const text = hide(t.texts.join(' '))
      return `<li class="tb-list-item rp-trail-item">
        <span class="tb-avatar tb-avatar--sm tb-avatar--neutral" aria-hidden="true">${person(t.by).initials}</span>
        <span class="tb-list-item-body">
          <span class="rp-version-top"><span class="tb-list-item-title">${label}</span>${isNow ? '<span class="tb-tag tb-tag--accent">Current</span>' : ''}<span class="tb-spacer"></span><span class="tb-list-item-meta">${when(t.at, t.by)}</span></span>
          <span class="tb-text tb-text--sm rp-trail-text">${esc(text.length > 320 ? `${text.slice(0, 320)}…` : text)}</span>
          ${isNow || locked ? '' : `<span><button class="tb-button tb-button--sm" type="button" data-restore="${k}">${I.history}Restore this wording</button></span>`}
        </span></li>`
    }).join('')}</ol>`
  body.onclick = e => {
    const b = e.target.closest('[data-restore]')
    if (!b) return
    const t = entries[+b.dataset.restore]
    if (t.texts.join('\n') === ORIGINAL[id].join('\n')) delete state.edits[id]
    else state.edits[id] = [...t.texts]
    store.set('rp-edits', state.edits)
    rerender(id)
    logChange(id, 'restore', `from ${fmtDateTime(t.at)}`)
    closeDialog('rp-history')
    tb.toast({ message: `${SEC[id].title} restored to the wording from ${fmtDateTime(t.at)}. The step is in its history.`, intent: 'success' })
  }
  openDialog('rp-history', trigger)
}

/* Comments, under the section they are about. The outline counts the open ones. */

function commentHtml(c) {
  const p = c.by || person(USER.name)
  return `<li class="tb-list-item rp-comment${c.resolved ? ' is-resolved' : ''}">
    <div class="rp-comment-head"><span class="tb-avatar tb-avatar--sm tb-avatar--neutral" aria-hidden="true">${esc(p.initials)}</span>
      <span class="tb-list-item-body"><span class="tb-list-item-title">${esc(p.name)}</span></span>
      <span class="tb-list-item-trailing">${fmtDateTime(c.at)}</span></div>
    <p class="tb-text tb-text--sm rp-comment-text-p">${show(c.text)}</p>
    <div class="tb-toolbar">${c.resolved
    ? `<span class="tb-text tb-text--sm tb-text--muted">Resolved by ${esc(c.resolved)}</span><span class="tb-spacer"></span><button class="tb-button tb-button--minimal tb-button--sm" type="button" data-reopen="${c.id}">Reopen</button>`
    : `<span class="tb-spacer"></span><button class="tb-button tb-button--minimal tb-button--sm" type="button" data-resolve="${c.id}">${I.check}Resolve</button>`}</div>
  </li>`
}
const formHtml = id => `<form class="rp-comment-form" data-comment-form="${id}" autocomplete="off">
    <div class="tb-field rp-comment-field">
      <label class="tb-sr-only" for="rp-comment-text-${id}">Comment on ${esc(SEC[id]?.title || id)}</label>
      <textarea class="tb-input rp-comment-text" id="rp-comment-text-${id}" rows="2" placeholder="Add a comment for the team"></textarea>
      <p class="tb-field-error">Write something before posting.</p>
    </div>
    <div class="tb-toolbar">
      <span class="tb-text tb-text--sm tb-text--muted">Ctrl+Enter to post</span>
      <span class="tb-spacer"></span>
      <button class="tb-button tb-button--minimal tb-button--sm" type="button" data-cancel-comment>Cancel</button>
      <button class="tb-button tb-button--sm tb-button--primary" type="submit">Post</button>
    </div>
  </form>`
function renderComments() {
  const showResolved = $('rp-show-resolved')?.checked
  const open = state.comments.filter(c => !c.resolved)
  const count = $('rp-comments-count')
  if (count) count.textContent = open.length ? `${fmtInt(open.length)} open ${open.length === 1 ? 'comment' : 'comments'}` : 'No open comments'
  document.querySelectorAll('[data-count]').forEach(el => {
    const n = open.filter(c => c.section === el.dataset.count).length
    el.textContent = n ? fmtInt(n) : ''
    el.hidden = !n
  })
  document.querySelectorAll('[data-comments]').forEach(host => {
    const id = host.dataset.comments
    const list = state.comments.filter(c => c.section === id && (showResolved || !c.resolved))
    const form = host.querySelector('[data-comment-form]')
    const draft = form ? form.querySelector('textarea').value : null
    host.innerHTML = (list.length ? `<ul class="tb-list tb-list--divided rp-comment-list">${list.map(commentHtml).join('')}</ul>` : '') + (draft !== null ? formHtml(id) : '')
    host.hidden = !host.innerHTML
    if (draft !== null) host.querySelector('textarea').value = draft
  })
}
function openCommentForm(id) {
  const host = document.querySelector(`[data-comments="${id}"]`)
  if (!host || host.querySelector('[data-comment-form]')) { host?.querySelector('textarea')?.focus(); return }
  host.insertAdjacentHTML('beforeend', formHtml(id))
  host.hidden = false
  host.querySelector('textarea').focus()
}
function closeCommentForm(id) {
  const host = document.querySelector(`[data-comments="${id}"]`)
  host?.querySelector('[data-comment-form]')?.remove()
  if (host && !host.innerHTML.trim()) host.hidden = true
}
const saveComments = () => store.set('rp-comments', state.comments)
$('rp-doc').addEventListener('click', e => {
  const r = e.target.closest('[data-resolve], [data-reopen]')
  if (r) {
    const c = state.comments.find(x => x.id === (r.dataset.resolve || r.dataset.reopen))
    c.resolved = r.dataset.resolve ? USER.name : null
    saveComments()
    renderComments()
    if (r.dataset.resolve) tb.toast({ message: 'Comment resolved. Turn on Resolved in the contents to see it again.', intent: 'success' })
    return
  }
  const cancel = e.target.closest('[data-cancel-comment]')
  if (cancel) closeCommentForm(cancel.closest('[data-comments]').dataset.comments)
})
// Comment opens the section's form. It runs before the section's own action handler.
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="comment"]')
  if (!b) return
  e.stopPropagation()
  openCommentForm(b.closest('[data-sec]').dataset.sec)
}, true)
document.addEventListener('change', e => { if (e.target.id === 'rp-show-resolved') renderComments() })
const postComment = form => {
  const id = form.dataset.commentForm
  const field = form.querySelector('.rp-comment-field')
  const text = form.querySelector('textarea').value.trim()
  field.classList.toggle('is-invalid', !text)
  if (!text) return
  state.comments.push({ id: `c${Date.now()}`, section: id, by: person(USER.name), at: localIso(), resolved: null, text })
  saveComments()
  closeCommentForm(id)
  renderComments()
}
$('rp-doc').addEventListener('submit', e => { const f = e.target.closest('[data-comment-form]'); if (f) { e.preventDefault(); postComment(f) } })
$('rp-doc').addEventListener('keydown', e => {
  const f = e.target.closest && e.target.closest('[data-comment-form]')
  if (f && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); postComment(f) }
})
$('rp-doc').addEventListener('input', e => { e.target.closest('.rp-comment-field')?.classList.remove('is-invalid') })

/* Hiding names and printing */

function setRedact(on) {
  state.redact = on
  $('rp-redact').setAttribute('aria-pressed', String(on))
  $('rp-redact').classList.toggle('is-active', on)
  $('rp-redact').innerHTML = `${I.eyeOff}${on ? 'Names hidden' : 'Hide names'}`
  $('rp-opt-redact').checked = on
  if (state.editing) state.editing = null
  renderDoc()
  describeExport()
}
$('rp-redact').addEventListener('click', () => setRedact(!state.redact))
$('rp-opt-redact').addEventListener('change', e => setRedact(e.target.checked))
;['rp-print', 'rp-print-2'].forEach(id => {
  $(id).innerHTML = `${I.print}Print`
  $(id).addEventListener('click', () => window.print())
})

/* Export */

$('rp-formats').innerHTML = FORMATS.map((f, i) => `<label class="rp-format">
  <input type="radio" name="rp-format" value="${f.id}"${i === 0 ? ' checked' : ''} />
  <span class="rp-format-icon">${f.icon}</span>
  <span class="rp-format-text"><strong>${f.label}</strong><span class="tb-text tb-text--sm tb-text--muted">${f.hint}</span></span>
</label>`).join('')
const format = () => FORMATS.find(f => f.id === document.querySelector('input[name="rp-format"]:checked').value)
const fileName = f => (f.ext ? `${REPORT.id}-${cur().id}.${f.ext}` : `Link to ${REPORT.id} ${cur().id}`)
function describeExport() {
  const f = format()
  const parts = ['summary', 'revenue', 'findings', ...($('rp-opt-customers').checked ? ['accounts at risk'] : []), 'recommendations', ...($('rp-opt-method').checked ? ['method and sources'] : [])]
  $('rp-export-what').innerHTML = `<strong>${esc(fileName(f))}</strong> with the ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}. Account names are ${state.redact ? 'replaced by their IDs' : 'shown in full'}. Nothing leaves this computer until you share the file.`
}
$('rp-export').addEventListener('change', describeExport)
function openExport(trigger) {
  describeExport()
  $('rp-export-progress').hidden = true
  $('rp-export-go').disabled = false
  openDialog('rp-export', trigger)
}
;['rp-export-open', 'rp-export-2'].forEach(id => {
  $(id).innerHTML = `${I.download}Export`
  $(id).addEventListener('click', e => openExport(e.currentTarget))
})
$('rp-export-x').innerHTML = I.close
$('rp-export-go').addEventListener('click', () => {
  const f = format()
  const steps = [[0, 'Preparing'], [35, 'Laying out sections'], [70, state.redact ? 'Hiding names' : 'Packaging'], [100, 'Done']]
  $('rp-export-go').disabled = true
  $('rp-export-progress').hidden = false
  steps.forEach(([pct, label], i) => setTimeout(() => {
    $('rp-export-step').textContent = label
    $('rp-export-pct').textContent = fmtPctN(pct / 100)
    $('rp-export-bar').style.setProperty('--value', pct)
  }, i * 330))
  setTimeout(async () => {
    closeDialog('rp-export')
    $('rp-export-bar').style.setProperty('--value', 0)
    state.exports.unshift({ f, name: fileName(f), redacted: state.redact, at: fmtTime(localIso()) })
    if (f.id !== 'link') { cur().exports = [...(cur().exports || []), { format: f.label, at: localIso(), redacted: state.redact }]; saveHistory(); renderVersions() }
    renderExports()
    let message = `${fileName(f)} is ready.`
    if (f.id === 'link') {
      const url = `${location.origin}${location.pathname}#${REPORT.id}-${cur().id}`
      try { await navigator.clipboard.writeText(url); message = `Share link to ${REPORT.id} ${cur().id} copied.` } catch { message = `Share link to ${REPORT.id} ${cur().id} created.` }
    }
    tb.toast({ message, intent: 'success' })
  }, steps.length * 330 + 100)
})
function renderExports() {
  $('rp-exports-body').innerHTML = state.exports.length
    ? `<ul class="tb-list tb-list--divided tb-list--dense">${state.exports.map(x => `<li class="tb-list-item"><span class="tb-list-item-leading">${x.f.icon}</span>
        <span class="tb-list-item-body"><span class="tb-list-item-title">${esc(x.name)}</span></span>
        <span class="tb-list-item-trailing">${x.redacted ? '<span class="tb-tag tb-tag--minimal">Names hidden</span>' : ''}${x.at}</span></li>`).join('')}</ul>`
    : `<p class="tb-text tb-text--sm tb-text--muted rp-exports-empty">No exports of ${cur().id} yet.</p>`
}

/* Start */

wireCharts($('rp-doc'))
let docWidth = 0
new ResizeObserver(() => { const w = $('rp-doc').clientWidth; if (w !== docWidth) { docWidth = w; drawCharts() } }).observe($('rp-doc'))
document.addEventListener('shell:dock', () => setTimeout(drawCharts, 0))
renderOutline()
setRedact(false)
renderStatus()
renderVersions()
renderExports()
tb.init(document.querySelector('.rp-toolbar'))
tb.init($('rp-main'))
setActive('summary')
const FLAGS = new Set(location.hash.slice(1).split('+'))
if (FLAGS.has('export')) setTimeout(() => openExport($('rp-export-open')), 100)
if (FLAGS.has('versions')) setTimeout(() => openCompare(cur(), $('rp-versions-body')), 100)
if (FLAGS.has('history')) setTimeout(() => openHistory('summary', null), 100)
if (location.hash.startsWith('#sec-')) setTimeout(() => $(location.hash.slice(1))?.scrollIntoView({ block: 'start' }), 100)
