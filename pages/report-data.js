// The report's content: a quarterly business review for Q3 2026, written from the figures in
// shared/data.js, so every number in the text is computed and formatted, never typed. Earlier
// wordings feed the seeded version history.
import { fmtInt, fmtEur, fmtEurRound, fmtPct, fmtDelta, fmtDate } from '../src/format.js'
import { sum, split, dayOf, REGIONS, REGION_BY_ID, PRODUCTS, PRODUCT_BY_ID, ACCOUNTS, TEAM_BY_ID, USER, COUNTRIES, N_DAYS } from './shared/data.js'

export const Q = { from: dayOf('2026-07-01'), to: dayOf('2026-09-30'), name: 'Q3 2026' }
export const LY = { from: dayOf('2025-07-01'), to: dayOf('2025-09-30'), name: 'Q3 2025' }
export const PQ = { from: dayOf('2026-04-01'), to: dayOf('2026-06-30'), name: 'Q2 2026' }

const rev = w => sum('revenue', w)
const change = (a, b) => (b ? a / b - 1 : 0)
const revenue = rev(Q)
const orders = sum('orders', Q)
const visits = sum('visitors', Q)
const vsLY = change(revenue, rev(LY))
const vsPQ = change(revenue, rev(PQ))
const convNow = orders / visits
const convLY = sum('orders', LY) / sum('visitors', LY)

const byRegion = REGIONS.map(r => {
  const now = rev({ ...Q, region: r.id })
  return { ...r, now, before: rev({ ...LY, region: r.id }), share: now / revenue, growth: change(now, rev({ ...LY, region: r.id })) }
})
const nowByProduct = split('revenue', 'product', Q)
const lyByProduct = split('revenue', 'product', LY)
const byProduct = PRODUCTS.map(p => ({ ...p, now: nowByProduct.get(p.id), before: lyByProduct.get(p.id), growth: change(nowByProduct.get(p.id), lyByProduct.get(p.id)) }))
const fastRegion = [...byRegion].sort((a, b) => b.growth - a.growth)[0]
const slowRegion = [...byRegion].sort((a, b) => a.growth - b.growth)[0]
const fastProduct = [...byProduct].sort((a, b) => b.growth - a.growth)[0]
const slowProduct = [...byProduct].sort((a, b) => a.growth - b.growth)[0]
const risky = ACCOUNTS.filter(a => a.status === 'At risk').sort((a, b) => b.revenue - a.revenue)
const riskyRevenue = risky.reduce((s, a) => s + a.revenue, 0)
const yearRevenue = ACCOUNTS.reduce((s, a) => s + a.revenue, 0)
const fresh = ACCOUNTS.filter(a => a.status === 'New')
const [r1, r2, r3] = risky
// Facts the text states, each computed here so the words cannot drift from the figures.
const fastCountries = COUNTRIES.filter(c => c.region === fastRegion.id)
const fastCountriesUp = fastCountries.filter(c => change(rev({ ...Q, country: c.code }), rev({ ...LY, country: c.code })) > 0.2).length
const withFast = ACCOUNTS.filter(a => a.products.includes(fastProduct.id))
const withFastMore = withFast.filter(a => a.products.length > 1).length
const slowByRegion = REGIONS.map(r => ({ r, g: change(sum('revenue', { ...Q, region: r.id, product: slowProduct.id }), sum('revenue', { ...LY, region: r.id, product: slowProduct.id })) })).sort((a, b) => a.g - b.g)[0]
const freshCore = fresh.filter(a => a.plan === 'Core').length

export const FIGURES = { revenue, orders, visits, vsLY, vsPQ, aov: revenue / orders, convNow, convLY, byRegion, byProduct, risky, riskyRevenue, fresh }

// The accounts named in the text, for redaction: each name is replaced by its ID.
export const NAMED = risky.slice(0, 6).map(a => [a.name, a.id])

const lead = TEAM_BY_ID.pn
const author = USER.name

