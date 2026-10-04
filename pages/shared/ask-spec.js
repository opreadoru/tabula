// Ask, the rules between the model and the page. The model never writes a figure or a line of
// markup: it answers with a spec that names a reply, a scope and up to six widgets, every value
// taken from the lists below. check() then reads that spec as untrusted input. It drops what the
// data cannot show, fixes what contradicts itself, and says what it changed in plain words. The
// page draws only what check() returns, and every figure on it comes from shared/data.js.
//
//   const prompt = buildPrompt(question, { current, history })   // { system, user, schema }
//   const answer = check(modelJson, current)                     // { reply, title, scope, widgets, notes, ... }
//   resolveScope(answer.scope)                                   // day numbers, names, the comparison window
//
// No DOM here, so the hosted version's function can build the same prompt and run the same checks.
import { fmtDate, fmtInt } from '../../src/format.js'
import { MONTHS, LAST, START, TODAY, dayOf, isoOf, REGIONS, REGION_BY_ID, COUNTRIES, COUNTRY_BY_CODE, CATEGORIES, PRODUCTS, PRODUCT_BY_ID } from './data.js'

export const MAX_WIDGETS = 6
const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

/* What the data holds. sold: counted per product. avg: shown as a daily average. ratio: worked
   out from two sums. */

export const METRICS = {
  revenue: { name: 'Revenue', sold: true, unit: 'eur' },
  orders: { name: 'Orders', sold: true, unit: 'count' },
  visitors: { name: 'Site visits', sold: false, unit: 'count', plural: true },
  signups: { name: 'Signups', sold: false, unit: 'count', plural: true },
  users: { name: 'Active users', sold: false, unit: 'count', avg: true, plural: true },
  aov: { name: 'Average order', sold: true, unit: 'eur2', ratio: ['revenue', 'orders'] },
  conversion: { name: 'Conversion', sold: false, unit: 'pct', ratio: ['orders', 'visitors'] },
}
const METRIC_IDS = Object.keys(METRICS)
const lower = id => METRICS[id].name.toLowerCase()

export const KINDS = ['figures', 'trend', 'breakdown', 'table', 'scatter', 'mix', 'calendar', 'funnel', 'hours', 'accounts', 'customers', 'sizes']
const SPLITS = ['region', 'country', 'product', 'category']
const SORTS = ['revenue', 'risk', 'growth', 'decline']
const SPLIT_NAME = { region: 'region', country: 'country', product: 'product', category: 'product category', segment: 'segment', plan: 'plan' }
const PLURAL = { region: 'regions', country: 'countries', product: 'products', category: 'product categories' }
// A scatter places its dots by two metrics, or by revenue growth on the same number of days before.
export const AXES = [...METRIC_IDS, 'growth']
export const axisName = a => (a === 'growth' ? 'Revenue growth' : METRICS[a].name)

/* Periods. The model picks one of these ids and the code turns it into days, so a period outside
   the data cannot be asked for. */

const QUARTER_OF = m => Math.ceil(m / 3)
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const shortDate = iso => fmtDate(iso).replace(/ \d{4}$/, '')
export const rangeText = (from, to) => {
  const [a, b] = [isoOf(from), isoOf(to)]
  return a.slice(0, 4) === b.slice(0, 4) ? `${shortDate(a)} to ${fmtDate(b)}` : `${fmtDate(a)} to ${fmtDate(b)}`
}

export const PERIODS = (() => {
  const out = [
    { id: 'last-7-days', name: 'the last 7 days', from: LAST - 6, to: LAST },
    { id: 'last-30-days', name: 'the last 30 days', from: LAST - 29, to: LAST },
    { id: 'last-90-days', name: 'the last 90 days', from: LAST - 89, to: LAST },
    { id: 'last-12-months', name: 'the last 12 months', from: dayOf('2025-10-01'), to: LAST },
    { id: 'all', name: 'the two years in the data', from: 0, to: LAST },
    { id: '2025', name: '2025', from: dayOf('2025-01-01'), to: dayOf('2025-12-31') },
    { id: '2026', name: '2026 so far', from: dayOf('2026-01-01'), to: LAST },
  ]
  const quarters = new Map()
  MONTHS.forEach(m => {
    const y = m.id.slice(0, 4)
    const q = `${y}-Q${QUARTER_OF(+m.id.slice(5, 7))}`
    if (!quarters.has(q)) quarters.set(q, { id: q, name: `Q${q.slice(-1)} ${y}`, from: m.from, to: m.to })
    else quarters.get(q).to = m.to
  })
  out.push(...quarters.values())
  MONTHS.forEach(m => out.push({ id: m.id, name: `${MONTH_NAMES[+m.id.slice(5, 7) - 1]} ${m.id.slice(0, 4)}`, from: m.from, to: m.to }))
  return out
})()
const PERIOD_BY_ID = Object.fromEntries(PERIODS.map(p => [p.id, p]))

