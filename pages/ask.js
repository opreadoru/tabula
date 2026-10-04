// Ask the data, the templates' home page. One question box. The answer is a dashboard drawn from
// the system's cards and charts, with every figure computed from shared/data.js.
//
// The model only chooses: it answers with a spec (shared/ask-spec.js lists what it may name). The
// code checks that spec, computes every figure, and writes every sentence that carries a figure.
// Each widget can show the exact queries behind it. A follow-up changes the dashboard on screen,
// and Undo puts the one before back.
//
// The start page offers 25 suggested questions, six at a time, over a moving field (ask-field.js).
// Suggested questions play a recorded answer (ask-recorded.js) through the same checks. Typed
// questions go to a model: on this computer, Ollama through the dev server's /ollama proxy, or the
// hosted copy's own model through window.tabulaAsk (see callModel).
//
// Screenshot flags on the hash, joined with +: #q1, #q2, #q3 play a suggested question, #vague,
// #cannot and #split the edge cases, #s1 to #s25 any suggested question, #follow plays the first question and its first follow-up,
// #query opens the queries of the first widget, and #ask=<question> asks a typed question.
// #light and #dark come from shared/nav.js.
import { tb } from '../src/tabula.js'
import { wireCharts, lineChart, areaChart, barChart, donutChart, heatmap, funnelChart, scatterChart, sparkline, legendHtml, tipRow, nice, SERIES } from '../src/charts.js'
import { fmtInt, fmtNum, fmtEur, fmtEurRound, fmtEurCompact, fmtPct, fmtPctN, fmtDelta, fmtPts, fmtCompact, fmtDate, fmtTime, probHtml, esc } from '../src/format.js'
import { mountPage } from './shared/nav.js'
import { statusTag } from './shared/account.js'
import { MONTHS, MOMENTS, WEEKDAYS, isoOf, weekdayOf, sum, split, funnel, hourly, REGIONS, REGION_BY_ID, COUNTRIES, PRODUCTS, CATEGORIES, ACCOUNTS, PRODUCT_BY_ID, COUNTRY_BY_CODE, SEGMENTS, SEGMENT_BY_ID, PLANS, STATUSES } from './shared/data.js'
import { METRICS, axisName, buildPrompt, check, changes, resolveScope, scopeWords, widgetName, widgetKey, rangeText, capital } from './shared/ask-spec.js'
import { RECORDED, SUGGESTED, EDGES } from './ask-recorded.js'
import { mountField } from './ask-field.js'

const FLAGS = new Set(location.hash.slice(1).split('+').filter(Boolean))
mountPage(null)

const $ = s => document.querySelector(s)
const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
const I = {
  code: lucide('<path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" />'),
  up: lucide('<path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />'),
  down: lucide('<path d="M16 17h6v-6" /><path d="m22 17-8.5-8.5-5 5L2 7" />'),
  flat: lucide('<path d="M5 12h14" />'),
  info: lucide('<circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />'),
  alert: lucide('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />'),
  chart: lucide('<path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />'),
  ask: lucide('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />'),
  arrow: lucide('<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />'),
  globe: lucide('<circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />'),
  box: lucide('<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="M12 22V12" /><polyline points="3.29 7 12 12 20.71 7" /><path d="m7.5 4.27 9 5.15" />'),
  users: lucide('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />'),
  clock: lucide('<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />'),
  trend: lucide('<path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />'),
}
const THEME_ICON = { Sales: I.trend, Markets: I.globe, Products: I.box, Customers: I.users, Timing: I.clock }

/* Figures. Every value comes from data.js and goes out through format.js. */

const FMT = {
  eur: { big: fmtEurCompact, value: fmtEurRound, axis: fmtEurCompact, full: fmtEur },
  eur2: { big: fmtEur, value: fmtEur, axis: fmtEurRound, full: fmtEur },
  count: { big: v => (v >= 1e5 ? fmtCompact(v) : fmtInt(v)), value: fmtInt, axis: fmtCompact, full: fmtInt },
  pct: { big: fmtPct, value: fmtPct, axis: v => fmtPctN(v, 1), full: fmtPct },
}
const fmtOf = metric => FMT[METRICS[metric].unit]

function value(metric, f) {
  const m = METRICS[metric]
  if (m.ratio) {
    const d = sum(m.ratio[1], f)
    return d ? sum(m.ratio[0], f) / d : null
  }
  const v = sum(metric, f)
  return m.avg ? v / (f.to - f.from + 1) : v
}
function splitValues(metric, by, f) {
  const m = METRICS[metric]
  if (m.ratio) {
    const a = split(m.ratio[0], by, f)
    const b = split(m.ratio[1], by, f)
    return new Map([...a].filter(([k]) => b.get(k)).map(([k, v]) => [k, v / b.get(k)]))
  }
  const days = f.to - f.from + 1
  return new Map([...split(metric, by, f)].filter(([, v]) => v).map(([k, v]) => [k, m.avg ? v / days : v]))
}
const SPLIT_WORD = { region: 'region', country: 'country' }
const NAMES = {
  region: Object.fromEntries(REGIONS.map(r => [r.id, { name: r.name, short: r.name }])),
  country: Object.fromEntries(COUNTRIES.map(c => [c.code, { name: c.name, short: c.code }])),
  product: Object.fromEntries(PRODUCTS.map(p => [p.id, { name: p.name, short: p.short }])),
  category: Object.fromEntries(CATEGORIES.map(c => [c.id, { name: c.name, short: c.name }])),
}
// A change rounds to what is shown first, so a change too small to show reads as flat.
const deltaOf = (metric, now, before) => {
  if (now === null || before === null || !before) return null
  const pts = METRICS[metric].unit === 'pct'
  const v = Math.round((pts ? now - before : now / before - 1) * 1000) / 1000
  return { v, text: pts ? fmtPts(v) : fmtDelta(v) }
}
const deltaHtml = d => {
  if (!d) return '<span class="tb-text--muted">n/a</span>'
  if (!d.v) return `<span class="tb-stat-delta">${I.flat}${d.text}</span>`
  return `<span class="tb-stat-delta ${d.v > 0 ? 'tb-stat-delta--good' : 'tb-stat-delta--bad'}">${d.v > 0 ? I.up : I.down}${d.text}</span>`
}

/* Time buckets: days up to 45 days, whole weeks up to 200, calendar months beyond. */

