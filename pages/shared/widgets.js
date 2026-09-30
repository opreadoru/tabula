// The widget catalogue behind Add widget in edit mode, for the Layout editor and the Dashboard.
// Every widget is built from system components and charts, and reads its figures from data.js, so
// a widget shows the same numbers as the pages. Each entry: type, name, desc, group, span (1 to
// 12), preview (a small drawing for the catalogue) and build(saved) returning
// { className, html, mount?(el) }. read(el) returns what the widget keeps across reloads.
import { tb } from '../../src/tabula.js'
import { sparkline, lineChart, barChart, donutChart, legendHtml, SERIES } from '../../src/charts.js'
import { expandButton } from '../../src/expand.js'
import { fmtInt, fmtEur, fmtEurRound, fmtEurCompact, fmtPct, fmtDelta, fmtDate, fmtCompact, probHtml, esc } from '../../src/format.js'
import { LAST, YEAR, isoOf, REGIONS, COUNTRIES, PRODUCTS, ACCOUNTS, TEAM_BY_ID, sum, daily, split, eventsOf } from './data.js'
import { statusTag, timelineHtml } from './account.js'

const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const ICON = {
  up: lucide('<path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />'),
  down: lucide('<path d="M16 17h6v-6" /><path d="m22 17-8.5-8.5-5 5L2 7" />'),
  note: lucide('<path d="M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" /><path d="M15 3v5a1 1 0 0 0 1 1h5" />'),
  inbox: lucide('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />'),
}

/* Figures: the last 30 days against the 30 before, and the last twelve months. */

const NOW = { from: LAST - 29, to: LAST }
const BEFORE = { from: LAST - 59, to: LAST - 30 }
const YEAR_Q = { from: YEAR[0].from, to: LAST }
const change = (a, b) => (b ? a / b - 1 : 0)
const deltaHtml = (v, text = 'on the 30 days before') => `<span class="tb-stat-delta ${v >= 0 ? 'tb-stat-delta--good' : 'tb-stat-delta--bad'}">${v >= 0 ? ICON.up : ICON.down}${fmtDelta(v)}</span><span>${text}</span>`
const header = (title, actions = '') => `<div class="tb-card-header"><h2 class="tb-card-title">${esc(title)}</h2>${actions ? `<div class="tb-card-actions">${actions}</div>` : ''}</div>`

// Draws now, and again whenever the card changes width.
function drawToWidth(el, draw) {
  const host = el.querySelector('[data-widget-chart]')
  if (!host) return
  let last = 0
  const paint = () => {
    const w = Math.floor(host.clientWidth)
    if (!w || w === last) return
    last = w
    host.innerHTML = draw(Math.max(200, w))
  }
  paint()
  new ResizeObserver(paint).observe(host)
}
const weeks = () => {
  const out = []
  for (let e = LAST; e - 6 >= YEAR_Q.from; e -= 7) out.unshift({ from: e - 6, to: e })
  return out
}

/* Previews: small drawings on a 112 by 48 grid, in the accent and the border colours. */

