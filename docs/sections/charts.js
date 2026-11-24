// Data: the chart library in src/charts.js. Every example on this page is the real builder,
// drawn when the section mounts, from the small sample series below. The template pages draw the
// same builders from pages/shared/data.js.
import { wireCharts, lineChart, areaChart, barChart, donutChart, heatmap, scatterChart, funnelChart, sparkline, legendHtml, tipRow, SERIES } from '../../src/charts.js'
import { fmtInt, fmtEurRound, fmtEurCompact, fmtPct, fmtCompact } from '../../src/format.js'

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const code = text => `<div class="doc-example"><pre class="doc-example-code" style="border-top: 0">${esc(text.trim())}</pre></div>`
const rules = items => `<h3>Rules</h3><ul class="doc-rules">${items.map(i => `<li>${i}</li>`).join('')}</ul>`

/* Sample series: twelve weeks of revenue for this year and last, four regions, three categories. */
const WEEKS = ['1 Jul', '8 Jul', '15 Jul', '22 Jul', '29 Jul', '5 Aug', '12 Aug', '19 Aug', '26 Aug', '2 Sep', '9 Sep', '16 Sep']
const NOW = [312, 298, 326, 341, 305, 288, 276, 301, 334, 352, 368, 361].map(v => v * 1000)
const BEFORE = [251, 244, 262, 270, 249, 231, 226, 240, 266, 271, 283, 280].map(v => v * 1000)
const REGIONS = [['North America', [118, 112, 124, 131, 116, 110, 104, 114, 128, 134, 140, 137]], ['Europe', [98, 94, 103, 108, 96, 86, 80, 94, 105, 112, 117, 115]], ['Asia Pacific', [70, 68, 74, 77, 70, 68, 69, 69, 76, 80, 84, 83]], ['Latin America', [26, 24, 25, 25, 23, 24, 23, 24, 25, 26, 27, 26]]]
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
const CATEGORIES = [['Software', [620, 640, 700, 690, 660, 780]], ['Hardware', [420, 410, 430, 400, 390, 410]], ['Services', [260, 270, 300, 280, 270, 330]]]

const card = (id, title, extra = '') => `<section class="tb-card" style="min-width: 0">
    <div class="tb-card-header"><h3 class="tb-card-title">${title}</h3>${extra ? `<div class="tb-card-actions">${extra}</div>` : ''}</div>
    <div class="tb-card-body tb-chart-body" data-demo="${id}"></div>
  </section>`