export const REPORT = {
  id: 'QBR-2026-Q3',
  title: 'Quarterly business review, Q3 2026',
  meta: { period: `${fmtDate('2026-07-01')} to ${fmtDate('2026-09-30')}`, author, reviewer: lead.name, updated: '2026-09-30', audience: 'Leadership team' },
  summary: [
    `Revenue reached ${fmtEurRound(revenue)} in the third quarter, ${fmtDelta(vsLY)} on the same quarter last year and ${fmtDelta(vsPQ)} on the second quarter. ${fmtInt(orders)} orders came in at an average of ${fmtEur(revenue / orders)}.`,
    `${fastRegion.name} grew fastest, ${fmtDelta(fastRegion.growth)}, and ${fastProduct.name} led the products at ${fmtDelta(fastProduct.growth)}. ${slowProduct.growth < 0 ? `${slowProduct.name} is the one product that shrank.` : `${slowProduct.name} grew slowest.`} ${fmtInt(risky.length)} accounts are at risk, holding ${fmtPct(riskyRevenue / yearRevenue)} of yearly revenue.`,
  ],
  findings: [
    {
      title: `${fastRegion.name} grows fastest`,
      text: [`${fastRegion.name} brought ${fmtEurRound(fastRegion.now)}, ${fmtDelta(fastRegion.growth)} on Q3 2025, and now makes ${fmtPct(fastRegion.share)} of revenue. ${fastCountriesUp === fastCountries.length ? `All ${fmtInt(fastCountriesUp)} of its countries` : `${fmtInt(fastCountriesUp)} of its ${fmtInt(fastCountries.length)} countries`} grew by more than a fifth.`],
      figures: [['Revenue', fmtEurRound(fastRegion.now)], ['Change', fmtDelta(fastRegion.growth)], ['Share', fmtPct(fastRegion.share)]],
      tone: 'success',
    },
    {
      title: `${fastProduct.name} is the product to watch`,
      text: [`${fastProduct.name} made ${fmtEurRound(fastProduct.now)}, ${fmtDelta(fastProduct.growth)} on the year before. ${fmtInt(withFastMore)} of the ${fmtInt(withFast.length)} accounts that use it also buy another product.`],
      figures: [['Revenue', fmtEurRound(fastProduct.now)], ['Change', fmtDelta(fastProduct.growth)], ['Share', fmtPct(fastProduct.now / revenue)]],
      tone: 'success',
    },
    {
      title: slowProduct.growth < 0 ? `${slowProduct.name} keeps shrinking` : `${slowProduct.name} lags behind`,
      text: [`${slowProduct.name} made ${fmtEurRound(slowProduct.now)}, ${fmtDelta(slowProduct.growth)} on Q3 2025. It fell furthest in ${slowByRegion.r.name}, ${fmtDelta(slowByRegion.g)}.`],
      figures: [['Revenue', fmtEurRound(slowProduct.now)], ['Change', fmtDelta(slowProduct.growth)], ['Share', fmtPct(slowProduct.now / revenue)]],
      tone: 'danger',
    },
  ],
  customers: [
    `${fmtInt(risky.length)} accounts are at risk of leaving, with ${fmtEurRound(riskyRevenue)} of yearly revenue between them. The three largest are ${r1.name}, ${r2.name} and ${r3.name}. Each has a named owner.`,
    `${fmtInt(fresh.length)} accounts joined in the last 90 days. ${fmtInt(freshCore)} of them started on the Core plan.`,
  ],
  method: [
    `Figures come from the billing system for revenue and orders, from web analytics for visits, and from the CRM for accounts, owners and churn risk. Revenue is invoiced revenue before tax, counted on the day of the order. Changes compare with the same days of the year before.`,
    `Churn risk is the probability that an account does not renew within twelve months, from a model trained on the last three years of renewals. It is shown on the same bands as every probability in the product: under ${fmtPct(0.1)}, ${fmtPct(0.1)} to ${fmtPct(0.4)}, and over ${fmtPct(0.4)}.`,
  ],
  recommendations: [
    { id: 'R1', owner: TEAM_BY_ID.hs.name, text: `Hire two account managers for ${fastRegion.name} before the first quarter, where the pipeline outgrows the team.` },
    { id: 'R2', owner: TEAM_BY_ID.mc.name, text: `Offer ${fastProduct.name} to every account on the Plus plan at renewal, with a three-month trial.` },
    { id: 'R3', owner: TEAM_BY_ID.lo.name, text: `Decide by November whether ${slowProduct.name} stays in the catalogue or moves to partners.` },
    { id: 'R4', owner: TEAM_BY_ID.en.name, text: `Call the owners of the ${fmtInt(Math.min(10, risky.length))} largest accounts at risk this month and log the outcome on each account.` },
  ],
  sources: [
    { name: 'billing_orders_2026q3.parquet', what: 'Billing system', rows: Math.round(orders) },
    { name: 'web_sessions_2026q3.parquet', what: 'Web analytics', rows: Math.round(visits) },
    { name: 'crm_accounts_2026-09-30.csv', what: 'CRM', rows: ACCOUNTS.length },
    { name: 'daily_figures_by_country.csv', what: 'Finance data warehouse', rows: N_DAYS * COUNTRIES.length },
  ],
}