// The scope in days, with the window it is compared with. previous is the same number of days
// just before; last-year is the same dates a year earlier. A window that would start before the
// data is null.
export function resolveScope(scope) {
  const p = PERIOD_BY_ID[scope.period]
  const days = p.to - p.from + 1
  const f = { from: p.from, to: p.to }
  if (scope.region !== 'all') f.region = scope.region
  if (scope.country !== 'all') f.country = scope.country
  if (scope.product !== 'all') f.product = scope.product
  if (scope.category !== 'all') f.category = scope.category
  let before = null
  if (scope.compare === 'previous' && p.from - days >= 0) {
    before = { from: p.from - days, to: p.from - 1, name: `the ${fmtInt(days)} days before` }
  } else if (scope.compare === 'last-year') {
    const back = iso => `${+iso.slice(0, 4) - 1}${iso.slice(4)}`
    const from = dayOf(back(isoOf(p.from)))
    if (from >= 0) before = { from, to: from + days - 1, name: 'the same days a year before' }
  }
  return { ...p, days, f, before }
}

/* Words for a scope, written by the code: the place, the products and the period. */

export function placeName(scope) {
  if (scope.country !== 'all') return COUNTRY_BY_CODE[scope.country].name
  if (scope.region !== 'all') return REGION_BY_ID[scope.region].name
  return 'All countries'
}
export function productName(scope) {
  if (scope.product !== 'all') return PRODUCT_BY_ID[scope.product].name
  if (scope.category !== 'all') return CATEGORY_BY_ID[scope.category].name
  return ''
}
export function scopeWords(scope) {
  const r = resolveScope(scope)
  const parts = [placeName(scope)]
  const prod = productName(scope)
  if (prod) parts.push(prod)
  const when = /^\d{4}-\d{2}$|^\d{4}(-Q\d)?$/.test(r.id) ? r.name : `${r.name}, ${rangeText(r.from, r.to)}`
  return `${parts.join(', ')}, ${when}${r.before ? `, compared with ${r.before.name}` : ''}.`
}
export const capital = s => s.charAt(0).toUpperCase() + s.slice(1)

export function widgetName(w) {
  if (w.kind === 'figures') return 'Key figures'
  if (w.kind === 'trend') return w.by === 'none' ? `${METRICS[w.metric].name} over time` : `${METRICS[w.metric].name} by ${SPLIT_NAME[w.by]} over time`
  if (w.kind === 'breakdown') return `${METRICS[w.metric].name} by ${SPLIT_NAME[w.by]}`
  if (w.kind === 'table') return `${capital(PLURAL[w.by])} compared`
  if (w.kind === 'scatter') return `${axisName(w.y)} against ${axisName(w.x).toLowerCase()}`
  if (w.kind === 'mix') return `${METRICS[w.metric].name} by ${SPLIT_NAME[w.by]} and ${SPLIT_NAME[w.then]}`
  if (w.kind === 'calendar') return `${METRICS[w.metric].name} per day`
  if (w.kind === 'customers') return `Accounts by ${SPLIT_NAME[w.by]} and status`
  if (w.kind === 'sizes') return 'Accounts by size'
  if (w.kind === 'funnel') return 'From visit to renewal'
  if (w.kind === 'hours') return 'Orders by weekday and hour'
  return { revenue: 'Top accounts by revenue', risk: 'Accounts most at risk', growth: 'Fastest-growing accounts', decline: 'Accounts in decline' }[w.sort]
}
// The same name inside a sentence: "Added the funnel."
const widgetNoun = w => {
  if (w.kind === 'figures') return 'the key figures'
  if (w.kind === 'funnel') return 'the funnel'
  const name = widgetName(w).replace(/^Top /, 'top ')
  return w.kind === 'accounts' ? `the list of ${name.charAt(0).toLowerCase()}${name.slice(1)}` : `${name.charAt(0).toLowerCase()}${name.slice(1)}`
}
export const widgetKey = w => [w.kind, w.metric || '', (w.metrics || []).join('+'), w.by || '', w.then || '', w.x || '', w.y || '', w.sort || ''].join(':')