const shortDate = d => fmtDate(isoOf(d)).replace(/ \d{4}$/, '')
function buckets(from, to) {
  const days = to - from + 1
  const out = []
  if (days <= 45) {
    const every = Math.ceil(days / 8)
    for (let d = from; d <= to; d += 1) out.push({ from: d, to: d, tick: (to - d) % every === 0 ? shortDate(d) : '', title: fmtDate(isoOf(d)) })
    return { unit: 'day', list: out }
  }
  if (days <= 200) {
    for (let e = to; e - 6 >= from; e -= 7) out.unshift({ from: e - 6, to: e, title: `Week of ${rangeText(e - 6, e)}` })
    const every = Math.ceil(out.length / 7)
    out.forEach((b, i) => { b.tick = (out.length - 1 - i) % every === 0 ? shortDate(b.from) : '' })
    return { unit: 'week', list: out }
  }
  const months = MONTHS.filter(m => m.from >= from && m.to <= to)
  const every = months.length > 13 ? 3 : 1
  months.forEach((m, i) => out.push({ from: m.from, to: m.to, tick: (months.length - 1 - i) % every === 0 ? m.label : '', title: m.long }))
  return { unit: 'month', list: out }
}

/* Queries in words a developer can paste: what each widget asked data.js. */

const dayText = d => `dayOf('${isoOf(d)}')`
function filterText(f, name = 'f') {
  const parts = [`from: ${dayText(f.from)}`, `to: ${dayText(f.to)}`]
  ;['region', 'country', 'product', 'category'].forEach(k => { if (f[k]) parts.push(`${k}: '${f[k]}'`) })
  return `const ${name} = { ${parts.join(', ')} }`
}
function sumText(metric, f = 'f') {
  const m = METRICS[metric]
  if (m.ratio) return `sum('${m.ratio[0]}', ${f}) / sum('${m.ratio[1]}', ${f})`
  return m.avg ? `sum('${metric}', ${f}) / days` : `sum('${metric}', ${f})`
}
function splitText(metric, by, f = 'f') {
  const m = METRICS[metric]
  if (m.ratio) return `split('${m.ratio[0]}', '${by}', ${f}) / split('${m.ratio[1]}', '${by}', ${f})  // per ${by}`
  return m.avg ? `split('${metric}', '${by}', ${f}) / days` : `split('${metric}', '${by}', ${f})`
}

/* Widgets. Each gives its width in twelfths, an optional legend and footnote, a draw(body, width)
   and the queries it ran. */

const accountsIn = scope => ACCOUNTS.filter(a => (scope.region === 'all' || a.region === scope.region)
  && (scope.country === 'all' || a.country === scope.country)
  && (scope.product === 'all' || a.products.includes(scope.product))
  && (scope.category === 'all' || a.products.some(p => PRODUCT_BY_ID[p].category === scope.category)))
const accountsText = scope => {
  const filters = [scope.region !== 'all' && `a.region === '${scope.region}'`, scope.country !== 'all' && `a.country === '${scope.country}'`, scope.product !== 'all' && `a.products.includes('${scope.product}')`, scope.category !== 'all' && `a.products.some(p => PRODUCT_BY_ID[p].category === '${scope.category}')`].filter(Boolean)
  return `ACCOUNTS${filters.length ? `.filter(a => ${filters.join(' && ')})` : ''}`
}
const STATUS_TONE = { Active: 'var(--tb-success)', New: 'var(--tb-accent)', 'At risk': 'var(--tb-danger)', Paused: 'var(--tb-fg-subtle)' }
const ACCOUNT_FOOT = 'Every account in the place and products above. Account revenue covers the last 12 months, whatever the period.'
const SIZE_EDGES = [0, 1e3, 5e3, 1e4, 2.5e4, 5e4, 1e5, 2.5e5, Infinity]

// A scatter axis: zero-based for growth, logarithmic for totals that span a wide range (the
// United States beside Chile), padded around the values otherwise.
function axisOf(values, a) {
  const format = a === 'growth' ? v => fmtPctN(v, 0) : fmtOf(a).axis
  const lo0 = Math.min(...values)
  const hi0 = Math.max(...values)
  if (a !== 'growth' && !METRICS[a].ratio && lo0 > 0 && hi0 / lo0 > 20) {
    const min = 10 ** Math.floor(Math.log10(lo0))
    const max = 10 ** Math.ceil(Math.log10(hi0))
    const ticks = []
    for (let v = min; v <= max * 1.0001; v *= 10) ticks.push(v, v * 3)
    return { min, max, log: true, ticks: ticks.filter(v => v <= max * 1.0001), format }
  }
  const pad = (hi0 - lo0) * 0.12 || Math.abs(hi0) * 0.1 || 1
  const lo = a === 'growth' ? Math.min(0, lo0 - pad) : Math.max(0, lo0 - pad)
  const hi = hi0 + pad
  const { step } = nice(hi - lo, 4, false)
  const min = Math.floor(lo / step) * step
  const max = Math.ceil(hi / step) * step
  const ticks = []
  for (let v = min; v <= max + step / 1e6; v += step) ticks.push(Math.round(v / step) * step)
  return { min, max, ticks, format }
}

const accountRows = (scope, sort) => {
  const list = accountsIn(scope)
  const by = {
    revenue: (a, b) => b.revenue - a.revenue,
    risk: (a, b) => b.risk - a.risk,
    growth: (a, b) => (b.change ?? -9) - (a.change ?? -9),
    decline: (a, b) => (a.change ?? 9) - (b.change ?? 9),
  }[sort]
  return { total: list.length, rows: list.sort(by).slice(0, 10) }
}
const SORT_TEXT = { revenue: '(a, b) => b.revenue - a.revenue', risk: '(a, b) => b.risk - a.risk', growth: '(a, b) => b.change - a.change', decline: '(a, b) => a.change - b.change' }

