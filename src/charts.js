// Charts. Hand-drawn SVG from plain data, with tokens only, so a chart follows the theme with no
// extra code. Each builder returns markup for a card body and registers the tooltip of every mark;
// wireCharts gives the marks their pointer, keyboard and click behaviour. The page owns the data
// and the selection, and draws again when either changes.
//
//   import { wireCharts, lineChart } from '../src/charts.js'
//   body.innerHTML = lineChart({ id: 'rev', width: body.clientWidth, points, series })
//   wireCharts(main, { onActivate: (chart, key) => {}, onBrush: (chart, range) => {} })
//
// A mark is any element with data-mark, data-chart (the chart id) and data-key. Hovering or
// focusing it shows its tooltip, arrow keys move between the marks of one chart (a grid moves by
// rows too), and Enter, Space or a click calls onActivate. A legend button with data-legend,
// data-chart and data-key activates the same way. A scatter drawn with brush: true turns a drag on
// its plot into onBrush(chart, { x0, x1, y0, y1 }) in data units.
//
// Builders: sparkline, lineChart, areaChart, barChart (stacked, grouped, share, histogram),
// donutChart, heatmap, scatterChart, funnelChart. Helpers: nice, legendHtml, tipHtml, tipRow,
// swatch, emptyChart, skeletonChart. Every number shown goes through a formatter the page passes
// in, or through format.js.
import { esc, fmtInt, fmtCompact, fmtPct, fmtPctN } from './format.js'

const f1 = n => n.toFixed(1)
const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const FILTER_OFF = lucide('<path d="M12.531 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l.427-.473" /><path d="m16.5 3.5 5 5" /><path d="m21.5 3.5-5 5" />')

// The series colours, in order, for categories with no meaning of their own.
export const SERIES = [1, 2, 3, 4, 5, 6].map(i => `var(--tb-series-${i})`)

// A rounded top for an axis and its step. Counts never get a fractional step.
export function nice(max, ticks = 4, integer = true) {
  if (!(max > 0)) return { max: ticks, step: 1 }
  const raw = max / ticks
  const mag = 10 ** Math.floor(Math.log10(raw))
  const n = raw / mag
  let step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
  if (integer) step = Math.max(1, Math.round(step))
  return { max: Math.ceil(max / step - 1e-9) * step, step }
}

/* Swatches, legends and tooltips */

export const swatch = (colour, kind = 'square') => {
  const mods = { square: '', dot: ' tb-swatch--dot', hollow: ' tb-swatch--dot tb-swatch--hollow', line: ' tb-swatch--line', dashed: ' tb-swatch--line tb-swatch--dashed' }[kind] ?? ''
  return `<span class="tb-swatch${mods}" style="--tone: ${colour}"></span>`
}

// items: [{ name, colour, kind, value, key }]. With chart set, each item is a button that
// activates like the mark with the same key, and selected marks the pressed one.
export function legendHtml(items, { inline = true, chart = null, selected = null, label = '' } = {}) {
  if (!inline) {
    return `<ul class="tb-legend"${label ? ` aria-label="${esc(label)}"` : ''}>${items.map(it => {
      const inner = `${swatch(it.colour, it.kind)}<span class="tb-legend-label">${esc(it.name)}</span>${it.value !== undefined ? `<span class="tb-legend-value">${it.value}</span>` : ''}${it.share !== undefined ? `<span class="tb-legend-value">${it.share}</span>` : ''}`
      return chart
        ? `<li><button class="tb-legend-item" type="button" data-legend data-chart="${esc(chart)}" data-key="${esc(it.key)}" aria-pressed="${selected === it.key}">${inner}</button></li>`
        : `<li class="tb-legend-item">${inner}</li>`
    }).join('')}</ul>`
  }
  return `<span class="tb-legend tb-legend--inline">${items.map(it => `<span class="tb-legend-item">${swatch(it.colour, it.kind)}${esc(it.name)}${it.value !== undefined ? `<span class="tb-legend-value">${it.value}</span>` : ''}</span>`).join('')}</span>`
}

export const tipRow = (colour, name, value, kind = 'square') => `<div class="tb-chart-tip-row">${swatch(colour, kind)}<span>${esc(name)}</span><b class="tb-num">${value}</b></div>`
export const tipHtml = (title, rows, note = '') => `<div class="tb-chart-tip-title">${esc(title)}</div>${rows.join('')}${note ? `<div class="tb-chart-tip-note">${esc(note)}</div>` : ''}`

const tips = new Map()
const geoms = new Map()
const setTip = (chart, key, html) => tips.set(`${chart}:${key}`, html)
function clearChart(chart) {
  const prefix = `${chart}:`
  for (const k of tips.keys()) if (k.startsWith(prefix)) tips.delete(k)
}