/* The prompt. Built here so the local page and the hosted function send the same words. */

const list = (items, fn) => items.map(fn).join(', ')
const SYSTEM = `You turn a question about a company's sales data into a dashboard spec. The code that receives your spec computes every figure and draws every chart. You never write a number about the data and never write HTML.

The data: daily figures for one software and hardware company, per country, from ${fmtDate(START)} to ${fmtDate(TODAY)}. Today is ${fmtDate(TODAY)}. "This quarter" is Q3 2026, "last quarter" is Q2 2026, "this year" is 2026 so far, "last year" is 2025, "this month" is September 2026, "last month" is August 2026.
Metrics: revenue (euros), orders, visitors (site visits), signups, users (daily active users), aov (average order value), conversion (orders per site visit). Visitors, signups, users and conversion are not counted per product.
Regions: ${list(REGIONS, r => `${r.id} ${r.name}`)}.
Countries: ${list(COUNTRIES, c => `${c.code} ${c.name} (${c.region})`)}.
Products: ${list(PRODUCTS, p => `${p.id} ${p.name} (${p.category})`)}.
Categories: ${list(CATEGORIES, c => c.id)}.
Accounts: 480 customer companies, each with its revenue over the last 12 months, its change, a churn risk and a status.
Periods: last-7-days, last-30-days, last-90-days, last-12-months, all, 2025, 2026, quarters such as 2026-Q3, months such as 2026-08.

Widgets:
- figures: up to 4 key figures, listed in metrics.
- trend: one metric over time. by is none, or region, product or category for a stacked view.
- breakdown: one metric split by region, country, product or category.
- table: up to 4 metrics side by side, one row per region, country, product or category (by).
- scatter: one dot per country or per product (by), placed by two metrics, x and y. x or y may also be growth, the revenue growth on the days before.
- mix: revenue or orders by region or country (by), split into products or categories (then), as shares.
- calendar: one metric per day, laid out as a calendar of weeks.
- funnel: from site visit to signup, trial, customer and renewal.
- hours: orders by weekday and hour of the day.
- accounts: a list of customer accounts, sorted by revenue, risk, growth or decline.
- customers: accounts counted by segment, plan, region or country (by), split by status.
- sizes: accounts grouped by their revenue over the last 12 months, from small to large.

How to answer:
- reply "dashboard" when the data can answer. Pick 2 to 5 widgets, at most 6, that answer the question together. Choose the widget that answers best: a scatter to compare markets, a table to compare several figures, a calendar for busy days. Start with figures when totals help. Set scope to the period, place and product the question is about, and "all" for the rest. A category such as hardware goes in category, and product is for one named product. compare is "previous" unless the question asks for last year or for no comparison, and "none" when the period is all. Never split a widget by the place or product the scope already narrows to.
- reply "clarify" when the question is too vague to choose a metric or a period. text is one short question back. options are 2 or 3 short questions the person could send instead.
- reply "cannot" when the data holds nothing on it: forecasts, costs, profit, margins, salaries, staff, marketing spend, stock, anything before October 2024 or after September 2026. text says in one sentence what the data does not hold. Do not offer to guess. options are 2 or 3 nearby questions the data can answer.
- When a current dashboard is given, the question may be a follow-up such as "only Europe" or "add the funnel". Change only what it asks and keep everything else the same.
- title is a few words in sentence case, with no figures. text has no figures. For a dashboard, text is empty.`

export function buildPrompt(question, { current = null, history = [] } = {}) {
  const lines = []
  if (current) lines.push(`Current dashboard: ${JSON.stringify({ title: current.title, scope: current.scope, widgets: current.widgets })}`)
  else lines.push('Current dashboard: none')
  if (history.length) lines.push(`Earlier questions: ${history.slice(-3).map(q => JSON.stringify(q)).join(', ')}`)
  lines.push(`Question: ${JSON.stringify(question)}`)
  return { system: SYSTEM, user: lines.join('\n'), schema: SCHEMA }
}