function widget(w, scope, id) {
  const r = resolveScope(scope)
  const f = r.f
  const b = r.before ? { ...f, from: r.before.from, to: r.before.to } : null
  const head = [filterText(f), ...(b ? [filterText(b, 'before')] : [])]
  const nowName = capital(r.name)
  const beforeName = r.before ? capital(r.before.name) : ''

  if (w.kind === 'figures') {
    const bk = buckets(f.from, f.to).list
    return {
      span: 12, flush: true,
      query: [...head, ...(w.metrics.some(m => METRICS[m].avg) ? [`const days = ${fmtInt(r.days)}`] : []), ...w.metrics.flatMap(m => [`${sumText(m)}  // ${METRICS[m].name.toLowerCase()}`, ...(b ? [`${sumText(m, 'before')}`] : [])])],
      draw(body) {
        body.innerHTML = `<div class="tb-stat-strip ak-figures">${w.metrics.map(m => {
          const now = value(m, f)
          const d = b ? deltaOf(m, now, value(m, b)) : null
          const spark = sparkline({ values: bk.map(x => value(m, { ...f, from: x.from, to: x.to })), width: 88, height: 26 })
          return `<div class="tb-stat">
            <span class="tb-stat-label">${esc(METRICS[m].name)}${METRICS[m].avg ? ', daily average' : ''}</span>
            <span class="tb-stat-value" title="${esc(now === null ? 'n/a' : fmtOf(m).full(now))}">${now === null ? 'n/a' : fmtOf(m).big(now)}</span>
            <span class="tb-stat-spark">${spark}</span>
            <span class="tb-stat-sub">${b ? `${deltaHtml(d)}<span>on ${esc(r.before.name)}</span>` : esc(rangeText(f.from, f.to))}</span>
          </div>`
        }).join('')}</div>`
      },
    }
  }

  if (w.kind === 'trend') {
    const bk = buckets(f.from, f.to)
    const fm = fmtOf(w.metric)
    const points = bk.list.map((x, i) => ({ key: String(i), tick: x.tick, title: x.title }))
    const each = `bucket of ${bk.list.length} ${bk.unit}s`
    if (w.by !== 'none') {
      const ids = [...splitValues(w.metric, w.by, f).keys()].slice(0, 6)
      const series = ids.map((k, i) => ({ name: NAMES[w.by][k].short, colour: SERIES[i], values: bk.list.map(x => splitValues(w.metric, w.by, { ...f, from: x.from, to: x.to }).get(k) || 0) }))
      return {
        span: 8,
        legend: legendHtml(series.map(s => ({ name: s.name, colour: s.colour }))),
        foot: `One ${bk.unit} per step. ${capital(w.by === 'category' ? 'categories' : `${w.by === 'country' ? 'countries' : `${w.by}s`}`)} stacked from the bottom.`,
        query: [...head, `for each ${each}:`, `  ${splitText(w.metric, w.by, '{ ...f, from, to }')}`],
        draw: (body, width) => { body.innerHTML = areaChart({ id, width, height: 220, points, series, yFormat: fm.axis, valueFormat: fm.value, label: widgetName(w) }) },
      }
    }
    const now = bk.list.map(x => value(w.metric, { ...f, from: x.from, to: x.to }))
    const shift = b ? f.from - b.from : 0
    const before = b ? bk.list.map(x => value(w.metric, { ...f, from: x.from - shift, to: x.to - shift })) : null
    const series = [{ name: nowName, colour: 'var(--tb-accent)', values: now, area: true }]
    if (before) series.push({ name: beforeName, colour: 'var(--tb-fg-subtle)', values: before, dashed: true })
    const markers = MOMENTS.map(mo => ({ index: bk.list.findIndex(x => mo.day >= x.from && mo.day <= x.to), label: mo.name })).filter(mo => mo.index >= 0)
    return {
      span: 8,
      legend: legendHtml(series.map(s => ({ name: s.name, colour: s.colour, kind: s.dashed ? 'dashed' : 'line' }))),
      query: [...head, `for each ${each}:`, `  ${sumText(w.metric, '{ ...f, from, to }')}`, ...(b ? [`  ${sumText(w.metric, '{ ...f, from: from - shift, to: to - shift }')}`] : [])],
      draw: (body, width) => { body.innerHTML = lineChart({ id, width, height: 220, points, series, markers, yFormat: fm.axis, valueFormat: fm.value, label: widgetName(w) }) },
    }
  }

  if (w.kind === 'breakdown') {
    const fm = fmtOf(w.metric)
    const now = splitValues(w.metric, w.by, f)
    const before = b ? splitValues(w.metric, w.by, b) : null
    const ids = [...now.keys()].sort((x, y) => now.get(y) - now.get(x))
    const query = [...head, splitText(w.metric, w.by), ...(b ? [splitText(w.metric, w.by, 'before')] : [])]
    if (w.by === 'country') {
      const total = METRICS[w.metric].ratio || METRICS[w.metric].avg ? 0 : ids.reduce((s, k) => s + now.get(k), 0)
      const top = Math.max(...ids.map(k => now.get(k)))
      return {
        span: 6, flush: true, query,
        draw(body) {
          body.innerHTML = `<div class="tb-table-wrap ak-table-wrap"><table class="tb-table">
            <thead><tr><th>Country</th><th class="is-num">${esc(METRICS[w.metric].name)}</th>${before ? '<th class="is-num">Change</th>' : ''}${total ? '<th>Share</th>' : ''}</tr></thead>
            <tbody>${ids.map(k => {
              const d = before ? deltaOf(w.metric, now.get(k), before.get(k) ?? null) : null
              return `<tr><td>${esc(NAMES.country[k].name)}</td><td class="is-num" title="${esc(fm.full(now.get(k)))}">${fm.value(now.get(k))}</td>
                ${before ? `<td class="is-num">${deltaHtml(d)}</td>` : ''}
                ${total ? `<td><span class="ak-share"><span class="tb-bar tb-bar--sm tb-tone-accent" style="--value: ${((now.get(k) / top) * 100).toFixed(1)}"></span><span class="tb-num tb-text--sm">${fmtPct(now.get(k) / total)}</span></span></td>` : ''}</tr>`
            }).join('')}</tbody></table></div>`
        },
      }
    }
    const donut = !before && !METRICS[w.metric].ratio && (w.by === 'region' || w.by === 'category')
    if (donut) {
      const items = ids.map((k, i) => ({ key: k, name: NAMES[w.by][k].name, value: now.get(k), colour: SERIES[i] }))
      const total = items.reduce((s, x) => s + x.value, 0)
      // Half the width, so the legend keeps room for the names beside the donut.
      return {
        span: 6, query,
        draw: body => { body.innerHTML = donutChart({ id, items, center: { value: fm.big(total), label: METRICS[w.metric].name.toLowerCase() }, valueFormat: fm.big, label: widgetName(w) }) },
      }
    }
    const groups = ids.map(k => ({ key: k, label: NAMES[w.by][k].short, title: NAMES[w.by][k].name }))
    const series = [{ name: nowName, colour: 'var(--tb-accent)', values: ids.map(k => now.get(k)) }]
    if (before) series.push({ name: beforeName, colour: 'var(--tb-border-strong)', values: ids.map(k => before.get(k) || 0) })
    return {
      span: 6, query,
      legend: before ? legendHtml(series.map(s => ({ name: s.name, colour: s.colour }))) : '',
      draw: (body, width) => { body.innerHTML = barChart({ id, width, height: 220, groups, series, stacked: false, yFormat: fm.axis, valueFormat: fm.value, showValues: false, label: widgetName(w) }) },
    }
  }

  if (w.kind === 'table') {
    const cols = w.metrics.map(m => ({ m, now: splitValues(m, w.by, f), before: b ? splitValues(m, w.by, b) : null }))
    const ids = [...cols[0].now.keys()].sort((x, y) => cols[0].now.get(y) - cols[0].now.get(x))
    return {
      span: w.metrics.length > 2 ? 12 : 6, flush: true,
      foot: b ? `Each change is on ${r.before.name}.` : '',
      query: [...head, ...(w.metrics.some(m => METRICS[m].avg) ? [`const days = ${fmtInt(r.days)}`] : []), ...w.metrics.flatMap(m => [splitText(m, w.by), ...(b ? [splitText(m, w.by, 'before')] : [])])],
      draw(body) {
        body.innerHTML = `<div class="tb-table-wrap ak-table-wrap"><table class="tb-table">
          <thead><tr><th>${esc(capital(w.by === 'category' ? 'category' : w.by))}</th>${cols.map(c => `<th class="is-num">${esc(METRICS[c.m].name)}</th>${b ? '<th class="is-num">Change</th>' : ''}`).join('')}</tr></thead>
          <tbody>${ids.map(k => `<tr><td>${esc(NAMES[w.by][k].name)}</td>${cols.map(c => {
            const v = c.now.get(k)
            return `<td class="is-num" title="${esc(v === undefined ? 'n/a' : fmtOf(c.m).full(v))}">${v === undefined ? 'n/a' : fmtOf(c.m).value(v)}</td>${b ? `<td class="is-num">${deltaHtml(deltaOf(c.m, v ?? null, c.before.get(k) ?? null))}</td>` : ''}`
          }).join('')}</tr>`).join('')}</tbody></table></div>`
      },
    }
  }

  if (w.kind === 'scatter') {
    const items = w.by === 'country'
      ? COUNTRIES.filter(c => (scope.region === 'all' || c.region === scope.region)).map(c => ({ id: c.code, short: c.code, name: c.name, group: REGIONS.findIndex(x => x.id === c.region), f: { ...f, country: c.code } }))
      : PRODUCTS.filter(p => scope.category === 'all' || p.category === scope.category).map(p => ({ id: p.id, short: p.short, name: p.name, group: CATEGORIES.findIndex(x => x.id === p.category), f: { ...f, product: p.id } }))
    const prevOf = g => ({ ...g, from: f.from - r.days, to: f.from - 1 })
    const read = (a, g) => {
      if (a !== 'growth') return value(a, g)
      const was = value('revenue', prevOf(g))
      return was ? value('revenue', g) / was - 1 : null
    }
    const fmtA = a => (a === 'growth' ? fmtDelta : fmtOf(a).value)
    const pts = items.map(it => ({ ...it, x: read(w.x, it.f), y: read(w.y, it.f) })).filter(it => it.x !== null && it.y !== null)
    const ax = axisOf(pts.map(p => p.x), w.x)
    const ay = axisOf(pts.map(p => p.y), w.y)
    const groups = w.by === 'country' ? REGIONS : CATEGORIES
    const points = pts.map(it => ({
      key: it.id, x: it.x, y: it.y, r: 5, colour: SERIES[it.group], title: it.name,
      rows: [tipRow(SERIES[it.group], axisName(w.x), fmtA(w.x)(it.x)), tipRow(SERIES[it.group], axisName(w.y), fmtA(w.y)(it.y))],
    }))
    const growthLine = a => (a === 'growth' ? [`${sumText('revenue', `{ ...f, ${w.by}: id }`)} / ${sumText('revenue', `{ ...f, ${w.by}: id, from: ${dayText(f.from - r.days)}, to: ${dayText(f.from - 1)} }`)} - 1  // growth`] : [`${sumText(a, `{ ...f, ${w.by}: id }`)}  // ${METRICS[a].name.toLowerCase()}`])
    return {
      span: 6,
      legend: legendHtml([...new Set(pts.map(p => p.group))].sort().map(g => ({ name: groups[g].name, colour: SERIES[g], kind: 'dot' }))),
      foot: `${axisName(w.x)} across, ${axisName(w.y).toLowerCase()} up. One dot per ${w.by}.${ax.log || ay.log ? ' Totals on a log scale, so small markets stay readable.' : ''}`,
      query: [filterText(f), `for each ${w.by}:`, ...[w.x, w.y].flatMap(growthLine).map(l => `  ${l}`)],
      draw(body, width) {
        body.innerHTML = scatterChart({ id, width, height: 260, points, x: ax, y: ay, brushable: false, refs: w.y === 'growth' || w.x === 'growth' ? [{ axis: w.y === 'growth' ? 'y' : 'x', value: 0, label: 'No growth' }] : [], label: widgetName(w) })
        // Each dot carries its short name, so the chart reads without hovering.
        const svg = body.querySelector('svg')
        pts.forEach(it => {
          const dot = svg.querySelector(`circle[data-key="${it.id}"]`)
          if (!dot) return
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'text')
          t.setAttribute('class', 'tb-chart-axis ak-dot-label')
          t.setAttribute('x', +dot.getAttribute('cx') + 8)
          t.setAttribute('y', +dot.getAttribute('cy'))
          t.setAttribute('dy', '0.32em')
          t.textContent = it.short
          svg.append(t)
        })
      },
    }
  }

  if (w.kind === 'mix') {
    const fm = fmtOf(w.metric)
    const ids = [...split(w.metric, w.by, f)].filter(([, v]) => v).sort((x, y) => y[1] - x[1]).map(([k]) => k)
    const parts = w.then === 'product' ? PRODUCTS.filter(p => scope.category === 'all' || p.category === scope.category).map(p => p.id) : CATEGORIES.map(c => c.id)
    const cells = ids.map(k => split(w.metric, w.then, { ...f, [w.by]: k }))
    const series = parts.map((pid, i) => ({ name: NAMES[w.then][pid].short, colour: SERIES[i % SERIES.length], values: cells.map(c => c.get(pid) || 0) }))
    const groups = ids.map(k => ({ key: k, label: NAMES[w.by][k].short, title: NAMES[w.by][k].name }))
    return {
      span: 6,
      legend: legendHtml(series.map(x => ({ name: x.name, colour: x.colour }))),
      foot: `Each bar is ${fmtPctN(1)} of its ${SPLIT_WORD[w.by]}'s ${METRICS[w.metric].name.toLowerCase()}.`,
      query: [filterText(f), `for each ${w.by}:`, `  split('${w.metric}', '${w.then}', { ...f, ${w.by}: id })`],
      draw: (body, width) => { body.innerHTML = barChart({ id, width, height: 230, groups, series, stacked: true, share: true, showValues: false, valueFormat: fm.value, label: widgetName(w) }) },
    }
  }

  if (w.kind === 'calendar') {
    const fm = fmtOf(w.metric)
    // Whole weeks from Monday. A long period shows its last 26 weeks.
    let from = f.from - weekdayOf(f.from)
    const cut = (f.to - from + 1) / 7 > 26
    if (cut) from = f.to - weekdayOf(f.to) - 25 * 7
    const weeks = Math.ceil((f.to - from + 1) / 7)
    const day = (r0, c) => from + c * 7 + r0
    const inside = d => d >= f.from && d <= f.to
    const values = WEEKDAYS.map((_, r0) => Array.from({ length: weeks }, (_, c) => (inside(day(r0, c)) ? value(w.metric, { ...f, from: day(r0, c), to: day(r0, c) }) || 0 : 0)))
    const cols = Array.from({ length: weeks }, (_, c) => {
      const first = MONTHS.find(m => m.from >= day(0, c) && m.from <= day(6, c))
      return { label: first || c === 0 ? (first || MONTHS.find(m => day(0, c) >= m.from && day(0, c) <= m.to)).label : '', title: `Week of ${rangeText(day(0, c), day(6, c))}` }
    })
    const flat = values.flat().filter(v => v)
    return {
      span: weeks > 16 ? 12 : 6,
      foot: cut ? `The last ${fmtInt(26)} weeks of the period, one column per week.` : 'One column per week, Monday at the top.',
      query: [filterText(f), 'for each day:', `  ${sumText(w.metric, '{ ...f, from: day, to: day }')}`],
      draw: (body, width) => {
        body.innerHTML = heatmap({ id, width, rows: WEEKDAYS.map(d => ({ label: d })), cols, values, valueFormat: fm.value, rowHeight: 22, legend: { label: METRICS[w.metric].name, min: fm.value(Math.min(...flat)), max: fm.value(Math.max(...flat)) }, label: widgetName(w) })
      },
    }
  }

  if (w.kind === 'customers') {
    const list = accountsIn(scope)
    const keys = { segment: SEGMENTS.map(x => [x.id, x.name]), plan: PLANS.map(x => [x, x]), region: REGIONS.map(x => [x.id, x.name]), country: COUNTRIES.map(x => [x.code, x.code]) }[w.by]
    const groups = keys.filter(([k]) => list.some(a => a[w.by] === k)).map(([k, label]) => ({ key: k, label, title: w.by === 'country' ? COUNTRY_BY_CODE[k].name : label }))
    const series = STATUSES.map(st => ({ name: st, colour: STATUS_TONE[st], values: groups.map(g => list.filter(a => a[w.by] === g.key && a.status === st).length) }))
    return {
      span: 6,
      legend: legendHtml(series.map(x => ({ name: x.name, colour: x.colour }))),
      foot: ACCOUNT_FOOT,
      query: [`${accountsText(scope)}`, `  count by a.${w.by} and a.status`],
      draw: (body, width) => { body.innerHTML = barChart({ id, width, height: 230, groups, series, stacked: true, yFormat: fmtInt, valueFormat: fmtInt, label: widgetName(w) }) },
    }
  }

  if (w.kind === 'sizes') {
    const list = accountsIn(scope)
    const bins = SIZE_EDGES.slice(0, -1).map((lo, i) => ({ lo, hi: SIZE_EDGES[i + 1] }))
    const groups = bins.map((x, i) => ({ key: String(i), label: x.hi === Infinity ? `${fmtCompact(x.lo)}+` : fmtCompact(x.hi), title: x.hi === Infinity ? `Over ${fmtEurRound(x.lo)}` : `${fmtEurRound(x.lo)} to ${fmtEurRound(x.hi)}` }))
    const series = SEGMENTS.map((sg, i) => ({ name: sg.name, colour: SERIES[i], values: bins.map(x => list.filter(a => a.segment === sg.id && a.revenue >= x.lo && a.revenue < x.hi).length) }))
    return {
      span: 6,
      legend: legendHtml(series.map(x => ({ name: x.name, colour: x.colour }))),
      foot: `Accounts by revenue over the last 12 months, in euros, up to each bar's amount. ${ACCOUNT_FOOT.split('. ')[0]}.`,
      query: [`${accountsText(scope)}`, `  count by a.revenue in ${SIZE_EDGES.slice(1, -1).map(fmtInt).join(', ')} and a.segment`],
      draw: (body, width) => { body.innerHTML = barChart({ id, width, height: 230, groups, series, stacked: true, gap: 0.14, yFormat: fmtInt, valueFormat: fmtInt, label: widgetName(w) }) },
    }
  }

  if (w.kind === 'funnel') {
    const stages = funnel(f).map(s => ({ key: s.id, name: s.name, value: s.value }))
    return {
      span: 6,
      foot: 'Trials, customers and renewals follow each country\'s usual rates from signups in the period.',
      query: [...head, 'funnel(f)'],
      draw: (body, width) => { body.innerHTML = funnelChart({ id, width, stages, label: widgetName(w) }) },
    }
  }

  if (w.kind === 'hours') {
    const grid = hourly(f)
    const hour = h => fmtTime(`2026-01-01T${String(h).padStart(2, '0')}:00`)
    const top = Math.max(...grid.flat())
    return {
      span: 6,
      foot: 'Each weekday\'s orders spread over the hours by its usual pattern.',
      query: [...head, 'hourly(f)  // 7 weekdays by 24 hours, Monday first'],
      draw: (body, width) => {
        body.innerHTML = heatmap({ id, width, rows: WEEKDAYS.map(d => ({ label: d })), cols: Array.from({ length: 24 }, (_, h) => ({ label: h % 3 === 0 ? hour(h) : '', title: `${hour(h)} to ${hour((h + 1) % 24)}` })), values: grid, valueFormat: v => fmtNum(v), rowHeight: 24, legend: { label: 'Orders', min: fmtInt(0), max: fmtInt(top) }, label: widgetName(w) })
      },
    }
  }

  const { total, rows } = accountRows(scope, w.sort)
  return {
    span: 12, flush: true,
    foot: `Top ${fmtInt(rows.length)} of ${fmtInt(total)} accounts. Revenue and change cover the last 12 months, whatever the period above.`,
    query: [accountsText(scope), `  .sort(${SORT_TEXT[w.sort]})`, '  .slice(0, 10)'],
    draw(body) {
      body.innerHTML = rows.length ? `<div class="tb-table-wrap ak-table-wrap"><table class="tb-table">
        <thead><tr><th>Account</th><th>Segment</th><th class="is-num">Revenue</th><th class="is-num">Change</th><th>Churn risk</th><th>Status</th></tr></thead>
        <tbody>${rows.map(a => `<tr>
          <td><a class="tb-link" href="./detail.html?id=${esc(a.id)}">${esc(a.name)}</a> <span class="tb-text--muted">${esc(COUNTRY_BY_CODE[a.country].name)}</span></td>
          <td class="tb-text--muted">${esc(SEGMENT_BY_ID[a.segment].name)}</td>
          <td class="is-num" title="${esc(fmtEur(a.revenue))}">${fmtEurRound(a.revenue)}</td>
          <td class="is-num">${a.change === null ? '<span class="tb-text--muted">n/a</span>' : deltaHtml({ v: Math.round(a.change * 1000) / 1000, text: fmtDelta(Math.round(a.change * 1000) / 1000) })}</td>
          <td>${probHtml(a.risk)}</td><td>${statusTag(a.status)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="tb-empty tb-empty--compact"><p class="tb-empty-title">No accounts match</p></div>'
    },
  }
}