function draw(section) {
  const at = id => section.querySelector(`[data-demo="${id}"]`)
  const w = id => at(id).clientWidth
  const points = WEEKS.map((t, i) => ({ key: String(i), tick: i % 2 ? '' : t, title: `Week of ${t}` }))
  at('line').innerHTML = lineChart({
    id: 'doc-line', width: w('line'), height: 220, points, yFormat: fmtEurCompact, valueFormat: fmtEurRound, selected: [9, 9],
    markers: [{ index: 3, label: 'Promotion' }],
    series: [{ name: 'This year', values: NOW, colour: 'var(--tb-accent)', area: true }, { name: 'Last year', values: BEFORE, colour: 'var(--tb-fg-subtle)', dashed: true }],
  })
  at('area').innerHTML = areaChart({
    id: 'doc-area', width: w('area'), height: 220, points, yFormat: fmtEurCompact, valueFormat: fmtEurRound,
    series: REGIONS.map(([name, v], i) => ({ name, colour: SERIES[i], values: v.map(x => x * 1000) })),
  })
  at('bars').innerHTML = barChart({
    id: 'doc-bars', width: w('bars'), height: 220, yFormat: fmtEurCompact, valueFormat: fmtEurCompact,
    groups: MONTHS.map(m => ({ key: m, label: m, title: `${m} 2026` })), selected: new Set(['Sep']),
    series: CATEGORIES.map(([name, v], i) => ({ name, colour: SERIES[i], values: v.map(x => x * 1000) })),
  })
  at('donut').innerHTML = donutChart({
    id: 'doc-donut', valueFormat: fmtEurCompact, center: { value: fmtEurCompact(17012331), label: 'revenue' },
    items: [['na', 'North America', 6761000], ['eu', 'Europe', 5544000], ['apac', 'Asia Pacific', 3845000], ['latam', 'Latin America', 863000]].map(([key, name, value], i) => ({ key, name, value, colour: SERIES[i] })),
  })
  const shape = (d, h) => Math.round((d < 5 ? 60 * Math.exp(-(((h - 10.5) / 2) ** 2)) + 50 * Math.exp(-(((h - 14.5) / 2.2) ** 2)) : 40 * Math.exp(-(((h - 12) / 3) ** 2)) + 30 * Math.exp(-(((h - 20) / 2) ** 2))) + 4)
  at('heat').innerHTML = heatmap({
    id: 'doc-heat', width: w('heat'), valueFormat: fmtInt,
    rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => ({ label })),
    cols: Array.from({ length: 24 }, (_, h) => ({ label: h % 3 ? '' : String(h).padStart(2, '0'), title: `${String(h).padStart(2, '0')}:00` })),
    values: Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => shape(d, h))),
    legend: { label: 'Orders', min: fmtInt(0), max: fmtInt(114) },
  })
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const pts = Array.from({ length: 90 }, (_, i) => {
    const x = 10 ** (1 + rnd() * 2)
    const y = 150 + rnd() * 250
    const risk = rnd() ** 3
    const b = risk > 0.4 ? 'high' : risk >= 0.1 ? 'mid' : 'low'
    return { key: String(i), x, y, colour: `var(--tb-prob-${b})`, title: `Account ${i + 1}`, rows: [tipRow('var(--tb-fg-subtle)', 'Orders', fmtInt(x)), tipRow(`var(--tb-prob-${b})`, 'Churn risk', fmtPct(risk))] }
  })
  at('scatter').innerHTML = scatterChart({
    id: 'doc-scatter', width: w('scatter'), height: 240, points: pts, brush: { x0: 100, x1: 1000, y0: 250, y1: 400 },
    x: { min: 10, max: 1000, log: true, ticks: [10, 30, 100, 300, 1000], format: fmtInt },
    y: { min: 100, max: 500, ticks: [100, 200, 300, 400, 500], format: fmtEurRound },
  })
  at('funnel').innerHTML = funnelChart({
    id: 'doc-funnel', width: w('funnel'), valueFormat: fmtInt,
    stages: [['signed', 'Signed up', 19533], ['trial', 'Started a trial', 8613], ['paid', 'Became a customer', 2591], ['renewed', 'Renewed', 2000]].map(([key, name, value]) => ({ key, name, value })),
  })
  at('spark').innerHTML = `<div class="tb-row tb-gap-6">${[[NOW, 'Revenue'], [NOW.map((v, i) => v / (i + 20)), 'Orders'], [BEFORE.map(v => -v).reverse(), 'Refunds']].map(([values, name]) => `<div class="tb-stat" style="padding: 0"><span class="tb-stat-label">${name}</span><span class="tb-stat-spark">${sparkline({ values, width: 96, height: 28 })}</span></div>`).join('')}</div>`
}