const box = (x, y, w, h, fill = 'currentColor') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" style="fill: ${fill}" />`
const soft = 'var(--tb-border-strong)'
const preview = inner => `<svg viewBox="0 0 112 48" aria-hidden="true">${inner}</svg>`
const PREVIEW = {
  stats: preview([0, 1, 2, 3].map(i => `${box(i * 28 + 3, 12, 14, 3, soft)}${box(i * 28 + 3, 20, 20, 7)}${box(i * 28 + 3, 31, 16, 3, soft)}${i ? box(i * 28, 8, 1, 32, soft) : ''}`).join('')),
  kpi: preview(`${box(4, 10, 30, 3, soft)}${box(4, 18, 36, 9)}${box(4, 32, 26, 3, soft)}<polyline points="54,36 62,30 70,32 78,22 86,26 94,16 104,12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /><circle cx="104" cy="12" r="2.5" fill="currentColor" />`),
  line: preview(`<path d="M4 38 L16 30 L28 33 L40 22 L52 26 L64 16 L76 20 L88 10 L100 14 L108 8 L108 44 L4 44Z" style="fill: currentColor; fill-opacity: 0.14" /><polyline points="4,38 16,30 28,33 40,22 52,26 64,16 76,20 88,10 100,14 108,8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /><polyline points="4,42 16,40 28,41 40,37 52,39 64,35 76,37 88,33 100,35 108,32" fill="none" style="stroke: var(--tb-fg-subtle)" stroke-width="1.5" stroke-dasharray="3 2" />`),
  bars: preview([30, 18, 20, 12, 12, 16].map((h, i) => `${box(8 + i * 17, 44 - h, 6, h)}${box(15 + i * 17, 44 - h * 0.75, 6, h * 0.75, soft)}`).join('') + box(2, 44, 108, 1, soft)),
  donut: preview(`${[0, 1, 2, 3].map(i => `<circle cx="24" cy="24" r="16" fill="none" style="stroke: var(--tb-series-${i + 1})" stroke-width="8" stroke-dasharray="${[40, 32, 22, 6][i]} 101" stroke-dashoffset="${-[0, 40, 72, 94][i]}" transform="rotate(-90 24 24)" />`).join('')}${[0, 1, 2].map(i => `${box(52, 12 + i * 10, 5, 5, `var(--tb-series-${i + 1})`)}${box(61, 13 + i * 10, 30, 3, soft)}${box(96, 13 + i * 10, 12, 3)}`).join('')}`),
  list: preview([0, 1, 2].map(i => `${box(4, 5 + i * 15, 48, 3)}${box(4, 11 + i * 15, 32, 2.5, soft)}${box(74, 6 + i * 15, 18, 3, soft)}${box(74, 6 + i * 15, [16, 11, 7][i], 3, 'var(--tb-prob-high)')}`).join('')),
  table: preview(`${box(4, 4, 104, 3, soft)}${[0, 1, 2, 3].map(i => `${box(4, 14 + i * 9, 36, 3)}${box(56, 14 + i * 9, 20, 3, soft)}${box(88, 14 + i * 9, 20, 3)}`).join('')}`),
  timeline: preview(`${box(9, 6, 1.5, 36, soft)}${[0, 1, 2].map(i => `<circle cx="9.75" cy="${9 + i * 14}" r="4" fill="none" stroke="currentColor" stroke-width="1.5" />${box(20, 6 + i * 14, 44, 3)}${box(20, 12 + i * 14, 30, 2.5, soft)}`).join('')}`),
  note: preview(`${box(4, 6, 104, 36, 'var(--tb-accent-soft)')}${box(4, 6, 2.5, 36)}${box(14, 13, 36, 3)}${box(14, 21, 84, 2.5, soft)}${box(14, 28, 70, 2.5, soft)}`),
  empty: preview(`<rect x="4.5" y="4.5" width="103" height="39" rx="3" fill="none" style="stroke: var(--tb-border-strong)" stroke-dasharray="3 3" /><circle cx="56" cy="18" r="5" fill="none" stroke="currentColor" stroke-width="1.5" />${box(40, 28, 32, 3, soft)}${box(46, 34, 20, 2.5, soft)}`),
}

/* The catalogue */