// Rows of twelve: widgets keep their order, and the last row's gap goes to its widest card.
function pack(list) {
  const rows = [[]]
  list.forEach(x => {
    const row = rows.at(-1)
    if (row.reduce((s, y) => s + y.span, 0) + x.span > 12) rows.push([x])
    else row.push(x)
  })
  rows.forEach(row => {
    const left = 12 - row.reduce((s, y) => s + y.span, 0)
    if (left > 0) row.reduce((a, y) => (y.span >= a.span ? y : a)).span += left
  })
}

/* The board */

const grid = $('#ak-grid')
let drawn = []

function renderBoard() {
  const board = state.board
  const working = $('#ak-main').classList.contains('is-working')
  $('#ak-board').hidden = !board && !working
  $('#ak-board').querySelector('.ak-board-head').hidden = !board
  if (!board) {
    drawn = []
    grid.innerHTML = working ? `<div class="tb-card ak-none"><div class="tb-empty">${I.chart}<p class="tb-empty-title">No dashboard yet</p><p class="tb-empty-description">The dashboard appears here once a question can be answered from the data.</p></div></div>` : ''
    return
  }
  $('#ak-title').textContent = board.title
  $('#ak-scope').textContent = scopeWords(board.scope)
  $('#ak-undo').hidden = !state.undo.length
  drawn = board.widgets.map((w, i) => ({ w, key: widgetKey(w), ...widget(w, board.scope, `ak-w${i}`) }))
  pack(drawn)
  grid.innerHTML = drawn.map((d, i) => {
    const open = state.openQuery.has(d.key)
    const wide = d.legend && (d.legend.match(/tb-legend-item/g) || []).length > 3
    return `<section class="tb-card ak-card${state.fresh.has(d.key) ? ' is-new' : ''}" style="--span: ${d.span}" data-index="${i}" aria-labelledby="ak-w${i}-title">
      <div class="tb-card-header">
        <h2 class="tb-card-title" id="ak-w${i}-title">${esc(widgetName(d.w))}</h2>
        <div class="tb-card-actions">${d.legend && !wide ? d.legend : ''}
          <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-query aria-pressed="${open}" aria-controls="ak-w${i}-query" aria-label="Show the queries behind ${esc(widgetName(d.w).toLowerCase())}" data-tb-tooltip="Show the queries">${I.code}</button>
        </div>
      </div>
      ${wide ? `<div class="ak-legend">${d.legend}</div>` : ''}
      <div class="tb-card-body${d.flush ? ' tb-card-body--flush' : ' tb-chart-body'}" data-body></div>
      <div class="ak-query" id="ak-w${i}-query"${open ? '' : ' hidden'}>
        <p class="ak-query-lead">What this widget asked <code>data.js</code>. The model chose the widget, and this code computed its figures.</p>
        <pre class="ak-code"><code>${esc(d.query.join('\n'))}</code></pre>
      </div>
      ${d.foot ? `<div class="tb-card-footer ak-foot"><span class="tb-text tb-text--sm tb-text--muted">${esc(d.foot)}</span></div>` : ''}
    </section>`
  }).join('')
  drawAll()
  tb.init(grid)
}
function drawAll() {
  grid.querySelectorAll('.ak-card').forEach(card => {
    const d = drawn[+card.dataset.index]
    const body = card.querySelector('[data-body]')
    d.draw(body, Math.max(200, Math.floor(body.clientWidth - (d.flush ? 0 : 24))))
  })
}