const all = ids => ['all', ...ids]
export const SCHEMA = {
  type: 'object',
  required: ['reply', 'title', 'text', 'options', 'scope', 'widgets'],
  properties: {
    reply: { type: 'string', enum: ['dashboard', 'clarify', 'cannot'] },
    title: { type: 'string' },
    text: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    scope: {
      type: 'object',
      required: ['period', 'region', 'country', 'product', 'category', 'compare'],
      properties: {
        period: { type: 'string', enum: PERIODS.map(p => p.id) },
        region: { type: 'string', enum: all(REGIONS.map(r => r.id)) },
        country: { type: 'string', enum: all(COUNTRIES.map(c => c.code)) },
        product: { type: 'string', enum: all(PRODUCTS.map(p => p.id)) },
        category: { type: 'string', enum: all(CATEGORIES.map(c => c.id)) },
        compare: { type: 'string', enum: ['previous', 'last-year', 'none'] },
      },
    },
    widgets: {
      type: 'array',
      items: {
        type: 'object',
        required: ['kind'],
        properties: {
          kind: { type: 'string', enum: KINDS },
          metric: { type: 'string', enum: METRIC_IDS },
          metrics: { type: 'array', items: { type: 'string', enum: METRIC_IDS } },
          by: { type: 'string', enum: ['none', ...SPLITS, 'segment', 'plan'] },
          then: { type: 'string', enum: ['product', 'category'] },
          x: { type: 'string', enum: AXES },
          y: { type: 'string', enum: AXES },
          sort: { type: 'string', enum: SORTS },
        },
      },
    },
  },
}

/* The checks. The model's answer is read like any other input from outside: every value must be
   on a list, and a spec the data cannot draw is fixed or cut, with a note that says so. */

// A figure in the model's own words is not allowed. A year in the data and a quarter name are.
const hasFigure = s => /\d/.test(String(s).replace(/\b20(24|25|26)\b/g, '').replace(/\bQ[1-4]\b/g, ''))
const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback)
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim()