let tip = null
function tipEl() {
  if (tip) return tip
  tip = document.createElement('div')
  tip.className = 'tb-tooltip tb-chart-tip'
  tip.setAttribute('role', 'tooltip')
  tip.hidden = true
  document.body.append(tip)
  return tip
}
function placeTip(x, y, above = false) {
  const t = tipEl()
  const w = t.offsetWidth
  const h = t.offsetHeight
  let left = above ? x - w / 2 : x + 14
  let top = above ? y - h - 8 : y + 14
  if (left + w > innerWidth - 4) left = above ? innerWidth - w - 4 : x - w - 14
  if (top + h > innerHeight - 4) top = y - h - 14
  t.style.left = `${Math.round(Math.max(4, left))}px`
  t.style.top = `${Math.round(Math.max(4, top))}px`
}
export function showTip(mark, x, y) {
  const html = tips.get(`${mark.dataset.chart}:${mark.dataset.key}`)
  if (!html) return hideTip()
  const t = tipEl()
  t.innerHTML = html
  t.hidden = false
  if (x === undefined) {
    const r = mark.getBoundingClientRect()
    placeTip(r.left + r.width / 2, r.top, true)
  } else placeTip(x, y)
}
export function hideTip() { if (tip) tip.hidden = true }

/* Empty and loading states. An empty chart keeps the chart's height, so the grid does not jump. */

export const emptyChart = (title, { action = '', height = 200 } = {}) => `<div class="tb-empty tb-empty--compact tb-chart-empty" style="min-height: ${height}px">
    <span class="tb-empty-icon">${FILTER_OFF}</span>
    <p class="tb-empty-title">${esc(title)}</p>
    ${action ? `<div class="tb-empty-action">${action}</div>` : ''}
  </div>`
export const skeletonChart = height => `<div class="tb-chart-skeleton" style="height: ${height}px"><span class="tb-skeleton"></span></div>`

/* Shared pieces of a plot */

const gridY = ({ m, W, y, max, step, format }) => {
  let out = ''
  for (let v = 0; v <= max + step / 1e6; v += step) {
    out += `<line class="tb-chart-grid" x1="${m.l}" x2="${W - m.r}" y1="${f1(y(v))}" y2="${f1(y(v))}"/>
      <text class="tb-chart-axis" x="${m.l - 6}" y="${f1(y(v))}" dy="0.32em" text-anchor="end">${format(v)}</text>`
  }
  return out
}
// The width the y axis needs for its longest tick, at the extra-small text size.
const axisWidth = (max, step, format) => {
  let longest = 0
  for (let v = 0; v <= max + step / 1e6; v += step) longest = Math.max(longest, String(format(v)).length)
  return Math.max(28, 10 + longest * 6.2)
}
const svgOpen = (cls, W, H, label, extra = '') => `<svg class="tb-chart${cls ? ` ${cls}` : ''}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(label)}"${extra}>`

/* Sparkline: one line, no axes, the last value marked. band ([from, to] indexes) shades a
   selected stretch. */

export function sparkline({ values, width = 96, height = 28, colour = 'var(--tb-accent)', band = null, compare = null }) {
  const nums = values.filter(v => v !== null && v !== undefined)
  if (!nums.length || width < 40 || !nums.some(v => v)) return ''
  const all = compare ? nums.concat(compare.filter(v => v !== null)) : nums
  // A sparkline shows the trend, so its scale runs from the lowest value to the highest.
  const max = Math.max(...all)
  const min = Math.min(...all)
  const x = i => (values.length === 1 ? width / 2 : 2 + (i * (width - 4)) / (values.length - 1))
  const y = v => height - 3 - ((v - min) / (max - min || 1)) * (height - 6)
  const path = vals => {
    let d = ''
    vals.forEach((v, i) => { if (v !== null && v !== undefined) d += `${d && vals[i - 1] !== null && vals[i - 1] !== undefined ? 'L' : 'M'}${f1(x(i))} ${f1(y(v))}` })
    return d
  }
  let shade = ''
  if (band) {
    const step = values.length > 1 ? (width - 4) / (values.length - 1) : width
    const x0 = Math.max(0, x(band[0]) - step / 2)
    const x1 = Math.min(width, x(band[1]) + step / 2)
    shade = `<rect x="${f1(x0)}" y="0" width="${f1(x1 - x0)}" height="${height}" fill="var(--tb-bg-selected)"/>`
  }
  const last = values.map((v, i) => (v === null || v === undefined ? -1 : i)).filter(i => i >= 0).pop()
  return `<svg class="tb-chart-spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${shade}
    ${compare ? `<path d="${path(compare)}" fill="none" stroke="var(--tb-fg-subtle)" stroke-width="1" stroke-dasharray="2 2"/>` : ''}
    <path d="${path(values)}" fill="none" stroke="${colour}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${f1(x(last))}" cy="${f1(y(values[last]))}" r="2.5" fill="${colour}"/></svg>`
}

/* Line chart over evenly spaced points (days, weeks). Each point is a column that takes the
   pointer and the keyboard.
   points  [{ key, tick, title }]  tick is the axis label ('' for none), title heads the tooltip
   series  [{ name, values, colour, dashed, area }]  a dashed series is a comparison
   selected [fromIndex, toIndex] shaded, markers [{ index, label }] as dashed rules */