grid.addEventListener('click', e => {
  const btn = e.target.closest('[data-query]')
  if (!btn) return
  const card = btn.closest('.ak-card')
  const d = drawn[+card.dataset.index]
  const open = btn.getAttribute('aria-pressed') !== 'true'
  btn.setAttribute('aria-pressed', String(open))
  card.querySelector('.ak-query').hidden = !open
  if (open) state.openQuery.add(d.key)
  else state.openQuery.delete(d.key)
})
wireCharts(grid)

/* The conversation */

const state = {
  turns: [], // { question, pending?, source, model, ms, raw, result, changes }
  board: null,
  undo: [], // { board, chain }
  chain: [], // the questions behind the board on screen, for recorded follow-ups
  openQuery: new Set(),
  fresh: new Set(), // widgets the last answer added, marked for a moment
  controller: null,
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
const chainKey = () => state.chain.map(norm).join(' > ')
// A hosted copy sets window.tabulaAsk = { name, call(context, { signal }), recorded }. call gets
// { question, current, history } and builds the prompt on its own side, and recorded replaces the
// answers recorded here with ones from its own model.
const host = window.tabulaAsk || null
const MODEL = host?.name || 'gemma4:12b'
const ANSWERS = host?.recorded || RECORDED
const recordedFor = q => ANSWERS.find(x => norm(x.q) === norm(q) && (x.after || '') === chainKey())

// The model, behind one function: the hosted version's when there is one, else Ollama here.
async function callModel(context, signal) {
  if (host) return host.call(context, { signal })
  const prompt = buildPrompt(context.question, context)
  let res
  try {
    res = await fetch('/ollama/api/chat', {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, stream: false, think: false, format: prompt.schema, options: { temperature: 0 }, messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }] }),
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    res = null
  }
  if (!res || !res.ok) {
    const e = new Error('offline')
    e.userMessage = `No model answered. Typed questions need Ollama running on this computer with ${MODEL}, and the page served by npx vite. The suggested questions work without it.`
    throw e
  }
  const j = await res.json()
  try { return JSON.parse(j.message.content) } catch { return null }
}