export const WIDGETS = [
  {
    type: 'stats', group: 'Figures', name: 'Key figures', span: 12, preview: PREVIEW.stats,
    desc: 'Revenue, orders, average order and conversion over the last 30 days.',
    build() {
      const r = sum('revenue', NOW)
      const o = sum('orders', NOW)
      const v = sum('visitors', NOW)
      const [r0, o0, v0] = ['revenue', 'orders', 'visitors'].map(m => sum(m, BEFORE))
      const stat = (label, value, sub) => `<div class="tb-stat"><span class="tb-stat-label">${label}</span><span class="tb-stat-value">${value}</span><span class="tb-stat-sub">${sub}</span></div>`
      return {
        className: 'tb-card tb-stat-strip',
        html: [
          stat('Revenue, 30 days', fmtEurRound(r), deltaHtml(change(r, r0))),
          stat('Orders', fmtInt(o), deltaHtml(change(o, o0))),
          stat('Average order', fmtEurRound(r / o), deltaHtml(change(r / o, r0 / o0))),
          stat('Conversion', fmtPct(o / v), `${fmtPct(o0 / v0)} the 30 days before`),
        ].join(''),
      }
    },
  },
  {
    type: 'kpi', group: 'Figures', name: 'Figure with sparkline', span: 4, preview: PREVIEW.kpi,
    desc: 'Revenue over the last 30 days, the change and the trend by day.',
    build() {
      const r = sum('revenue', NOW)
      return {
        className: 'tb-card',
        html: `${header('Revenue, 30 days')}<div class="tb-card-body tb-stat tb-stat--lg">
          <span class="tb-stat-value">${fmtEurRound(r)}</span><span class="tb-stat-spark">${sparkline({ values: daily('revenue', NOW), width: 110, height: 32 })}</span>
          <span class="tb-stat-sub">${deltaHtml(change(r, sum('revenue', BEFORE)))}</span></div>`,
      }
    },
  },
  {
    type: 'line', group: 'Charts', name: 'Line chart', span: 8, preview: PREVIEW.line,
    desc: 'Revenue per week over twelve months, against the year before.',
    build() {
      return {
        className: 'tb-card',
        html: `${header('Revenue per week', `${legendHtml([{ name: 'Last 12 months', colour: 'var(--tb-accent)', kind: 'line' }, { name: 'The year before', colour: 'var(--tb-fg-subtle)', kind: 'dashed' }])}${expandButton('Revenue per week')}`)}<div class="tb-card-body tb-chart-body"><div data-widget-chart></div></div>`,
        mount: el => drawToWidth(el, w => {
          const ws = weeks()
          return lineChart({
            id: `w-line-${el.dataset.tbSection}`, width: w, height: 220, yFormat: fmtEurCompact, valueFormat: fmtEurRound,
            points: ws.map(x => { const first = Array.from({ length: 7 }, (_, k) => x.from + k).find(d => isoOf(d).endsWith('-01')); return { key: String(x.from), tick: first === undefined ? '' : fmtDate(isoOf(first)).split(' ')[1], title: `Week of ${fmtDate(isoOf(x.from))}` } }),
            series: [
              { name: 'Last 12 months', colour: 'var(--tb-accent)', area: true, values: ws.map(x => sum('revenue', x)) },
              { name: 'The year before', colour: 'var(--tb-fg-subtle)', dashed: true, values: ws.map(x => sum('revenue', { from: x.from - 364, to: x.to - 364 })) },
            ],
          })
        }),
      }
    },
  },
  {
    type: 'bars', group: 'Charts', name: 'Bar chart', span: 6, preview: PREVIEW.bars,
    desc: 'Revenue by product over the last 30 days, against the 30 before.',
    build() {
      return {
        className: 'tb-card',
        html: `${header('Revenue by product', `${legendHtml([{ name: '30 days', colour: 'var(--tb-series-1)' }, { name: 'The 30 before', colour: 'var(--tb-series-6)' }])}${expandButton('Revenue by product')}`)}<div class="tb-card-body tb-chart-body"><div data-widget-chart></div></div>`,
        mount: el => drawToWidth(el, w => {
          const now = split('revenue', 'product', NOW)
          const before = split('revenue', 'product', BEFORE)
          return barChart({
            id: `w-bars-${el.dataset.tbSection}`, width: w, height: 220, stacked: false, showValues: false, gap: 0.3, yFormat: fmtEurCompact, valueFormat: fmtEurRound,
            groups: PRODUCTS.map(p => ({ key: p.id, label: p.short, title: p.name })),
            series: [{ name: '30 days', colour: 'var(--tb-series-1)', values: PRODUCTS.map(p => now.get(p.id)) }, { name: 'The 30 before', colour: 'var(--tb-series-6)', values: PRODUCTS.map(p => before.get(p.id)) }],
          })
        }),
      }
    },
  },
  {
    type: 'donut', group: 'Charts', name: 'Donut', span: 4, preview: PREVIEW.donut,
    desc: 'Revenue by region over the last twelve months.',
    build() {
      const by = split('revenue', 'region', YEAR_Q)
      const total = [...by.values()].reduce((s, v) => s + v, 0)
      return {
        className: 'tb-card',
        html: `${header('Revenue by region')}<div class="tb-card-body tb-chart-body">${donutChart({ id: 'w-donut', size: 152, valueFormat: fmtEurCompact, center: { value: fmtEurCompact(total), label: 'revenue' }, items: REGIONS.map((r, i) => ({ key: r.id, name: r.name, value: by.get(r.id), colour: SERIES[i] })) })}</div>`,
      }
    },
  },
  {
    type: 'risk', group: 'Lists', name: 'Accounts at risk', span: 4, preview: PREVIEW.list,
    desc: 'The largest accounts likely to leave, with their churn risk.',
    build() {
      const list = ACCOUNTS.filter(a => a.status === 'At risk').sort((a, b) => b.revenue - a.revenue).slice(0, 5)
      return {
        className: 'tb-card',
        html: `${header('Accounts at risk', `<a class="tb-button tb-button--minimal tb-button--sm" href="./table.html#at-risk">All</a>`)}
          <div class="tb-card-body tb-card-body--flush"><ul class="tb-list tb-list--divided">${list.map(a => `<li class="tb-list-item">
            <a class="tb-list-item-link" href="./detail.html?id=${encodeURIComponent(a.id)}" style="display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--tb-space-2); align-items: center">
              <span style="display: flex; flex-direction: column; min-width: 0"><span class="tb-list-item-title">${esc(a.name)}</span><span class="tb-list-item-meta">${fmtEurCompact(a.revenue)} a year, ${esc(TEAM_BY_ID[a.owner].name)}</span></span>${probHtml(a.risk)}
            </a></li>`).join('')}</ul></div>`,
      }
    },
  },
  {
    type: 'countries', group: 'Lists', name: 'Countries table', span: 6, preview: PREVIEW.table,
    desc: 'The top countries by revenue over the last 30 days, with the change.',
    build() {
      const now = split('revenue', 'country', NOW)
      const before = split('revenue', 'country', BEFORE)
      const rows = COUNTRIES.map(c => ({ c, v: now.get(c.code), g: change(now.get(c.code), before.get(c.code)) })).sort((a, b) => b.v - a.v).slice(0, 6)
      return {
        className: 'tb-card',
        html: `${header('Top countries, 30 days')}<div class="tb-card-body tb-card-body--flush"><table class="tb-table"><thead><tr><th>Country</th><th class="is-num">Revenue</th><th class="is-num">Change</th></tr></thead>
          <tbody>${rows.map(r => `<tr><td>${esc(r.c.name)}</td><td class="is-num">${fmtEurRound(r.v)}</td><td class="is-num"><span class="tb-stat-delta ${r.g >= 0 ? 'tb-stat-delta--good' : 'tb-stat-delta--bad'}">${fmtDelta(r.g)}</span></td></tr>`).join('')}</tbody></table></div>`,
      }
    },
  },
  {
    type: 'activity', group: 'Lists', name: 'Recent activity', span: 4, preview: PREVIEW.timeline,
    desc: 'The latest events on your largest account.',
    build() {
      const a = [...ACCOUNTS].sort((x, y) => y.revenue - x.revenue)[0]
      return {
        className: 'tb-card',
        html: `${header(`Activity, ${a.name}`, statusTag(a.status))}<div class="tb-card-body">${timelineHtml(eventsOf(a.id), { limit: 4, dense: true })}</div>`,
      }
    },
  },
  {
    type: 'note', group: 'Text', name: 'Note', span: 6, preview: PREVIEW.note,
    desc: 'A callout with your own text, kept with the layout.',
    build(saved = {}) {
      const text = saved.text ?? `Revenue is ${fmtCompact(sum('revenue', NOW))} over the last 30 days. Write what the team should look at next.`
      return {
        className: 'tb-callout',
        html: `${ICON.note}<div class="tb-callout-content"><strong class="tb-callout-title">Note</strong><p class="tb-widget-note" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Note text" spellcheck="true">${esc(text)}</p></div>`,
      }
    },
    read: el => ({ text: el.querySelector('.tb-widget-note')?.textContent.trim() || '' }),
  },
  {
    type: 'empty', group: 'Text', name: 'Empty state', span: 6, preview: PREVIEW.empty,
    desc: 'A placeholder to fill later, with a way to choose its data.',
    build() {
      return {
        className: 'tb-card',
        html: `<div class="tb-empty"><span class="tb-empty-icon">${ICON.inbox}</span><p class="tb-empty-title">Nothing here yet</p>
          <p class="tb-empty-description">Choose a measure and a period, and this widget fills from your data.</p>
          <div class="tb-empty-action"><button class="tb-button" type="button" data-widget-choose>Choose data</button></div></div>`,
        mount: el => el.querySelector('[data-widget-choose]').addEventListener('click', () => tb.toast({ message: 'Choosing data for a widget is a separate screen, not built in these templates.' })),
      }
    },
  },
]

export const WIDGET_BY_TYPE = Object.fromEntries(WIDGETS.map(w => [w.type, w]))
export const catalogueNote = `Widgets read the template data: ${fmtInt(ACCOUNTS.length)} accounts in ${fmtInt(COUNTRIES.length)} countries.`