export function lineChart({ id, width, height = 240, points, series, yFormat = fmtCompact, valueFormat = fmtInt, selected = null, markers = [], note = '', label = '', focus = null }) {
  clearChart(id)
  const n = points.length
  const W = width
  const H = height
  const top = Math.max(...series.flatMap(s => s.values.filter(v => v !== null)), 0)
  const { max, step } = nice(top)
  const m = { t: markers.length ? 18 : 10, r: 8, b: 22, l: axisWidth(max, step, yFormat) }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const bw = iw / n
  const cx = i => m.l + (i + 0.5) * bw
  const y = v => m.t + ih - (v / max) * ih
  const ticks = points.map((p, i) => (p.tick ? `<text class="tb-chart-axis" x="${f1(cx(i))}" y="${H - 6}" text-anchor="middle">${esc(p.tick)}</text>` : '')).join('')
  const line = vals => vals.map((v, i) => `${i && vals[i - 1] !== null ? 'L' : 'M'}${f1(cx(i))} ${f1(y(v ?? 0))}`).join('')
  const area = vals => `${line(vals)}L${f1(cx(n - 1))} ${f1(y(0))}L${f1(cx(0))} ${f1(y(0))}Z`
  const band = selected
    ? `<rect x="${f1(m.l + selected[0] * bw)}" y="${m.t}" width="${f1((selected[1] - selected[0] + 1) * bw)}" height="${ih}" fill="var(--tb-bg-selected)"/>`
    : ''
  const rules = markers.map(k => {
    const x = cx(k.index)
    const end = x > W - 120
    return `<g class="tb-chart-marker"><line x1="${f1(x)}" x2="${f1(x)}" y1="${m.t}" y2="${m.t + ih}"/>
      <text class="tb-chart-axis" x="${f1(end ? x - 4 : x + 4)}" y="${m.t - 6}" text-anchor="${end ? 'end' : 'start'}">${esc(k.label)}</text></g>`
  }).join('')
  const paths = series.map(s => `${s.area ? `<path d="${area(s.values)}" fill="${s.colour}" fill-opacity="0.1"/>` : ''}
    <path d="${line(s.values)}" fill="none" stroke="${s.colour}" stroke-width="${s.dashed ? 1.25 : 1.5}"${s.dashed ? ' stroke-dasharray="4 3"' : ''} stroke-linejoin="round"/>`).join('')
  const lead = series.find(s => !s.dashed) || series[0]
  const dots = n <= 31 ? lead.values.map((v, i) => (v === null ? '' : `<circle cx="${f1(cx(i))}" cy="${f1(y(v))}" r="2" fill="${lead.colour}"/>`)).join('') : ''
  const tabAt = focus ?? (selected ? selected[0] : n - 1)
  const cols = points.map((p, i) => {
    setTip(id, p.key, tipHtml(p.title, series.map(s => tipRow(s.colour, s.name, s.values[i] === null ? 'n/a' : valueFormat(s.values[i]), s.dashed ? 'dashed' : 'line')), note))
    const on = selected && i >= selected[0] && i <= selected[1]
    return `<rect class="tb-chart-col${on ? ' is-selected' : ''}" data-mark data-chart="${esc(id)}" data-key="${esc(p.key)}" x="${f1(m.l + i * bw)}" y="${m.t}" width="${(bw).toFixed(2)}" height="${ih}"
      tabindex="${i === tabAt ? 0 : -1}" role="button" aria-pressed="${!!on}" aria-label="${esc(`${p.title}, ${series.map(s => `${s.name} ${s.values[i] === null ? 'n/a' : valueFormat(s.values[i])}`).join(', ')}`)}"/>`
  }).join('')
  return `${svgOpen('', W, H, label || 'Line chart. Arrow keys move between points, Enter selects.')}
    ${band}${gridY({ m, W, y, max, step, format: yFormat })}${ticks}${rules}${paths}${dots}
    <g>${cols}</g>
  </svg>`
}

/* Stacked area over evenly spaced points, bottom series first. share draws each point as 100 %. */