async function ask(question) {
  question = question.replace(/\s+/g, ' ').trim()
  if (!question || state.controller) return
  const turn = { question, pending: true }
  state.turns.push(turn)
  const rec = recordedFor(question)
  turn.source = rec ? 'recorded' : 'model'
  showWork()
  renderLog()
  const controller = new AbortController()
  state.controller = controller
  setBusy(true)
  const t0 = performance.now()
  try {
    let raw
    if (rec) {
      await new Promise(r => setTimeout(r, 450))
      raw = rec.raw
      turn.model = rec.model
    } else {
      raw = await callModel({ question, current: state.board, history: state.turns.slice(0, -1).filter(t => t.question).map(t => t.question) }, controller.signal)
      turn.model = MODEL
      turn.ms = performance.now() - t0
    }
    if (controller.signal.aborted || !state.turns.includes(turn)) return
    turn.raw = raw
    const result = check(raw, state.board)
    turn.result = result
    if (result.reply === 'dashboard') {
      turn.changes = changes(state.board, result)
      const before = state.board
      turn.followUp = !!before
      state.fresh = new Set(before ? result.widgets.map(widgetKey).filter(k => !before.widgets.some(w => widgetKey(w) === k)) : [])
      if (before) state.undo.push({ board: before, chain: state.chain.slice() })
      state.board = { title: result.title, scope: result.scope, widgets: result.widgets }
      state.chain.push(question)
      renderBoard()
      setTimeout(() => { state.fresh = new Set(); grid.querySelectorAll('.ak-card.is-new').forEach(c => c.classList.remove('is-new')) }, 2400)
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // Stop removes the question. Start over has already cleared it and says so itself.
      if (state.turns.at(-1) === turn) {
        state.turns.pop()
        tb.toast({ message: 'Stopped. The dashboard did not change.' })
      }
    } else {
      turn.result = { reply: 'error', text: err.userMessage || 'The model did not answer, so nothing changed.', notes: [] }
    }
  } finally {
    turn.pending = false
    if (state.controller === controller) state.controller = null
    setBusy(false)
    if (!state.turns.length) showStart()
  }
}