export const chartsSection = {
  id: 'charts',
  title: 'Charts',
  lead: 'Eight chart builders in src/charts.js, with one tooltip, one keyboard model and one way to select. Every example below is the builder itself.',
  body: `
    <p>Each builder takes plain data and returns the markup of a chart, sized to the width you pass. The page keeps the data and the selection and draws again when either changes. <code>wireCharts</code> gives every mark in a container its tooltip, arrow-key movement and click, and tells the page which mark was chosen.</p>
    ${code(`
import { wireCharts, lineChart, SERIES } from './src/charts.js'
import { fmtEurCompact, fmtEurRound } from './src/format.js'

body.innerHTML = lineChart({
  id: 'revenue', width: body.clientWidth,
  points: weeks.map(w => ({ key: w.id, tick: w.label, title: w.long })),
  series: [
    { name: 'This year', values: now, colour: 'var(--tb-accent)', area: true },
    { name: 'Last year', values: before, colour: 'var(--tb-fg-subtle)', dashed: true },
  ],
  yFormat: fmtEurCompact, valueFormat: fmtEurRound,
})
wireCharts(main, { onActivate: (chart, key) => { /* add or remove a filter, draw again */ } })`)}
    <div class="doc-example"><div class="doc-example-stage is-block is-canvas">
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--tb-space-3)">
        ${card('line', 'lineChart', legendHtml([{ name: 'This year', colour: 'var(--tb-accent)', kind: 'line' }, { name: 'Last year', colour: 'var(--tb-fg-subtle)', kind: 'dashed' }]))}
        ${card('area', 'areaChart', legendHtml(REGIONS.map(([name], i) => ({ name, colour: SERIES[i] }))))}
        ${card('bars', 'barChart', legendHtml(CATEGORIES.map(([name], i) => ({ name, colour: SERIES[i] }))))}
        ${card('donut', 'donutChart')}
        ${card('heat', 'heatmap')}
        ${card('scatter', 'scatterChart')}
        ${card('funnel', 'funnelChart')}
        ${card('spark', 'sparkline')}
      </div>
    </div></div>
    <h3>Builders</h3>
    <table class="doc-table">
      <thead><tr><th>Builder</th><th>Draws</th><th>Main options</th></tr></thead>
      <tbody>
        <tr><td><code>lineChart</code></td><td>Evenly spaced points, one column per point.</td><td><code>points</code>, <code>series</code> (<code>dashed</code> for a comparison, <code>area</code>), <code>selected</code> as a range of indexes, <code>markers</code> for moments.</td></tr>
        <tr><td><code>areaChart</code></td><td>Stacked areas, bottom series first.</td><td><code>points</code>, <code>series</code>, <code>share</code> draws each point as 100&nbsp;%.</td></tr>
        <tr><td><code>barChart</code></td><td>Vertical bars, stacked or side by side. A histogram is one series with <code>gap</code> near 0.</td><td><code>groups</code>, <code>series</code>, <code>stacked</code>, <code>share</code>, <code>showValues</code>, <code>selected</code> as a Set of group keys.</td></tr>
        <tr><td><code>donutChart</code></td><td>A ring with a legend beside it that selects like the arcs.</td><td><code>items</code>, <code>selected</code>, <code>center</code>.</td></tr>
        <tr><td><code>heatmap</code></td><td>Rows by columns, tinted from the surface towards one colour.</td><td><code>rows</code>, <code>cols</code>, <code>values</code>, <code>colour</code>, <code>cellText</code>, <code>legend</code>.</td></tr>
        <tr><td><code>scatterChart</code></td><td>Points on linear or log axes. A drag on the plot selects a range.</td><td><code>points</code>, <code>x</code> and <code>y</code> (<code>min</code>, <code>max</code>, <code>log</code>, <code>ticks</code>, <code>format</code>), <code>brush</code>, <code>pinned</code>, <code>refs</code>.</td></tr>
        <tr><td><code>funnelChart</code></td><td>One bar per stage with the share that carried on.</td><td><code>stages</code>, <code>colour</code>.</td></tr>
        <tr><td><code>sparkline</code></td><td>A trend with no axes, for a stat or a table cell.</td><td><code>values</code>, <code>width</code>, <code>height</code>, <code>band</code>, <code>compare</code>.</td></tr>
      </tbody>
    </table>
    <p>Helpers: <code>nice</code> rounds an axis, <code>legendHtml</code> builds a <code>tb-legend</code>, <code>tipHtml</code> and <code>tipRow</code> build a tooltip, <code>emptyChart</code> and <code>skeletonChart</code> keep the chart's height while it is empty or loading. <code>SERIES</code> lists the six series colours in order.</p>
    <h3>Behaviour</h3>
    <ul class="doc-rules">
      <li><strong>Marks.</strong> Any element with <code>data-mark</code>, <code>data-chart</code> and <code>data-key</code>. Hovering or focusing it shows its tooltip; arrow keys move between the marks of one chart, a heatmap moves by rows too; Enter, Space or a click calls <code>onActivate(chart, key)</code>.</li>
      <li><strong>Legends.</strong> A legend button with <code>data-legend</code> activates the same way as its mark, so the keyboard has a way into a donut.</li>
      <li><strong>Brushing.</strong> A scatter drawn with <code>brushable</code> turns a drag on its plot into <code>onBrush(chart, range)</code> in data units. A click without a drag reports <code>null</code>.</li>
      <li><strong>Expanding.</strong> Put <code>expandButton(title)</code> from <code>src/expand.js</code> in the card header. The chart opens full screen, scaled from its SVG.</li>
      <li><strong>Resizing.</strong> Charts are drawn to a width. Draw again when the container's width changes and on <code>shell:dock</code>.</li>
    </ul>
    ${rules([
      'Colours come from <code>SERIES</code> for categories with no meaning of their own, and from the meaning\'s token when there is one: <code>--tb-prob-*</code> for risk, <code>--tb-fg-subtle</code> dashed for a comparison.',
      'Every tick, tooltip value and legend value goes through <code>src/format.js</code>. Pass the formatter in; the builders never format a number on their own.',
      'Each chart shows what passes every filter except its own, and marks its own selection. The others dim to 0.3.',
      'An empty chart says why and offers the way out, usually Clear filters, at the chart\'s own height.',
    ])}`,
  mount(section) {
    draw(section)
    wireCharts(section, { onActivate: () => {}, onBrush: () => {} })
    let width = section.clientWidth
    new ResizeObserver(() => { if (section.clientWidth !== width) { width = section.clientWidth; draw(section) } }).observe(section)
  },
}