export function areaChart({ id, width, height = 240, points, series, share = false, yFormat = fmtCompact, valueFormat = fmtInt, selected = null, label = '', note = '' }) {
  clearChart(id)
  const n = points.length
  const W = width
  const H = height
  const totals = points.map((_, i) => series.reduce((s, x) => s + x.values[i], 0))
  const { max, step } = share ? { max: 1, step: 0.25 } : nice(Math.max(...totals))
  const fmtAxis = share ? v => fmtPctN(v) : yFormat
  const m = { t: 10, r: 8, b: 22, l: axisWidth(max, step, fmtAxis) }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const bw = iw / n
  const cx = i => m.l + (i + 0.5) * bw
  const y = v => m.t + ih - (v / max) * ih
  const base = new Array(n).fill(0)
  const layers = series.map(s => {
    const lo = base.slice()
    s.values.forEach((v, i) => { base[i] += share ? (totals[i] ? v / totals[i] : 0) : v })
    const hi = base.slice()
    const top = hi.map((v, i) => `${i ? 'L' : 'M'}${f1(cx(i))} ${f1(y(v))}`).join('')
    const bottom = lo.map((v, i) => `L${f1(cx(i))} ${f1(y(v))}`).reverse().join('')
    return `<path d="${top}${bottom}Z" fill="${s.colour}" fill-opacity="0.78"/><path d="${top}" fill="none" stroke="${s.colour}" stroke-width="1.25"/>`
  }).join('')
  const ticks = points.map((p, i) => (p.tick ? `<text class="tb-chart-axis" x="${f1(cx(i))}" y="${H - 6}" text-anchor="middle">${esc(p.tick)}</text>` : '')).join('')
  const band = selected ? `<rect x="${f1(m.l + selected[0] * bw)}" y="${m.t}" width="${f1((selected[1] - selected[0] + 1) * bw)}" height="${ih}" fill="var(--tb-bg-selected)"/>` : ''
  const cols = points.map((p, i) => {
    const rows = series.slice().reverse().map(s => tipRow(s.colour, s.name, `${valueFormat(s.values[i])}${totals[i] ? `, ${fmtPct(s.values[i] / totals[i])}` : ''}`))
    rows.push(tipRow('var(--tb-fg-subtle)', 'Total', valueFormat(totals[i])))
    setTip(id, p.key, tipHtml(p.title, rows, note))
    const on = selected && i >= selected[0] && i <= selected[1]
    return `<rect class="tb-chart-col${on ? ' is-selected' : ''}" data-mark data-chart="${esc(id)}" data-key="${esc(p.key)}" x="${f1(m.l + i * bw)}" y="${m.t}" width="${bw.toFixed(2)}" height="${ih}" tabindex="${i === (selected ? selected[0] : n - 1) ? 0 : -1}" role="button" aria-pressed="${!!on}" aria-label="${esc(`${p.title}, total ${valueFormat(totals[i])}`)}"/>`
  }).join('')
  return `${svgOpen('', W, H, label || 'Stacked area chart. Arrow keys move between points, Enter selects.')}
    ${gridY({ m, W, y, max, step, format: fmtAxis })}${band}${layers}${ticks}<g>${cols}</g>
  </svg>`
}

/* Bars, vertical. groups are the slots on the x axis, series the bars in each slot: stacked
   (the default) or side by side. share draws each slot as 100 %. A histogram is a stacked chart
   with one series and gap near 0.
   groups   [{ key, label, title }]  label '' leaves the slot without an axis label
   series   [{ name, colour, values }]
   selected a Set of group keys; the others dim */

export function barChart({ id, width, height = 240, groups, series, stacked = true, share = false, yFormat = fmtCompact, valueFormat = fmtInt, showValues = true, selected = null, gap = 0.36, maxBar = 44, label = '', note = '' }) {
  clearChart(id)
  const W = width
  const H = height
  const totals = groups.map((_, i) => series.reduce((s, x) => s + x.values[i], 0))
  const peak = stacked ? Math.max(...totals) : Math.max(...series.flatMap(s => s.values))
  const { max, step } = share ? { max: 1, step: 0.25 } : nice(peak)
  const fmtAxis = share ? v => fmtPctN(v) : yFormat
  const m = { t: showValues ? 18 : 10, r: 8, b: 22, l: axisWidth(max, step, fmtAxis) }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const y = v => m.t + ih - (v / max) * ih
  const slot = iw / groups.length
  const bw = Math.max(1, Math.min(maxBar * (stacked ? 1 : series.length), slot * (1 - gap)))
  const one = stacked ? bw : bw / series.length
  const tabI = selected && selected.size ? Math.max(0, groups.findIndex(g => selected.has(g.key))) : groups.length - 1
  const bars = groups.map((g, i) => {
    const x0 = m.l + i * slot + (slot - bw) / 2
    const hit = selected && selected.has(g.key)
    const dim = selected && selected.size && !hit
    let acc = 0
    const rects = series.map((s, k) => {
      const raw = s.values[i]
      const v = share ? (totals[i] ? raw / totals[i] : 0) : raw
      const x = stacked ? x0 : x0 + k * one
      const y1 = stacked ? y(acc + v) : y(v)
      const y0 = stacked ? y(acc) : y(0)
      acc += v
      return `<rect x="${f1(x)}" y="${f1(y1)}" width="${f1(Math.max(1, one - (stacked ? 0 : 1)))}" height="${f1(Math.max(0, y0 - y1))}" fill="${s.colour}"/>`
    }).join('')
    const topV = stacked ? (share ? 1 : totals[i]) : Math.max(...series.map(s => s.values[i]))
    const text = showValues && !share && bw >= 18 ? `<text class="tb-chart-axis tb-chart-bar-value" x="${f1(x0 + bw / 2)}" y="${f1(y(topV) - 4)}" text-anchor="middle">${valueFormat(stacked ? totals[i] : topV)}</text>` : ''
    const rows = series.map(s => tipRow(s.colour, s.name, `${valueFormat(s.values[i])}${series.length > 1 && totals[i] ? `, ${fmtPct(s.values[i] / totals[i])}` : ''}`))
    if (series.length > 1 && stacked) rows.push(tipRow('var(--tb-fg-subtle)', 'Total', valueFormat(totals[i])))
    setTip(id, g.key, tipHtml(g.title || g.label, rows, note))
    return `<g class="tb-chart-group${hit ? ' is-selected' : ''}${dim ? ' is-dim' : ''}" data-mark data-chart="${esc(id)}" data-key="${esc(g.key)}" tabindex="${i === tabI ? 0 : -1}" role="button" aria-pressed="${!!hit}"
        aria-label="${esc(`${g.title || g.label}, ${series.map(s => `${s.name} ${valueFormat(s.values[i])}`).join(', ')}`)}">
      <rect class="tb-chart-hit" x="${f1(m.l + i * slot)}" y="${m.t}" width="${f1(slot)}" height="${ih}"/>${rects}${text}
      ${g.label ? `<text class="tb-chart-axis" x="${f1(x0 + bw / 2)}" y="${H - 6}" text-anchor="middle">${esc(g.label)}</text>` : ''}
    </g>`
  }).join('')
  return `${svgOpen('', W, H, label || 'Bar chart. Arrow keys move between bars, Enter selects.')}
    ${gridY({ m, W, y, max, step, format: fmtAxis })}${bars}
  </svg>`
}