const plural = (n, one, many = `${one}s`) => `${fmtInt(n)} ${n === 1 ? one : many}`
function answerHtml(t) {
  const r = t.result
  if (t.pending) {
    return `<p class="ak-msg-text">${t.source === 'recorded' ? 'Playing back the recorded answer.' : `Waiting for ${esc(MODEL)} to choose the widgets.`}</p>
      <div class="tb-progress tb-progress--sm tb-progress--ai tb-progress--indeterminate ak-wait"><span class="tb-progress-bar"></span></div>
      ${t.source === 'model' ? '<button class="tb-button tb-button--sm" type="button" data-stop>Stop</button>' : ''}`
  }
  let out = ''
  if (r.reply === 'dashboard') {
    if (t.changes.length) out += `<ul class="ak-changes">${t.changes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`
    else if (t.followUp) out += '<p class="ak-msg-text">The model kept the dashboard as it was.</p>'
    else out += `<p class="ak-msg-text">Drew ${plural(r.widgets.length, 'widget')}: ${esc(r.widgets.map(w => widgetName(w).toLowerCase()).join(', '))}.</p>`
  } else if (r.reply === 'error') {
    out += `<div class="tb-callout tb-callout--danger ak-callout">${I.alert}<div class="tb-callout-content"><p>${esc(r.text)}</p></div></div>
      <button class="tb-button tb-button--sm" type="button" data-retry="${esc(t.question)}">Try again</button>`
  } else {
    out += `<p class="ak-msg-text">${esc(r.text)}</p>`
    if (r.options.length) {
      out += `<div class="ak-options" role="group" aria-label="${r.reply === 'clarify' ? 'Choose one' : 'Questions the data can answer'}">
        ${r.reply === 'cannot' ? '<span class="ak-options-label">The data can answer these</span>' : ''}
        ${r.options.map(o => `<button class="tb-button tb-button--sm ak-option" type="button" data-ask="${esc(o)}">${esc(o)}</button>`).join('')}</div>`
    }
  }
  if (r.notes?.length) {
    out += `<ul class="ak-notes" aria-label="What the code changed">${r.notes.map(n => `<li class="ak-note${n.tone === 'warning' ? ' ak-note--warning' : ''}">${n.tone === 'warning' ? I.alert : I.info}<span>${esc(n.text)}</span></li>`).join('')}</ul>`
  }
  if (t.raw !== undefined) {
    const who = t.source === 'recorded' ? `Recorded answer from ${esc(t.model)}` : `${esc(t.model)}, ${fmtNum(t.ms / 1000, 1)} s`
    out += `<div class="ak-meta"><span>${who}</span><button class="ak-raw-toggle" type="button" data-raw aria-expanded="false">What the model returned</button></div>
      <pre class="ak-code ak-raw" hidden><code>${esc(JSON.stringify(t.raw, null, 2))}</code></pre>`
  }
  return out
}

function renderLog() {
  $('#ak-log').innerHTML = state.turns.map((t, i) => {
    if (t.undo) return `<p class="ak-undo-line">${esc(t.undo)}</p>`
    const tone = t.result?.reply === 'cannot' || t.result?.reply === 'error' ? ' ak-msg--stop' : ''
    return `<div class="ak-msg ak-msg--user"><p>${esc(t.question)}</p></div>
      <div class="ak-msg ak-msg--ai${tone}" data-turn="${i}">
        <span class="tb-avatar tb-avatar--ai tb-avatar--sm" aria-hidden="true">AI</span>
        <div class="ak-msg-body">${answerHtml(t)}</div>
      </div>`
  }).join('')
  const log = $('#ak-log')
  log.scrollTop = log.scrollHeight
  // Follow-ups recorded for the dashboard on screen.
  const next = state.board ? ANSWERS.filter(x => x.after && x.after === chainKey() && x.chip) : []
  $('#ak-follow').innerHTML = next.length && !state.controller
    ? `<span class="ak-options-label">Try a follow-up</span>${next.map(x => `<button class="tb-button tb-button--sm ak-option" type="button" data-ask="${esc(x.q)}">${esc(x.q)}</button>`).join('')}`
    : ''
}