export function check(raw, current = null) {
  const notes = []
  const note = (text, tone = 'info') => notes.push({ text, tone })
  const spec = raw && typeof raw === 'object' ? raw : {}
  const reply = pick(spec.reply, ['dashboard', 'clarify', 'cannot'], null)
  if (!reply) return { reply: 'error', notes, text: 'The model answered in a shape the page cannot read, so nothing changed.' }

  if (reply === 'clarify' || reply === 'cannot') {
    let text = clean(spec.text)
    if (!text || hasFigure(text)) {
      if (text) note('The model wrote a figure in its answer, so the code wrote this one.', 'warning')
      text = reply === 'clarify'
        ? 'Which figure and which period do you want to see?'
        : 'This data does not hold what the question asks for.'
    }
    const options = (Array.isArray(spec.options) ? spec.options : []).map(clean).filter(o => o && o.length <= 90).slice(0, 3)
    return { reply, text, options, notes }
  }

  // The scope: every value from its list, or the one already on screen, or all.
  const s = spec.scope && typeof spec.scope === 'object' ? spec.scope : {}
  const base = current?.scope || { period: 'last-12-months', region: 'all', country: 'all', product: 'all', category: 'all', compare: 'previous' }
  const scope = {
    period: pick(s.period, PERIODS.map(p => p.id), base.period),
    region: pick(s.region, all(REGIONS.map(r => r.id)), 'all'),
    country: pick(s.country, all(COUNTRIES.map(c => c.code)), 'all'),
    product: pick(s.product, all(PRODUCTS.map(p => p.id)), 'all'),
    category: pick(s.category, all(CATEGORIES.map(c => c.id)), 'all'),
    compare: pick(s.compare, ['previous', 'last-year', 'none'], 'previous'),
  }
  if (scope.country !== 'all' && scope.region !== 'all' && COUNTRY_BY_CODE[scope.country].region !== scope.region) {
    note(`${COUNTRY_BY_CODE[scope.country].name} is not in ${REGION_BY_ID[scope.region].name}, so the code kept the country and dropped the region.`)
    scope.region = 'all'
  }
  if (scope.country !== 'all') scope.region = 'all'
  if (scope.product !== 'all' && scope.category !== 'all' && PRODUCT_BY_ID[scope.product].category !== scope.category) {
    note(`${PRODUCT_BY_ID[scope.product].name} is not in ${CATEGORY_BY_ID[scope.category].name}, so the code kept the product.`)
  }
  if (scope.product !== 'all') scope.category = 'all'
  const r = resolveScope(scope)
  // The whole data has nothing before it, so a comparison there is dropped without a note.
  if (scope.compare !== 'none' && !r.before && scope.period === 'all') scope.compare = 'none'
  if (scope.compare !== 'none' && !r.before) {
    note(`The data starts on ${fmtDate(START)}, so there is nothing to compare ${r.name} with. The code left the comparison out.`)
    scope.compare = 'none'
  }
  const byProduct = scope.product !== 'all' || scope.category !== 'all'

  // A split by the place or product already chosen shows one item. Inside a region, split by country.
  const unsold = new Set()
  const narrow = by => (by === 'region' && scope.region !== 'all' ? 'country' : by)
  const singleOf = by => ((by === 'region' || by === 'country') && scope.country !== 'all'
    ? COUNTRY_BY_CODE[scope.country].name
    : by === 'product' && scope.product !== 'all' ? PRODUCT_BY_ID[scope.product].name
      : by === 'category' && byProduct ? productName(scope) : null)
  // Metrics not counted per product leave when the scope or the split is by product.
  const soldOnly = (metrics, splitByProduct) => {
    if (!byProduct && !splitByProduct) return metrics
    metrics.filter(m => !METRICS[m].sold).forEach(m => unsold.add(m))
    return metrics.filter(m => METRICS[m].sold)
  }
  const metricsOf = w0 => [...new Set((Array.isArray(w0.metrics) && w0.metrics.length ? w0.metrics : [w0.metric]).filter(m => METRIC_IDS.includes(m)))]

  // The widgets, one at a time.
  const widgets = []
  const seen = new Set()
  let asked = 0
  for (const w0 of Array.isArray(spec.widgets) ? spec.widgets : []) {
    if (!w0 || !KINDS.includes(w0.kind)) continue
    asked += 1
    let w
    if (w0.kind === 'figures') {
      let metrics = soldOnly(metricsOf(w0), false)
      if (!metrics.length) continue
      if (metrics.length > 4) { note('Key figures hold four at most, so the code kept the first four.'); metrics = metrics.slice(0, 4) }
      w = { kind: 'figures', metrics }
    } else if (w0.kind === 'trend' || w0.kind === 'breakdown') {
      const metric = pick(w0.metric, METRIC_IDS, 'revenue')
      let by = pick(w0.by, w0.kind === 'trend' ? ['none', ...SPLITS] : SPLITS, w0.kind === 'trend' ? 'none' : 'region')
      if (w0.kind === 'trend' && by === 'country') by = 'region'
      if (!METRICS[metric].sold && (byProduct || by === 'product' || by === 'category')) { unsold.add(metric); continue }
      by = narrow(by)
      const single = singleOf(by)
      if (single) {
        note(`${capital(lower(metric))} by ${SPLIT_NAME[by]} would show ${single} alone, so the code left it out.`)
        continue
      }
      if (METRICS[metric].ratio && w0.kind === 'trend' && by !== 'none') {
        note(`${METRICS[metric].name} cannot be stacked, so the code drew it as one line.`)
        by = 'none'
      }
      w = { kind: w0.kind, metric, by }
    } else if (w0.kind === 'table') {
      const by = narrow(pick(w0.by, SPLITS, 'country'))
      let metrics = soldOnly(metricsOf(w0), by === 'product' || by === 'category')
      if (!metrics.length) continue
      const single = singleOf(by)
      if (single) { note(`A table of ${PLURAL[by]} would show ${single} alone, so the code left it out.`); continue }
      if (metrics.length > 4) { note('A table holds four figures at most, so the code kept the first four.'); metrics = metrics.slice(0, 4) }
      w = { kind: 'table', by, metrics }
    } else if (w0.kind === 'scatter') {
      const x = pick(w0.x, AXES, 'revenue')
      let y = pick(w0.y, AXES, 'growth')
      if (y === x) y = x === 'growth' ? 'revenue' : 'growth'
      const by = pick(w0.by, ['country', 'product'], 'country')
      const used = [x, y].filter(a => a !== 'growth')
      if (soldOnly(used, by === 'product').length < used.length) continue
      const single = singleOf(by)
      if (single) { note(`A scatter of ${PLURAL[by]} would show ${single} alone, so the code left it out.`); continue }
      if ((x === 'growth' || y === 'growth') && r.from - r.days < 0) {
        note(`Growth needs the same number of days before ${r.name}, and the data starts on ${fmtDate(START)}, so the code left the scatter out.`)
        continue
      }
      w = { kind: 'scatter', x, y, by }
    } else if (w0.kind === 'mix') {
      const metric = pick(w0.metric, ['revenue', 'orders'], 'revenue')
      if (METRIC_IDS.includes(w0.metric) && w0.metric !== metric) note(`A mix shows shares of a total, and ${lower(w0.metric)} is not one, so the code used revenue.`)
      const by = narrow(pick(w0.by, ['region', 'country'], 'region'))
      let then = pick(w0.then, ['product', 'category'], 'product')
      if (then === 'category' && scope.category !== 'all') then = 'product'
      const single = singleOf(by) || singleOf(then)
      if (single) { note(`${METRICS[metric].name} by ${SPLIT_NAME[by]} and ${SPLIT_NAME[then]} would show ${single} alone, so the code left it out.`); continue }
      w = { kind: 'mix', metric, by, then }
    } else if (w0.kind === 'calendar') {
      const metric = pick(w0.metric, METRIC_IDS, 'revenue')
      if (!soldOnly([metric], false).length) continue
      w = { kind: 'calendar', metric }
    } else if (w0.kind === 'customers') {
      const by = narrow(pick(w0.by, ['segment', 'plan', 'region', 'country'], 'segment'))
      const single = singleOf(by)
      if (single) { note(`Accounts by ${SPLIT_NAME[by]} would show ${single} alone, so the code left it out.`); continue }
      w = { kind: 'customers', by }
    } else if (w0.kind === 'sizes') {
      w = { kind: 'sizes' }
    } else if (w0.kind === 'funnel') {
      if (byProduct) { note('The funnel starts from site visits, which are not counted per product, so the code left it out.'); continue }
      w = { kind: 'funnel' }
    } else if (w0.kind === 'hours') {
      w = { kind: 'hours' }
    } else {
      w = { kind: 'accounts', sort: pick(w0.sort, SORTS, 'revenue') }
    }
    const key = widgetKey(w)
    if (seen.has(key)) { asked -= 1; continue }
    seen.add(key)
    widgets.push(w)
  }
  if (unsold.size) {
    const names = [...unsold].map(lower)
    const joined = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]
    note(`The data does not count ${joined} per product, so the code left ${names.length > 1 || METRICS[[...unsold][0]].plural ? 'them' : 'it'} out.`)
  }
  if (widgets.length > MAX_WIDGETS) {
    note(`A dashboard here holds ${fmtInt(MAX_WIDGETS)} widgets at most, so the code kept the first ${fmtInt(MAX_WIDGETS)}.`)
    widgets.length = MAX_WIDGETS
  }
  if (!widgets.length) {
    return { reply: 'cannot', text: 'None of the views the model chose can be drawn from this data, so nothing changed.', options: [], notes }
  }

  // A title that names a view the code cut would promise what is not on screen, so the code writes it.
  let title = clean(spec.title)
  if (title && widgets.length < asked) title = ''
  if (!title || title.length > 70 || hasFigure(title)) {
    if (title) note('The model put a figure in its title, so the code wrote the title.', 'warning')
    title = widgets.length === 1 && widgets[0].kind !== 'figures' ? `${widgetName(widgets[0])}, ${r.name}` : `${placeName(scope)}, ${r.name}`
    title = capital(title)
  }
  return { reply: 'dashboard', title, scope, widgets, notes }
}