/* Donut, with its legend beside it as the keyboard way in. items [{ key, name, value, colour }] */

function arc(cx, cy, r0, r1, a0, a1) {
  const large = a1 - a0 > Math.PI ? 1 : 0
  const pt = (r, a) => `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    return `M${pt(r1, 0)}A${r1} ${r1} 0 1 1 ${pt(r1, Math.PI)}A${r1} ${r1} 0 1 1 ${pt(r1, 0)}ZM${pt(r0, 0)}A${r0} ${r0} 0 1 0 ${pt(r0, Math.PI)}A${r0} ${r0} 0 1 0 ${pt(r0, 0)}Z`
  }
  return `M${pt(r1, a0)}A${r1} ${r1} 0 ${large} 1 ${pt(r1, a1)}L${pt(r0, a1)}A${r0} ${r0} 0 ${large} 0 ${pt(r0, a0)}Z`
}

export function donutChart({ id, items, size = 176, selected = null, center = null, valueFormat = fmtInt, label = '', note = '' }) {
  clearChart(id)
  const total = items.reduce((s, it) => s + it.value, 0)
  const c = size / 2
  const r1 = c - 8
  const r0 = r1 - 26
  let a = 0
  const arcs = items.map(it => {
    if (!it.value) return ''
    const a1 = a + (it.value / total) * Math.PI * 2
    const on = selected === it.key
    setTip(id, it.key, tipHtml(it.name, [tipRow(it.colour, 'Value', valueFormat(it.value)), tipRow(it.colour, 'Share', fmtPct(it.value / total))], note))
    const d = arc(c, c, on ? r0 - 4 : r0, on ? r1 + 4 : r1, a, a1)
    a = a1
    return `<path class="tb-chart-arc${on ? ' is-selected' : ''}" data-mark data-chart="${esc(id)}" data-key="${esc(it.key)}" d="${d}" fill="${it.colour}" tabindex="-1"/>`
  }).join('')
  const legend = legendHtml(items.map(it => ({ ...it, kind: 'square', value: valueFormat(it.value), share: total ? fmtPct(it.value / total) : '' })), { inline: false, chart: id, selected, label: label || 'Legend' })
  return `<div class="tb-chart-donut">
    <svg class="tb-chart tb-chart-donut-svg${selected ? ' has-selection' : ''}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(items.map(it => `${it.name} ${valueFormat(it.value)}`).join(', '))}">
      ${arcs}
      ${center ? `<text class="tb-chart-donut-value" x="${c}" y="${c - 2}" text-anchor="middle">${center.value}</text>
      <text class="tb-chart-axis" x="${c}" y="${c + 16}" text-anchor="middle">${esc(center.label)}</text>` : ''}
    </svg>
    ${legend}
  </div>`
}

/* Heatmap: rows by columns of values, tinted from the surface towards colour.
   rows [{ label, title }], cols [{ label, title }] (label '' for none), values[r][c] */

export function heatmap({ id, width, rows, cols, values, colour = 'var(--tb-accent)', valueFormat = fmtInt, cellText = false, selected = null, rowHeight = 26, legend = null, label = '', note = '' }) {
  clearChart(id)
  const W = width
  const m = { t: 2, r: 4, b: 20, l: 38 }
  const cw = (W - m.l - m.r) / cols.length
  const H = m.t + rows.length * rowHeight + m.b
  const top = Math.max(...values.flat(), 0) || 1
  const fill = v => `color-mix(in oklab, ${colour} ${Math.round(8 + (v / top) * 92)}%, var(--tb-bg-surface))`
  let cells = ''
  rows.forEach((r, ri) => {
    cols.forEach((c, ci) => {
      const v = values[ri][ci]
      const key = `${ri}:${ci}`
      const on = selected === key
      const x = m.l + ci * cw
      const yy = m.t + ri * rowHeight
      const text = cellText && cw > 34
        ? `<text class="tb-chart-cell-text${v / top > 0.55 ? ' is-strong' : ''}" x="${f1(x + cw / 2)}" y="${f1(yy + rowHeight / 2)}" dy="0.32em" text-anchor="middle">${valueFormat(v)}</text>` : ''
      setTip(id, key, tipHtml(`${r.title || r.label}, ${c.title || c.label}`, [tipRow(fill(v), 'Value', valueFormat(v)), tipRow('var(--tb-fg-subtle)', 'Of the busiest slot', fmtPct(v / top))], note))
      cells += `<g class="tb-chart-cell${on ? ' is-selected' : ''}" data-mark data-chart="${esc(id)}" data-key="${key}" tabindex="${(selected ? on : ri === 0 && ci === 0) ? 0 : -1}" role="button" aria-pressed="${on}"
          aria-label="${esc(`${r.title || r.label}, ${c.title || c.label}, ${valueFormat(v)}`)}">
        <rect x="${f1(x + 1)}" y="${yy + 1}" width="${f1(Math.max(1, cw - 2))}" height="${rowHeight - 2}" rx="2" style="fill: ${v ? fill(v) : 'var(--tb-bg-sunken)'}"/>${text}
      </g>`
    })
  })
  let axis = rows.map((r, ri) => `<text class="tb-chart-axis" x="${m.l - 8}" y="${m.t + ri * rowHeight + rowHeight / 2}" dy="0.32em" text-anchor="end">${esc(r.label)}</text>`).join('')
  axis += cols.map((c, ci) => (c.label ? `<text class="tb-chart-axis" x="${f1(m.l + ci * cw + 1)}" y="${H - 5}">${esc(c.label)}</text>` : '')).join('')
  const ramp = legend
    ? `<div class="tb-legend tb-legend--inline tb-chart-legend" style="padding-left: ${m.l}px"><span>${esc(legend.label)}</span><span class="tb-num">${legend.min}</span><span class="tb-chart-ramp">${[0.05, 0.25, 0.5, 0.75, 1].map(v => `<span style="background: ${fill(v * top)}"></span>`).join('')}</span><span class="tb-num">${legend.max}</span>${legend.note ? `<span class="tb-spacer"></span><span class="tb-num">${legend.note}</span>` : ''}</div>`
    : ''
  return `${svgOpen('', W, H, label || 'Heatmap. Arrow keys move, Enter selects.', ` data-cols="${cols.length}"`)}${axis}${cells}</svg>${ramp}`
}

/* Scatter. points [{ key, x, y, colour, filled, title, rows }], axes { min, max, log, ticks,
   format }. brush { x0, x1, y0, y1 } draws the selected range and dims what falls outside it;
   brushable lets a drag on the plot select a new one. refs [{ axis, value, label }] are
   dashed reference lines. */

export function scatterChart({ id, width, height = 290, points, x: ax, y: ay, brush = null, brushable = true, pinned = null, refs = [], label = '', note = '' }) {
  clearChart(id)
  const W = width
  const H = height
  const m = { t: 14, r: 12, b: 22, l: axisWidth(ay.max, ay.max / 4, ay.format) }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const t = a => (a.log ? v => Math.log10(Math.max(a.min, v)) : v => v)
  const [tx, ty] = [t(ax), t(ay)]
  const x = v => m.l + ((tx(Math.min(ax.max, Math.max(ax.min, v))) - tx(ax.min)) / (tx(ax.max) - tx(ax.min))) * iw
  const y = v => m.t + ih - ((ty(Math.min(ay.max, Math.max(ay.min, v))) - ty(ay.min)) / (ty(ay.max) - ty(ay.min))) * ih
  const inv = (a, frac) => (a.log ? 10 ** (Math.log10(a.min) + frac * (Math.log10(a.max) - Math.log10(a.min))) : a.min + frac * (a.max - a.min))
  geoms.set(id, { m, iw, ih, toX: px => inv(ax, (px - m.l) / iw), toY: py => inv(ay, (m.t + ih - py) / ih) })
  let grid = ''
  ax.ticks.forEach(v => {
    grid += `<line class="tb-chart-grid" x1="${f1(x(v))}" x2="${f1(x(v))}" y1="${m.t}" y2="${m.t + ih}"/>
      <text class="tb-chart-axis" x="${f1(x(v))}" y="${H - 6}" text-anchor="middle">${ax.format(v)}</text>`
  })
  ay.ticks.forEach(v => {
    grid += `<line class="tb-chart-grid" x1="${m.l}" x2="${W - m.r}" y1="${f1(y(v))}" y2="${f1(y(v))}"/>
      <text class="tb-chart-axis" x="${m.l - 6}" y="${f1(y(v))}" dy="0.32em" text-anchor="end">${ay.format(v)}</text>`
  })
  const lines = refs.map(r => (r.axis === 'x'
    ? `<g class="tb-chart-marker"><line x1="${f1(x(r.value))}" x2="${f1(x(r.value))}" y1="${m.t}" y2="${m.t + ih}"/><text class="tb-chart-axis" x="${f1(x(r.value) + 4)}" y="${m.t + 10}">${esc(r.label)}</text></g>`
    : `<g class="tb-chart-marker"><line x1="${m.l}" x2="${W - m.r}" y1="${f1(y(r.value))}" y2="${f1(y(r.value))}"/><text class="tb-chart-axis" x="${W - m.r - 4}" y="${f1(y(r.value) - 4)}" text-anchor="end">${esc(r.label)}</text></g>`)).join('')
  const inside = p => !brush || (p.x >= brush.x0 && p.x <= brush.x1 && p.y >= brush.y0 && p.y <= brush.y1)
  const pin = pinned && points.find(p => p.key === pinned)
  const pts = points.map((p, i) => {
    setTip(id, p.key, tipHtml(p.title, p.rows || [], note))
    return `<circle class="tb-chart-pt${inside(p) ? '' : ' is-dim'}" data-mark data-chart="${esc(id)}" data-key="${esc(p.key)}" cx="${f1(x(p.x))}" cy="${f1(y(p.y))}" r="${p.r || 3.5}"
      fill="${p.filled === false ? 'var(--tb-bg-surface)' : p.colour}" stroke="${p.colour}" tabindex="${(pin ? p === pin : i === 0) ? 0 : -1}" role="button" aria-label="${esc(p.title)}"/>`
  }).join('')
  const ring = pin ? `<circle cx="${f1(x(pin.x))}" cy="${f1(y(pin.y))}" r="8" fill="none" stroke="var(--tb-fg)" stroke-width="1.5" pointer-events="none"/>` : ''
  const box = brush ? `<rect class="tb-chart-brush" x="${f1(x(brush.x0))}" y="${f1(y(brush.y1))}" width="${f1(x(brush.x1) - x(brush.x0))}" height="${f1(y(brush.y0) - y(brush.y1))}"/>` : ''
  return `${svgOpen('tb-chart--scatter', W, H, label || 'Scatter plot. Drag to select a range, arrow keys move between points, Enter pins one.', brushable ? ' data-brush' : '')}
    <rect class="tb-chart-plot" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/>
    ${grid}${lines}${box}<g>${pts}</g>${ring}
    <rect class="tb-chart-brush tb-chart-brush--live" hidden/>
  </svg>`
}

/* Funnel: one bar per stage, as long as its share of the first, with the share that carried on
   from the stage before. stages [{ key, name, value }] */

export function funnelChart({ id, width, stages, colour = 'var(--tb-accent)', valueFormat = fmtInt, selected = null, label = '', note = '' }) {
  clearChart(id)
  const W = width
  const rowH = 44
  const labelW = Math.min(170, W * 0.32)
  const valueW = 76
  const iw = Math.max(40, W - labelW - valueW - 8)
  const H = stages.length * rowH
  const first = stages[0]?.value || 1
  const rows = stages.map((s, i) => {
    const w = Math.max(2, (s.value / first) * iw)
    const prev = i ? stages[i - 1].value : null
    const carried = prev ? s.value / prev : null
    const on = selected === s.key
    const yy = i * rowH
    setTip(id, s.key, tipHtml(s.name, [
      tipRow(colour, 'Count', valueFormat(s.value)),
      tipRow('var(--tb-fg-subtle)', 'Of the first stage', fmtPct(s.value / first)),
      ...(carried !== null ? [tipRow('var(--tb-fg-subtle)', 'From the stage before', fmtPct(carried))] : []),
    ], note))
    return `<g class="tb-chart-group${on ? ' is-selected' : ''}${selected && !on ? ' is-dim' : ''}" data-mark data-chart="${esc(id)}" data-key="${esc(s.key)}" tabindex="${(selected ? on : i === 0) ? 0 : -1}" role="button" aria-pressed="${on}" aria-label="${esc(`${s.name}, ${valueFormat(s.value)}`)}">
      <rect class="tb-chart-hit" x="0" y="${yy}" width="${W}" height="${rowH}"/>
      <text class="tb-chart-label" x="0" y="${yy + 17}">${esc(s.name)}</text>
      <text class="tb-chart-axis" x="0" y="${yy + 33}">${carried !== null ? `${fmtPct(carried)} of the stage before` : 'Where the bars start'}</text>
      <rect x="${f1(labelW)}" y="${yy + 8}" width="${f1(w)}" height="${rowH - 16}" fill="${colour}" fill-opacity="${f1(1 - i * (0.6 / Math.max(1, stages.length - 1)))}"/>
      <text class="tb-chart-label tb-num" x="${f1(labelW + w + 8)}" y="${yy + rowH / 2}" dy="0.32em">${valueFormat(s.value)}</text>
    </g>`
  }).join('')
  return `${svgOpen('', W, H, label || 'Funnel. Arrow keys move between stages, Enter selects.')}${rows}</svg>`
}

/* Behaviour. One call per container; tooltips are shared by every chart on the page. */

export function wireCharts(root, { onActivate = () => {}, onBrush = null } = {}) {
  let drag = null
  root.addEventListener('pointerover', e => {
    const mark = e.target.closest('[data-mark]')
    if (mark && !drag) showTip(mark, e.clientX, e.clientY)
  })
  root.addEventListener('pointermove', e => {
    const mark = e.target.closest('[data-mark]')
    if (mark && tip && !tip.hidden && !drag) placeTip(e.clientX, e.clientY)
  })
  root.addEventListener('pointerout', e => {
    const mark = e.target.closest('[data-mark]')
    if (mark && !mark.contains(e.relatedTarget)) hideTip()
  })
  root.addEventListener('focusin', e => {
    const mark = e.target.closest('[data-mark]')
    if (mark && mark.matches(':focus-visible')) showTip(mark)
  })
  root.addEventListener('focusout', e => { if (e.target.closest('[data-mark]')) hideTip() })
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-mark], [data-legend]')
    if (el && root.contains(el)) onActivate(el.dataset.chart, el.dataset.key, el)
  })
  root.addEventListener('keydown', e => {
    const mark = e.target.closest && e.target.closest('[data-mark]')
    if (!mark || e.target !== mark) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(mark.dataset.chart, mark.dataset.key, mark); return }
    const svg = mark.closest('svg')
    const marks = [...svg.querySelectorAll('[data-mark]')]
    const i = marks.indexOf(mark)
    const cols = +svg.dataset.cols || 0
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols || 1, ArrowUp: -(cols || 1), Home: -i, End: marks.length - 1 - i }[e.key]
    if (step === undefined) return
    e.preventDefault()
    const next = marks[Math.max(0, Math.min(marks.length - 1, i + step))]
    if (next === mark) return
    mark.tabIndex = -1
    next.tabIndex = 0
    next.focus()
  })

  // Brushing: a drag on a scatter's plot draws a live rectangle, and letting go reports the range.
  if (!onBrush) return { hideTip }
  const at = (svg, e, { m, iw, ih }) => {
    const r = svg.getBoundingClientRect()
    return { x: Math.min(m.l + iw, Math.max(m.l, e.clientX - r.left)), y: Math.min(m.t + ih, Math.max(m.t, e.clientY - r.top)) }
  }
  root.addEventListener('pointerdown', e => {
    const svg = e.target.closest('svg[data-brush]')
    if (e.button !== 0 || !svg || !e.target.closest('.tb-chart-plot, .tb-chart-brush, .tb-chart-grid, .tb-chart-axis')) return
    const chart = svg.querySelector('[data-chart]')?.dataset.chart
    const g = geoms.get(chart)
    if (!g) return
    e.preventDefault()
    drag = { svg, chart, g, id: e.pointerId }
    const p = at(svg, e, g)
    Object.assign(drag, { x0: p.x, y0: p.y, x1: p.x, y1: p.y })
    svg.setPointerCapture(e.pointerId)
    hideTip()
  })
  root.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return
    const p = at(drag.svg, e, drag.g)
    Object.assign(drag, { x1: p.x, y1: p.y })
    const live = drag.svg.querySelector('.tb-chart-brush--live')
    live.removeAttribute('hidden')
    live.setAttribute('x', Math.min(drag.x0, drag.x1))
    live.setAttribute('y', Math.min(drag.y0, drag.y1))
    live.setAttribute('width', Math.abs(drag.x1 - drag.x0))
    live.setAttribute('height', Math.abs(drag.y1 - drag.y0))
  })
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return
    const d = drag
    drag = null
    d.svg.querySelector('.tb-chart-brush--live')?.setAttribute('hidden', '')
    // A click without a drag clears the range.
    if (Math.abs(d.x1 - d.x0) < 6 || Math.abs(d.y1 - d.y0) < 6) return onBrush(d.chart, null)
    onBrush(d.chart, {
      x0: d.g.toX(Math.min(d.x0, d.x1)), x1: d.g.toX(Math.max(d.x0, d.x1)),
      y0: d.g.toY(Math.max(d.y0, d.y1)), y1: d.g.toY(Math.min(d.y0, d.y1)),
    })
  }
  root.addEventListener('pointerup', end)
  root.addEventListener('pointercancel', end)
  return { hideTip }
}

// Escape hides an open chart tooltip before anything else uses it.
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && tip && !tip.hidden) { hideTip(); e.stopPropagation() }
  }, true)
}
