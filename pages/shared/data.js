// Template data. One seeded, deterministic set of generic business figures that every template
// page reads: two years of daily revenue, orders, visitors, signups and active users per country,
// the product mix, 480 customer accounts with their monthly revenue and timelines, a self-serve
// funnel and orders by weekday and hour. No page types a figure: it asks these functions and
// formats the answer with src/format.js.
//
// The same seed gives the same numbers on every load and on every machine, so screenshots compare.
// Each part draws from its own random stream, so adding a field to accounts never moves the daily
// figures.

const SEED = 20260930

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const stream = key => {
  let h = SEED
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 2654435761)
  return mulberry32(h)
}
const gauss = rnd => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())
const pick = (rnd, list) => list[Math.floor(rnd() * list.length)]
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const weighted = (rnd, weights) => {
  let r = rnd() * weights.reduce((s, w) => s + w, 0)
  for (let i = 0; i < weights.length; i += 1) { r -= weights[i]; if (r < 0) return i }
  return weights.length - 1
}

/* Time. Days are counted from START and read from ISO text, so the viewer's time zone never moves
   a figure to another day. Weeks start on Monday. */

export const START = '2024-10-01'
export const TODAY = '2026-09-30'
const DAY_MS = 86400000
const T0 = Date.parse(`${START}T00:00:00Z`)
export const dayOf = iso => Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - T0) / DAY_MS)
export const isoOf = d => new Date(T0 + d * DAY_MS).toISOString().slice(0, 10)
export const weekdayOf = d => (new Date(T0 + d * DAY_MS).getUTCDay() + 6) % 7
export const LAST = dayOf(TODAY)
export const N_DAYS = LAST + 1
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const WEEKDAYS_LONG = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The 24 calendar months in the data, oldest first. YEAR is the last twelve.
export const MONTHS = []
for (let d = 0; d <= LAST;) {
  const iso = isoOf(d)
  const y = +iso.slice(0, 4)
  const m = +iso.slice(5, 7)
  const next = dayOf(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`)
  MONTHS.push({ id: iso.slice(0, 7), from: d, to: Math.min(LAST, next - 1), label: MONTH_NAMES[m - 1], long: `${MONTH_NAMES[m - 1]} ${y}` })
  d = next
}
export const YEAR = MONTHS.slice(-12)

/* Places and products */

export const REGIONS = [
  { id: 'na', name: 'North America', growth: 0.16 },
  { id: 'eu', name: 'Europe', growth: 0.23 },
  { id: 'apac', name: 'Asia Pacific', growth: 0.38 },
  { id: 'latam', name: 'Latin America', growth: 0.07 },
]
export const REGION_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]))

// weight is the country's share of orders at the start, aov its average order value in euros.
export const COUNTRIES = [
  { code: 'US', name: 'United States', region: 'na', weight: 30, aov: 312 },
  { code: 'CA', name: 'Canada', region: 'na', weight: 7, aov: 268 },
  { code: 'DE', name: 'Germany', region: 'eu', weight: 9, aov: 284 },
  { code: 'GB', name: 'United Kingdom', region: 'eu', weight: 8, aov: 276 },
  { code: 'FR', name: 'France', region: 'eu', weight: 6, aov: 251 },
  { code: 'NL', name: 'Netherlands', region: 'eu', weight: 4, aov: 297 },
  { code: 'ES', name: 'Spain', region: 'eu', weight: 3, aov: 214 },
  { code: 'SE', name: 'Sweden', region: 'eu', weight: 2.5, aov: 305 },
  { code: 'JP', name: 'Japan', region: 'apac', weight: 6, aov: 331 },
  { code: 'AU', name: 'Australia', region: 'apac', weight: 5, aov: 289 },
  { code: 'SG', name: 'Singapore', region: 'apac', weight: 3, aov: 347 },
  { code: 'IN', name: 'India', region: 'apac', weight: 4, aov: 142 },
  { code: 'BR', name: 'Brazil', region: 'latam', weight: 4, aov: 188 },
  { code: 'MX', name: 'Mexico', region: 'latam', weight: 3, aov: 176 },
  { code: 'CL', name: 'Chile', region: 'latam', weight: 1.5, aov: 203 },
  { code: 'AR', name: 'Argentina', region: 'latam', weight: 1.2, aov: 164 },
]
export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map(c => [c.code, c]))

export const CATEGORIES = [
  { id: 'software', name: 'Software' },
  { id: 'hardware', name: 'Hardware' },
  { id: 'services', name: 'Services' },
]
// mix is the product's share of revenue at the start, drift how much that share moves over the
// two years (Insights grows, the sensor kit shrinks).
export const PRODUCTS = [
  { id: 'core', name: 'Core platform', short: 'Core', category: 'software', mix: 0.34, drift: 0.0 },
  { id: 'insights', name: 'Insights add-on', short: 'Insights', category: 'software', mix: 0.13, drift: 0.07 },
  { id: 'sensor', name: 'Sensor kit', short: 'Sensors', category: 'hardware', mix: 0.19, drift: -0.1 },
  { id: 'gateway', name: 'Gateway', short: 'Gateway', category: 'hardware', mix: 0.11, drift: -0.01 },
  { id: 'onboarding', name: 'Onboarding', short: 'Onboarding', category: 'services', mix: 0.09, drift: 0.0 },
  { id: 'support', name: 'Premium support', short: 'Support', category: 'services', mix: 0.14, drift: 0.015 },
]
export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]))

/* Moments that shape the daily figures. The line chart marks them. */

export const MOMENTS = [
  { iso: '2024-11-29', days: [1.7, 1.45, 1.25, 1.5], name: 'Black Friday week' },
  { iso: '2025-11-28', days: [1.75, 1.5, 1.3, 1.55], name: 'Black Friday week' },
  { iso: '2026-03-11', days: [0.41, 0.86], name: 'Checkout outage' },
  { iso: '2026-06-16', days: [1.85, 1.6, 1.35, 1.15], name: 'Summer promotion' },
].map(m => ({ ...m, day: dayOf(m.iso) }))

/* Daily series, per country and day. revenue in euros; orders, visitors, signups and active
   users as counts. */

export const METRICS = ['revenue', 'orders', 'visitors', 'signups', 'users']
const C = COUNTRIES.length
const SERIES = Object.fromEntries(METRICS.map(m => [m, new Float64Array(C * N_DAYS)]))
const WEIGHT_SUM = COUNTRIES.reduce((s, c) => s + c.weight, 0)
const WD_ORDERS = [1.04, 1.09, 1.07, 1.05, 0.97, 0.72, 0.66]
const WD_USERS = [1.08, 1.1, 1.09, 1.07, 1.0, 0.58, 0.52]
const eventFactor = new Float64Array(N_DAYS).fill(1)
MOMENTS.forEach(m => m.days.forEach((f, i) => { if (m.day + i <= LAST) eventFactor[m.day + i] = f }))
{
  const rnd = stream('daily')
  COUNTRIES.forEach((c, ci) => {
    const growth = REGION_BY_ID[c.region].growth + 0.06 * gauss(rnd)
    const conv = 0.031 * (0.8 + 0.4 * rnd())
    const share = c.weight / WEIGHT_SUM
    for (let d = 0; d <= LAST; d += 1) {
      const t = d / 365
      const iso = isoOf(d)
      const month = +iso.slice(5, 7)
      // A year-end peak and, in Europe, a quiet August.
      const season = 1 + 0.11 * Math.cos((2 * Math.PI * (month - 12)) / 12) * (c.region === 'latam' ? 0.5 : 1)
      const august = c.region === 'eu' && month === 8 ? 0.84 : 1
      const wd = weekdayOf(d)
      const i = ci * N_DAYS + d
      const orders = Math.max(0, Math.round(118 * share * (1 + growth) ** t * WD_ORDERS[wd] * season * august * eventFactor[d] * (1 + 0.1 * gauss(rnd))))
      SERIES.orders[i] = orders
      SERIES.revenue[i] = Math.round(orders * c.aov * 1.04 ** t * (1 + 0.06 * gauss(rnd)) * 100) / 100
      const visitors = Math.round((orders / conv) * (1 + 0.08 * gauss(rnd)))
      SERIES.visitors[i] = Math.max(orders, visitors)
      SERIES.signups[i] = Math.max(0, Math.round(visitors * 0.0105 * (1 + 0.15 * gauss(rnd))))
      SERIES.users[i] = Math.round(9400 * share * (1 + growth * 0.8) ** t * WD_USERS[wd] * (1 + 0.04 * gauss(rnd)))
    }
  })
}

// Each country sells a slightly different mix, and the mix drifts over time the same way everywhere.
const MIX = (() => {
  const rnd = stream('mix')
  return COUNTRIES.map(() => PRODUCTS.map(p => p.mix * (0.75 + 0.5 * rnd())))
})()
const MIX_SUM = MIX.map(row => row.reduce((s, v) => s + v, 0))
const DRIFT_SUM = PRODUCTS.reduce((s, p) => s + p.drift, 0)
const productShare = (ci, d, pi) => {
  const t = d / N_DAYS
  return (MIX[ci][pi] + PRODUCTS[pi].drift * t) / (MIX_SUM[ci] + DRIFT_SUM * t)
}

/* Queries. A filter is { from, to, region, country, product, category }, all optional; from and to
   are day numbers (dayOf). Visitors, signups and users are not sold per product, so a product or
   category filter leaves them whole. */

const SOLD = new Set(['revenue', 'orders'])
const countryIdx = f => COUNTRIES.map((c, i) => i).filter(i =>
  (!f.region || COUNTRIES[i].region === f.region) && (!f.country || COUNTRIES[i].code === f.country))
const productIdx = f => PRODUCTS.map((p, i) => i).filter(i =>
  (!f.product || PRODUCTS[i].id === f.product) && (!f.category || PRODUCTS[i].category === f.category))

// Calls back with (countryIndex, day, value) for every cell the filter keeps.
function each(metric, f, cb) {
  const from = Math.max(0, f.from ?? 0)
  const to = Math.min(LAST, f.to ?? LAST)
  const s = SERIES[metric]
  const byProduct = SOLD.has(metric) && (f.product || f.category)
  const pis = byProduct ? productIdx(f) : null
  for (const ci of countryIdx(f)) {
    for (let d = from; d <= to; d += 1) {
      let v = s[ci * N_DAYS + d]
      if (byProduct) v *= pis.reduce((a, pi) => a + productShare(ci, d, pi), 0)
      cb(ci, d, v)
    }
  }
}

export function sum(metric, f = {}) {
  let t = 0
  each(metric, f, (ci, d, v) => { t += v })
  return t
}

// One value per day from f.from to f.to.
export function daily(metric, f = {}) {
  const from = Math.max(0, f.from ?? 0)
  const out = new Array(Math.min(LAST, f.to ?? LAST) - from + 1).fill(0)
  each(metric, f, (ci, d, v) => { out[d - from] += v })
  return out
}

// Totals split by 'region', 'country', 'product' or 'category', as a Map of id to value in the
// order of the lists above.
export function split(metric, by, f = {}) {
  const ids = { region: REGIONS.map(r => r.id), country: COUNTRIES.map(c => c.code), product: PRODUCTS.map(p => p.id), category: CATEGORIES.map(c => c.id) }[by]
  const out = new Map(ids.map(id => [id, 0]))
  if (by === 'product' || by === 'category') {
    if (!SOLD.has(metric)) throw new Error(`${metric} is not sold per product`)
    const pis = productIdx(f)
    each(metric, { ...f, product: null, category: null }, (ci, d, v) => {
      pis.forEach(pi => {
        const key = by === 'product' ? PRODUCTS[pi].id : PRODUCTS[pi].category
        out.set(key, out.get(key) + v * productShare(ci, d, pi))
      })
    })
    return out
  }
  each(metric, f, (ci, d, v) => {
    const key = by === 'region' ? COUNTRIES[ci].region : COUNTRIES[ci].code
    out.set(key, out.get(key) + v)
  })
  return out
}

// One value per calendar month the filter touches, as [{ month, value }].
export const monthly = (metric, f = {}) => MONTHS
  .filter(m => m.to >= (f.from ?? 0) && m.from <= (f.to ?? LAST))
  .map(m => ({ month: m, value: sum(metric, { ...f, from: Math.max(m.from, f.from ?? 0), to: Math.min(m.to, f.to ?? LAST) }) }))

/* Orders by weekday and hour. Weekdays peak mid-morning and mid-afternoon, weekends around noon
   and in the evening. Each slot keeps a fixed small difference so the grid is not too smooth. */

const HOUR_SHAPES = (() => {
  const rnd = stream('hours')
  const bump = (h, at, width) => Math.exp(-(((h - at) / width) ** 2))
  return WEEKDAYS.map((_, wd) => {
    const weekend = wd >= 5
    const raw = Array.from({ length: 24 }, (_, h) => (0.05 + (weekend
      ? 0.8 * bump(h, 12, 3) + 0.6 * bump(h, 20, 2)
      : bump(h, 10.5, 2) + 0.85 * bump(h, 14.5, 2.2) + 0.25 * bump(h, 20, 1.5))) * (0.9 + 0.2 * rnd()))
    const total = raw.reduce((s, v) => s + v, 0)
    return raw.map(v => v / total)
  })
})()

// Orders as a 7 by 24 grid, Monday first, for the days and places in f.
export function hourly(f = {}) {
  const byDay = daily('orders', f)
  const from = Math.max(0, f.from ?? 0)
  const grid = WEEKDAYS.map(() => new Array(24).fill(0))
  byDay.forEach((n, i) => {
    const wd = weekdayOf(from + i)
    for (let h = 0; h < 24; h += 1) grid[wd][h] += n * HOUR_SHAPES[wd][h]
  })
  return grid
}

/* The self-serve funnel, from a visit to a renewal. Rates differ a little by country. */

const FUNNEL_RATES = (() => {
  const rnd = stream('funnel')
  return COUNTRIES.map(() => ({ trial: 0.44 * (0.85 + 0.3 * rnd()), paid: 0.31 * (0.8 + 0.4 * rnd()), renew: 0.78 * (0.92 + 0.12 * rnd()) }))
})()
export const FUNNEL_STAGES = [
  { id: 'visited', name: 'Visited the site' },
  { id: 'signed', name: 'Signed up' },
  { id: 'trial', name: 'Started a trial' },
  { id: 'paid', name: 'Became a customer' },
  { id: 'renewed', name: 'Renewed' },
]
export function funnel(f = {}) {
  const out = { visited: 0, signed: 0, trial: 0, paid: 0, renewed: 0 }
  countryIdx(f).forEach(ci => {
    const one = { ...f, region: null, country: COUNTRIES[ci].code }
    const r = FUNNEL_RATES[ci]
    const visited = sum('visitors', one)
    const signed = sum('signups', one)
    out.visited += visited
    out.signed += signed
    out.trial += signed * r.trial
    out.paid += signed * r.trial * r.paid
    out.renewed += signed * r.trial * r.paid * r.renew
  })
  return FUNNEL_STAGES.map(s => ({ ...s, value: Math.round(out[s.id]) }))
}

/* People */

export const USER = { name: 'Jordan Lee', initials: 'JL', email: 'jordan.lee@example.com', org: 'Example Co.' }
export const TEAM = [
  { id: 'mc', name: 'Maya Chen', initials: 'MC', role: 'Account manager' },
  { id: 'tb', name: 'Tom Becker', initials: 'TB', role: 'Account manager' },
  { id: 'pn', name: 'Priya Nair', initials: 'PN', role: 'Account manager' },
  { id: 'lo', name: 'Luis Ortega', initials: 'LO', role: 'Account manager' },
  { id: 'hs', name: 'Hana Sato', initials: 'HS', role: 'Customer success' },
  { id: 'en', name: 'Ella Novak', initials: 'EN', role: 'Customer success' },
]
export const TEAM_BY_ID = Object.fromEntries(TEAM.map(p => [p.id, p]))

/* Accounts. 480 customer companies over the last twelve months. Their revenue adds up to the daily
   series: each country's revenue in a month is shared among its accounts by size and trend. */

export const SEGMENTS = [
  { id: 'enterprise', name: 'Enterprise', plan: 'Scale' },
  { id: 'mid', name: 'Mid-market', plan: 'Plus' },
  { id: 'smb', name: 'Small business', plan: 'Core' },
]
export const SEGMENT_BY_ID = Object.fromEntries(SEGMENTS.map(s => [s.id, s]))
export const PLANS = ['Core', 'Plus', 'Scale']
export const STATUSES = ['Active', 'New', 'At risk', 'Paused']

const NAME_A = ['Harbor', 'Summit', 'Bluefin', 'Cedar', 'Granite', 'Lumen', 'Meridian', 'Orchid', 'Pioneer', 'Quarry', 'Redwood', 'Silverline', 'Tidewater', 'Vantage', 'Willow', 'Beacon', 'Copper', 'Fairway', 'Highland', 'Ironwood', 'Juniper', 'Keystone', 'Lakeside', 'Maple', 'Nimbus', 'Oakridge', 'Pinnacle', 'Riverstone', 'Trillium', 'Upland', 'Verdant', 'Westbrook', 'Yardley', 'Zephyr', 'Alder', 'Birch', 'Coral', 'Driftwood', 'Ember', 'Foxglove']
const NAME_B = ['Logistics', 'Foods', 'Health', 'Energy', 'Labs', 'Retail', 'Systems', 'Freight', 'Studios', 'Partners', 'Supply', 'Clinics', 'Motors', 'Media', 'Hotels', 'Farms', 'Robotics', 'Textiles', 'Analytics', 'Builders']
const FIRST = ['Ana', 'Ben', 'Chloe', 'Daniel', 'Eva', 'Felix', 'Grace', 'Hugo', 'Iris', 'Jonas', 'Kira', 'Leo', 'Mina', 'Noah', 'Olga', 'Pablo', 'Rosa', 'Sven', 'Tara', 'Yusuf']
const LAST_NAMES = ['Adams', 'Berg', 'Costa', 'Duval', 'Evans', 'Fischer', 'Garcia', 'Hoffmann', 'Ito', 'Jensen', 'Kowalski', 'Lopez', 'Moreau', 'Nakamura', 'Olsen', 'Patel', 'Rossi', 'Silva', 'Tanaka', 'Weber']

export const ACCOUNTS = (() => {
  const rnd = stream('accounts')
  const used = new Set()
  const list = []
  for (let i = 0; i < 480; i += 1) {
    let name
    do { name = `${pick(rnd, NAME_A)} ${pick(rnd, NAME_B)}` } while (used.has(name))
    used.add(name)
    const ci = weighted(rnd, COUNTRIES.map(c => c.weight))
    const segIdx = weighted(rnd, [12, 33, 55])
    const segment = SEGMENTS[segIdx]
    const size = [9, 2.4, 0.55][segIdx] * Math.exp(0.45 * gauss(rnd))
    // Most accounts grow a little; about one in eight shrinks month after month.
    const trend = rnd() < 0.12 ? -0.05 - 0.07 * rnd() : 0.01 + 0.025 * gauss(rnd)
    const joinsInYear = rnd() < 0.14
    const startMonth = joinsInYear ? 1 + Math.floor(rnd() * 11) : 0
    const since = joinsInYear
      ? isoOf(YEAR[startMonth].from + Math.floor(rnd() * (YEAR[startMonth].to - YEAR[startMonth].from + 1)))
      : isoOf(YEAR[0].from - 1 - Math.floor(rnd() * 1700))
    const weights = YEAR.map((m, k) => (k < startMonth ? 0 : size * (1 + trend) ** k * Math.exp(0.18 * gauss(rnd))))
    // Bigger companies place bigger orders, and each account has its own habit around that.
    const orderSize = [1.6, 1.1, 0.8][segIdx] * Math.exp(0.28 * gauss(rnd))
    const risk = clamp(1 / (1 + Math.exp(-(-2.6 - trend * 25 + 0.7 * gauss(rnd)))), 0.005, 0.95)
    const paused = rnd() < 0.03
    const productCount = 1 + weighted(rnd, segIdx === 0 ? [1, 2, 3, 3] : segIdx === 1 ? [3, 3, 2, 1] : [6, 3, 1, 0])
    const products = []
    while (products.length < productCount) {
      const p = PRODUCTS[weighted(rnd, PRODUCTS.map(x => x.mix))].id
      if (!products.includes(p)) products.push(p)
    }
    if (!products.includes('core') && rnd() < 0.7) products[0] = 'core'
    const lastAgo = risk > 0.4 ? 14 + Math.floor(rnd() * 60) : Math.floor(rnd() * 12)
    list.push({
      id: `AC-${1001 + i}`,
      name,
      country: COUNTRIES[ci].code,
      region: COUNTRIES[ci].region,
      segment: segment.id,
      plan: segIdx === 2 && rnd() < 0.25 ? 'Plus' : segIdx === 1 && rnd() < 0.2 ? 'Scale' : segment.plan,
      owner: TEAM[Math.floor(rnd() * TEAM.length)].id,
      contact: `${pick(rnd, FIRST)} ${pick(rnd, LAST_NAMES)}`,
      seats: Math.round([200 + rnd() * 1800, 40 + rnd() * 210, 3 + rnd() * 37][segIdx]),
      since,
      products,
      trend,
      risk,
      lastOrder: isoOf(LAST - lastAgo),
      status: paused ? 'Paused' : risk > 0.4 ? 'At risk' : dayOf(since) > LAST - 90 ? 'New' : 'Active',
      _ci: ci,
      _weights: weights,
      _orderWeights: weights.map(w => w / orderSize),
    })
  }
  // Share each country's monthly revenue and orders among its accounts.
  COUNTRIES.forEach((c, ci) => {
    const mine = list.filter(a => a._ci === ci)
    YEAR.forEach((m, k) => {
      const total = mine.reduce((s, a) => s + a._weights[k], 0) || 1
      const totalOrders = mine.reduce((s, a) => s + a._orderWeights[k], 0) || 1
      const rev = sum('revenue', { country: c.code, from: m.from, to: m.to })
      const ord = sum('orders', { country: c.code, from: m.from, to: m.to })
      mine.forEach(a => {
        a.monthly = a.monthly || []
        a.monthlyOrders = a.monthlyOrders || []
        a.monthly[k] = Math.round((rev * a._weights[k]) / total * 100) / 100
        a.monthlyOrders[k] = Math.round((ord * a._orderWeights[k]) / totalOrders)
      })
    })
  })
  return list.map(({ _ci, _weights, _orderWeights, ...a }) => ({
    ...a,
    revenue: a.monthly.reduce((s, v) => s + v, 0),
    orders: a.monthlyOrders.reduce((s, v) => s + v, 0),
    // The last three months against the three before, for a change figure.
    change: (() => {
      const recent = a.monthly.slice(9).reduce((s, v) => s + v, 0)
      const before = a.monthly.slice(6, 9).reduce((s, v) => s + v, 0)
      return before ? recent / before - 1 : null
    })(),
  }))
})()
export const ACCOUNT_BY_ID = new Map(ACCOUNTS.map(a => [a.id, a]))

/* An account's timeline, newest first, built from its own seed when asked for. Each event is
   { at, kind, title, detail, amount?, by? }; kind is one of order, invoice, plan, ticket, note,
   seats, joined. */

const TICKETS = ['Cannot export the monthly report', 'Question about invoice lines', 'Gateway drops connection at night', 'Add two admins to the workspace', 'Sensor readings arrive late', 'Single sign-on setup', 'Data retention settings']
const NOTES = ['Quarterly review held, next one booked.', 'Asked about volume pricing for next year.', 'New finance contact, invoices go to them from now on.', 'Interested in the Insights add-on after the demo.', 'Budget freeze until the new fiscal year.', 'Rollout to a second site is planned.']

export function eventsOf(id) {
  const a = ACCOUNT_BY_ID.get(id)
  if (!a) return []
  const rnd = stream(`events:${id}`)
  const at = (day, h0 = 8, h1 = 18) => `${isoOf(Math.min(day, LAST))}T${String(h0 + Math.floor(rnd() * (h1 - h0))).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`
  const inMonth = k => YEAR[k].from + Math.floor(rnd() * (YEAR[k].to - YEAR[k].from + 1))
  const owner = TEAM_BY_ID[a.owner]
  const out = []
  out.push({ at: at(dayOf(a.since)), kind: 'joined', title: 'Account created', detail: `Signed up on the ${a.plan} plan` })
  // The largest orders of the year.
  a.monthly.map((v, k) => ({ v, k })).filter(x => x.v > 0).sort((x, y) => y.v - x.v).slice(0, 5).forEach(({ v, k }) => {
    const product = PRODUCT_BY_ID[pick(rnd, a.products)]
    out.push({ at: at(inMonth(k)), kind: 'order', title: `Order for ${product.name}`, detail: `${Math.max(1, Math.round(a.monthlyOrders[k] * 0.2))} items`, amount: Math.round(v * (0.18 + 0.2 * rnd()) * 100) / 100 })
  })
  // Invoices for the last four months; an account at risk has one overdue.
  for (let k = 8; k < 12; k += 1) {
    if (!a.monthly[k]) continue
    const overdue = a.risk > 0.4 && k === 10
    out.push({ at: at(YEAR[k].to, 6, 9), kind: 'invoice', title: overdue ? 'Invoice overdue' : 'Invoice paid', detail: `${YEAR[k].long} invoice`, amount: a.monthly[k], tone: overdue ? 'danger' : null })
  }
  const tickets = 1 + Math.floor(rnd() * 3)
  for (let t = 0; t < tickets; t += 1) {
    const day = LAST - Math.floor(rnd() * 200)
    const subject = pick(rnd, TICKETS)
    out.push({ at: at(day), kind: 'ticket', title: 'Support ticket opened', detail: subject })
    if (day + 2 <= LAST) out.push({ at: at(day + 1 + Math.floor(rnd() * 3)), kind: 'ticket', title: 'Support ticket resolved', detail: subject, tone: 'success' })
  }
  const notes = 1 + Math.floor(rnd() * 2)
  for (let n = 0; n < notes; n += 1) out.push({ at: at(LAST - Math.floor(rnd() * 150)), kind: 'note', title: 'Note', detail: pick(rnd, NOTES), by: owner.name })
  if (rnd() < 0.6) out.push({ at: at(LAST - Math.floor(rnd() * 240)), kind: 'seats', title: 'Seats changed', detail: `${a.seats - Math.max(1, Math.round(a.seats * 0.15))} to ${a.seats} seats`, by: a.contact })
  if (a.plan !== SEGMENT_BY_ID[a.segment].plan) out.push({ at: at(LAST - Math.floor(rnd() * 300)), kind: 'plan', title: `Moved to ${a.plan}`, detail: `From ${SEGMENT_BY_ID[a.segment].plan}`, by: owner.name })
  return out.filter(e => e.at.slice(0, 10) >= a.since).sort((x, y) => (x.at < y.at ? 1 : -1))
}

/* The hierarchy for the tree views: revenue over the last twelve months by region, country and
   product. risk is the revenue-weighted churn risk of the accounts inside, on the same scale and
   bands as a probability. */

const node = (id, label, rule, value, orders, prior, risk, children = null) => ({ id, label, rule, value, orders, growth: prior ? value / prior - 1 : null, risk, children })

export const HIERARCHY = (() => {
  const year = { from: YEAR[0].from, to: LAST }
  const prior = { from: YEAR[0].from - 365, to: LAST - 365 }
  const riskOf = list => {
    const total = list.reduce((s, a) => s + a.revenue, 0)
    return total ? list.reduce((s, a) => s + a.revenue * a.risk, 0) / total : 0
  }
  const productNodes = (code, accts) => PRODUCTS.map(p => {
    const f = { country: code, product: p.id }
    const users = accts.filter(a => a.products.includes(p.id))
    return node(`${code}-${p.id}`, p.name, `product = ${p.name}`, sum('revenue', { ...f, ...year }), sum('orders', { ...f, ...year }), sum('revenue', { ...f, ...prior }), riskOf(users.length ? users : accts))
  }).sort((x, y) => y.value - x.value)
  const countryNodes = region => COUNTRIES.filter(c => c.region === region).map(c => {
    const accts = ACCOUNTS.filter(a => a.country === c.code)
    const f = { country: c.code }
    return node(c.code, c.name, `country = ${c.name}`, sum('revenue', { ...f, ...year }), sum('orders', { ...f, ...year }), sum('revenue', { ...f, ...prior }), riskOf(accts), productNodes(c.code, accts))
  }).sort((x, y) => y.value - x.value)
  const regions = REGIONS.map(r => {
    const f = { region: r.id }
    return node(r.id, r.name, `region = ${r.name}`, sum('revenue', { ...f, ...year }), sum('orders', { ...f, ...year }), sum('revenue', { ...f, ...prior }), riskOf(ACCOUNTS.filter(a => a.region === r.id)), countryNodes(r.id))
  }).sort((x, y) => y.value - x.value)
  return node('root', 'All revenue', 'last 12 months', sum('revenue', year), sum('orders', year), sum('revenue', prior), riskOf(ACCOUNTS), regions)
})()

// Lookups over the hierarchy.
export const byId = new Map()
export const parentOf = new Map()
export const depthOf = new Map()
export const flat = []
;(function walk(n, parent, depth) {
  byId.set(n.id, n)
  parentOf.set(n.id, parent)
  depthOf.set(n.id, depth)
  flat.push(n)
  ;(n.children || []).forEach(c => walk(c, n, depth + 1))
})(HIERARCHY, null, 0)
export function pathTo(id) {
  const out = []
  for (let n = byId.get(id); n; n = parentOf.get(n.id)) out.unshift(n)
  return out
}

/* Counts the shell shows: what waits for the user, and inventory for the submenu headings. */

export const counts = {
  accounts: ACCOUNTS.length,
  atRisk: ACCOUNTS.filter(a => a.status === 'At risk').length,
  newAccounts: ACCOUNTS.filter(a => a.status === 'New').length,
  countries: COUNTRIES.length,
  products: PRODUCTS.length,
}