/* What changed between two dashboards, in sentences, for a follow-up. */

export function changes(before, after) {
  if (!before) return []
  const out = []
  const a = before.scope
  const b = after.scope
  if (a.period !== b.period) out.push(`Changed the period to ${PERIOD_BY_ID[b.period].name}.`)
  if (a.region !== b.region || a.country !== b.country) out.push(b.region === 'all' && b.country === 'all' ? 'Widened the place to all countries.' : `Narrowed the place to ${placeName(b)}.`)
  if (a.product !== b.product || a.category !== b.category) out.push(productName(b) ? `Narrowed the products to ${productName(b)}.` : 'Widened to all products.')
  if (a.compare !== b.compare) out.push(b.compare === 'none' ? 'Took the comparison away.' : b.compare === 'last-year' ? 'Compared with the same days a year before.' : 'Compared with the days just before.')
  const keysA = new Set(before.widgets.map(widgetKey))
  const keysB = new Set(after.widgets.map(widgetKey))
  after.widgets.filter(w => !keysA.has(widgetKey(w))).forEach(w => out.push(`Added ${widgetNoun(w)}.`))
  before.widgets.filter(w => !keysB.has(widgetKey(w))).forEach(w => out.push(`Removed ${widgetNoun(w)}.`))
  return out
}