// Earlier wordings, used by the seeded versions and shown in their comparison.
export const ALTERNATIVES = {
  summary: [
    [`Revenue reached ${fmtEurRound(revenue)} in Q3, up ${fmtDelta(vsLY)} on last year. ${fmtInt(orders)} orders at an average of ${fmtEur(revenue / orders)}.`,
      `${fastRegion.name} and ${fastProduct.name} drove the growth. ${slowProduct.name} ${slowProduct.growth < 0 ? 'declined' : 'lagged'}. ${fmtInt(risky.length)} accounts are at risk.`],
    [`The third quarter closed at ${fmtEurRound(revenue)} of revenue, ${fmtDelta(vsLY)} on the same quarter last year. ${fmtInt(orders)} orders came in at an average of ${fmtEur(revenue / orders)}.`,
      `${fastRegion.name} grew fastest, ${fmtDelta(fastRegion.growth)}. ${fastProduct.name} led the products and ${slowProduct.name} ${slowProduct.growth < 0 ? 'shrank' : 'lagged'}. ${fmtInt(risky.length)} accounts are at risk of leaving.`],
  ],
  method: [
    ['Figures come from the billing system, web analytics and the CRM. Revenue is invoiced revenue before tax.',
      'Churn risk comes from a renewal model trained on three years of history.'],
  ],
}

export const VERSIONS = [
  { id: 'v1', by: TEAM_BY_ID.mc, at: '2026-09-03T16:20', note: 'First draft for the regional leads.', added: ['summary', 'f1', 'f2', 'method', 'recommendations'] },
  { id: 'v2', by: TEAM_BY_ID.mc, at: '2026-09-15T11:05', note: 'Added the product finding after the September close.', added: ['f3'] },
  { id: 'v3', by: { name: USER.name, initials: USER.initials }, at: '2026-09-28T09:40', note: 'Final figures for the quarter, with the customers section.', added: ['customers'] },
]

export const SEED_COMMENTS = [
  { id: 'c1', section: 'summary', by: TEAM_BY_ID.pn, at: '2026-09-29T10:12', resolved: null, text: 'Can we lead with the growth on last year rather than on the second quarter? The board compares year on year.' },
  { id: 'c2', section: 'f3', by: TEAM_BY_ID.lo, at: '2026-09-29T14:40', resolved: null, text: `Worth saying which region drives the drop, ${slowByRegion.r.name} on these figures.` },
  { id: 'c3', section: 'recommendations', by: TEAM_BY_ID.hs, at: '2026-09-30T08:55', resolved: TEAM_BY_ID.mc.name, text: 'R1 needs a budget line before it goes to the board.' },
]

export { PRODUCT_BY_ID }