$('#ak-log').addEventListener('click', e => {
  const raw = e.target.closest('[data-raw]')
  if (raw) {
    const pre = raw.closest('.ak-msg-body').querySelector('.ak-raw')
    pre.hidden = !pre.hidden
    raw.setAttribute('aria-expanded', String(!pre.hidden))
    raw.textContent = pre.hidden ? 'What the model returned' : 'Hide what the model returned'
    return
  }
  if (e.target.closest('[data-stop]')) return state.controller?.abort()
  const retry = e.target.closest('[data-retry]')
  if (retry) {
    state.turns.splice(state.turns.findIndex(t => t.result?.reply === 'error' && t.question === retry.dataset.retry), 1)
    return ask(retry.dataset.retry)
  }
  const opt = e.target.closest('[data-ask]')
  if (opt) ask(opt.dataset.ask)
})
$('#ak-follow').addEventListener('click', e => { const opt = e.target.closest('[data-ask]'); if (opt) ask(opt.dataset.ask) })

$('#ak-undo').addEventListener('click', () => {
  const last = state.undo.pop()
  if (!last) return
  state.board = last.board
  state.chain = last.chain
  state.fresh = new Set()
  state.turns.push({ undo: `Undone. Back to ${last.board.title.charAt(0).toLowerCase()}${last.board.title.slice(1)}.` })
  renderBoard()
  renderLog()
})

$('#ak-restart').addEventListener('click', () => {
  // An answer still on its way is dropped, so Undo brings back only the answered questions.
  state.controller?.abort()
  const turns = state.turns.filter(t => !t.pending)
  const saved = { turns, board: state.board, undo: state.undo.slice(), chain: state.chain.slice() }
  Object.assign(state, { turns: [], board: null, undo: [], chain: [], fresh: new Set(), controller: null })
  showStart()
  tb.toast({
    message: 'The conversation and the dashboard are cleared.',
    action: { label: 'Undo', onClick: () => { Object.assign(state, saved); showWork(); renderBoard(); renderLog() } },
  })
})

/* The two views: the start page, and the conversation beside the board. */

const field = mountField($('#ak-field'))
function showStart() {
  field.start()
  $('#ak-start').hidden = false
  $('#ak-thread').hidden = true
  $('#ak-board').hidden = true
  $('#ak-main').classList.remove('is-working')
  renderBoard()
}
function showWork() {
  field.stop()
  $('#ak-start').hidden = true
  $('#ak-thread').hidden = false
  $('#ak-main').classList.add('is-working')
  if (!state.board) renderBoard()
}
function setBusy(busy) {
  document.querySelectorAll('[data-composer] [data-send]').forEach(b => { b.disabled = busy })
  if (!busy) renderLog()
}

document.querySelectorAll('[data-composer]').forEach(form => {
  const input = form.querySelector('[data-question]')
  form.addEventListener('submit', e => {
    e.preventDefault()
    const q = input.value
    if (!q.trim() || state.controller) return
    input.value = ''
    ask(q).then(() => $('#ak-q').focus())
  })
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit() }
  })
})
document.querySelector('[data-model-note]').textContent = host ? `Answered by ${MODEL}` : `Answered by ${MODEL} on this computer`

// Six suggestions at a time from the pool, by theme. Other questions shows the next six.
let page = 0
const PER_PAGE = 6
function renderSuggestions() {
  const pages = Math.ceil(SUGGESTED.length / PER_PAGE)
  const shown = SUGGESTED.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
  $('#ak-suggest').innerHTML = shown.map(x => `<button class="tb-card tb-card--interactive ak-suggestion" type="button" data-ask="${esc(x.q)}">${THEME_ICON[x.theme] || I.chart}<span class="ak-suggestion-theme">${esc(x.theme)}</span><span class="ak-suggestion-q">${esc(x.q)}</span></button>`).join('')
  $('#ak-more-count').textContent = `${fmtInt(page + 1)} of ${fmtInt(pages)}`
}
$('#ak-more').addEventListener('click', () => {
  page = (page + 1) % Math.ceil(SUGGESTED.length / PER_PAGE)
  renderSuggestions()
})
renderSuggestions()
$('#ak-edges').innerHTML = EDGES.map(x => `<button class="ak-edge" type="button" data-ask="${esc(x.q)}"><span class="ak-edge-kind">${esc(x.kind)}</span><span class="ak-edge-q">${esc(x.q)}</span>${I.arrow}</button>`).join('')
$('#ak-start').addEventListener('click', e => { const b = e.target.closest('[data-ask]'); if (b) ask(b.dataset.ask) })

// Charts follow the width of their card.
let lastWidth = grid.clientWidth
let resizeTimer = 0
new ResizeObserver(() => {
  if (grid.clientWidth === lastWidth || !state.board) return
  lastWidth = grid.clientWidth
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(drawAll, 60)
}).observe(grid)
document.addEventListener('shell:dock', () => setTimeout(() => state.board && drawAll(), 0))

tb.init(document)

/* Start, with the screenshot flags */

const flagQuestion = { q1: SUGGESTED[0].q, q2: SUGGESTED[1].q, q3: SUGGESTED[2].q, vague: EDGES[0]?.q, cannot: EDGES[1]?.q, split: EDGES[2]?.q }
;(async () => {
  const first = Object.keys(flagQuestion).find(k => FLAGS.has(k))
  const typed = [...FLAGS].find(f => f.startsWith('ask='))
  if (typed) await ask(decodeURIComponent(typed.slice(4)))
  else if (FLAGS.has('follow')) {
    await ask(SUGGESTED[0].q)
    const next = ANSWERS.find(x => x.after === chainKey() && x.chip)
    if (next) await ask(next.q)
  } else if (first) await ask(flagQuestion[first])
  if (FLAGS.has('query')) grid.querySelector('[data-query]')?.click()
  if (!state.turns.length) field.start()
})()
// #s<number> plays suggested question number n, for screenshots of every dashboard.
const sFlag = [...FLAGS].find(x => /^s\d+$/.test(x))
if (sFlag && SUGGESTED[+sFlag.slice(1) - 1]) ask(SUGGESTED[+sFlag.slice(1) - 1].q)
