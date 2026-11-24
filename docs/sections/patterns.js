// Patterns: the components the product pages kept rebuilding, promoted into the system.
// Also the app shell, data visualisation and the tree views.
// Each sample is a function of an icon set: the live stage gets real Lucide icons, the code
// block gets a one-line placeholder, so the printed markup stays readable.

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function dedent(s) {
  const lines = s.replace(/^\n+/, '').replace(/\s+$/, '').split('\n')
  const indents = lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length)
  const min = indents.length ? Math.min(...indents) : 0
  return lines.map(l => l.slice(min)).join('\n')
}

const stageOnly = (stage, mods = '') => `
  <div class="doc-example">
    <div class="doc-example-stage${mods ? ` ${mods}` : ''}">${stage}</div>
  </div>`

// fn(icons) returns markup. Rendered live with I, printed with P.
const example = (fn, mods = '') => `
  <div class="doc-example">
    <div class="doc-example-stage${mods ? ` ${mods}` : ''}">${fn(I)}</div>
    <pre class="doc-example-code">${esc(dedent(fn(P)))}</pre>
  </div>`

const codeOnly = code => `<div class="doc-example"><pre class="doc-example-code" style="border-top: 0">${esc(dedent(code))}</pre></div>`

const rules = items => `<h3>Rules</h3><ul class="doc-rules">${items.map(i => `<li>${i}</li>`).join('')}</ul>`

// Lucide icons (lucide-static, ISC), inlined on their 24 grid.
const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

const BODIES = {
  search: '<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />',
  x: '<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
  chevronRight: '<path d="m9 18 6-6-6-6" />',
  chevronDown: '<path d="m6 9 6 6 6-6" />',
  chevronUp: '<path d="m18 15-6-6-6 6" />',
  listFilter: '<path d="M2 5h20" /><path d="M6 12h12" /><path d="M9 19h6" />',
  trendingUp: '<path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />',
  trendingDown: '<path d="M16 17h6v-6" /><path d="m22 17-8.5-8.5-5 5L2 7" />',
  minus: '<path d="M5 12h14" />',
  fileText: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />',
  pin: '<path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />',
  download: '<path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" />',
  sparkles: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" />',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" />',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />',
  circleCheck: '<circle cx="12" cy="12" r="10" /><path d="m16 9-5.5 5.5L8 12" />',
  circleX: '<circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />',
  fileUp: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M12 12v6" /><path d="m15 15-3-3-3 3" />',
  moon: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />',
  sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />',
  logout: '<path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />',
  panelLeft: '<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" />',
  panelTop: '<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" />',
  panelClose: '<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="m16 15-3-3 3-3" />',
  panelOpen: '<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="m14 9 3 3-3 3" />',
  trash: '<path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />',
  gripVertical: '<circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />',
  arrowUp: '<path d="m5 12 7-7 7 7" /><path d="M12 19V5" />',
  arrowDown: '<path d="M12 5v14" /><path d="m19 12-7 7-7-7" />',
  plus: '<path d="M5 12h14" /><path d="M12 5v14" />',
  check: '<path d="M20 6 9 17l-5-5" />',
  rotateCcw: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />',
  pencilRuler: '<path d="M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13" /><path d="m8 6 2-2" /><path d="m18 16 2-2" /><path d="m17 11 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17" /><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" />',
  maximize: '<path d="M15 3h6v6" /><path d="m21 3-7 7" /><path d="m3 21 7-7" /><path d="M9 21H3v-6" />',
}

// Drawn for Tabula, on the same 24 grid and stroke: the analysis tree has no library icon.
const TREE = '<path d="M12 3.75v4.5M12 8.25 6 14.25M12 8.25l6 6" /><path d="M4.125 14.25h3.75v4.5h-3.75zM16.125 14.25h3.75v4.5h-3.75z" />'

const I = Object.fromEntries(Object.entries({ ...BODIES, tree: TREE }).map(([k, v]) => [k, lucide(v)]))
const kebab = k => k.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
const P = Object.fromEntries(Object.keys(I).map(k => [k, `<svg class="tb-icon" aria-hidden="true"><!-- ${kebab(k)} --></svg>`]))

// Same icon with an extra class, for the shell's state swaps.
const withClass = (svg, cls) => svg.replace('class="tb-icon"', `class="tb-icon ${cls}"`)

// A tiny sparkline in the text colour of its slot. Points are fixed sample data for the doc.
const spark = (icons, points) => icons === P
  ? '<svg width="96" height="28" aria-hidden="true"><!-- sparkline --></svg>'
  : `<svg width="96" height="28" viewBox="0 0 96 28" aria-hidden="true"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>`

/* ------------------------------------------------------------------------------------------
   Avatar
   ------------------------------------------------------------------------------------------ */

const avatar = {
  id: 'avatar',
  title: 'Avatar',
  lead: 'Initials of a person, or an icon for the model or a file.',
  body: `
    <p>An avatar marks who did something: the signed-in person in the app bar, the author of a comment, the person who added a source. It holds two initials, or an icon when the actor is the model or a file.</p>
    ${example(i => `
      <span class="tb-avatar" aria-hidden="true">JL</span>
      <span class="tb-avatar tb-avatar--neutral" aria-hidden="true">MC</span>
      <span class="tb-avatar tb-avatar--sm" aria-hidden="true">JL</span>
      <span class="tb-avatar tb-avatar--sm tb-avatar--neutral" aria-hidden="true">TB</span>
      <span class="tb-avatar tb-avatar--sm tb-avatar--ai" aria-hidden="true">${i.sparkles}</span>
      <span class="tb-avatar tb-avatar--lg tb-avatar--neutral" aria-hidden="true">${i.fileText}</span>
    `)}
    <p>Sizes: <code>tb-avatar--sm</code> 24px, default 30px, <code>tb-avatar--lg</code> 40px. Tones: accent by default, <code>tb-avatar--neutral</code>, <code>tb-avatar--ai</code>.</p>
    ${rules([
      'Accent is the signed-in person only. Every other person and every file is neutral, so people find their own work at a glance.',
      'Use the AI tone for the model and nothing else, as with every AI marker.',
      'Put the name next to the avatar and hide the avatar with <code>aria-hidden="true"</code>. Alone, it needs an <code>aria-label</code> with the full name.',
      'Small in lists, comments and feeds; default in the app bar; large only at the head of a profile or a file.',
      'Avatars are square with the system radius, like every other surface.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Description list
   ------------------------------------------------------------------------------------------ */

const dl = {
  id: 'description-list',
  title: 'Description list',
  lead: 'Facts about one thing, as label and value pairs.',
  body: `
    <p>Inspectors, side panels and report headers describe one account, order or region as a list of facts. The label is muted on the left and the value reads on the right, so figures line up for comparison.</p>
    ${example(() => `
      <dl class="tb-dl" style="width: 300px">
        <dt>Orders</dt><dd class="tb-num">1,204</dd>
        <dt>Revenue</dt><dd class="tb-num">3,482,910.00&nbsp;€</dd>
        <dt>Churn risk</dt><dd><span class="tb-prob tb-prob--high">72.4&nbsp;%<span class="tb-prob-bar" style="--value: 72.4"></span></span></dd>
        <dt>Filter</dt><dd class="tb-mono">revenue &gt; 10,000</dd>
      </dl>
    `, 'is-block')}
    <h3>Start aligned, dense and stacked</h3>
    <p><code>tb-dl--start</code> starts the values on the left, for text that wraps. Set <code>--label-width</code> so labels line up across several lists. <code>tb-dl-sub</code> adds a quieter second line. <code>tb-dl--dense</code> tightens the rows. <code>tb-dl--stacked</code> puts each label above its value, for a report header; wrap each pair in a <code>div</code>.</p>
    ${example(() => `
      <dl class="tb-dl tb-dl--start tb-dl--dense" style="--label-width: 84px; width: 320px">
        <dt>Company</dt><dd>Trillium Logistics<span class="tb-dl-sub tb-mono">AC-1228</span></dd>
        <dt>Owner</dt><dd>Maya Chen<span class="tb-dl-sub">Account manager</span></dd>
        <dt>Last order</dt><dd class="tb-num">14 Aug 2026, 16:42</dd>
      </dl>
      <hr class="tb-divider" style="margin: var(--tb-space-5) 0" />
      <dl class="tb-dl tb-dl--stacked">
        <div><dt>Report</dt><dd>QBR-2026-Q3</dd></div>
        <div><dt>Company</dt><dd>Example Co.</dd></div>
        <div><dt>Period</dt><dd class="tb-num">1 Jul 2026 to 30 Sep 2026</dd></div>
        <div><dt>Version</dt><dd>v3, In review</dd></div>
      </dl>
    `, 'is-block')}
    ${rules([
      'Use a description list for facts about one thing. For many things with the same fields, use a table.',
      'Labels are nouns of one or two words. Leave out colons.',
      'Values that are figures stay right aligned so they compare down the column. Switch to <code>tb-dl--start</code> only when values are text that wraps.',
      'Show a missing value as a dash in <code>--tb-fg-subtle</code>, never an empty cell, so the reader knows it was checked.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Stat
   ------------------------------------------------------------------------------------------ */

const stat = {
  id: 'stat',
  title: 'Stat',
  lead: 'A key figure: a label, a big number, one line of context.',
  body: `
    <p>A stat gives one figure that matters on the page, with its change or its context under it. <code>tb-stat-strip</code> lines several up in equal columns with a rule between them, on a card. A stat that filters the view below it is a <code>button</code> with <code>aria-pressed</code>. Its label takes the link colour and ends with an icon saying what it does, such as a filter, so it reads as clickable before it is hovered. The pressed one is marked like an active tab, with the accent line along its bottom edge. A stat that only informs keeps a muted label and no icon.</p>
    ${example(i => `
      <div class="tb-card tb-stat-strip" style="width: 100%">
        <div class="tb-stat">
          <span class="tb-stat-label">Orders</span>
          <span class="tb-stat-value">48,212</span>
          <span class="tb-stat-sub">1 Jul to 30 Sep 2026</span>
        </div>
        <button class="tb-stat" type="button" aria-pressed="true">
          <span class="tb-stat-label">Late orders${i.listFilter}</span>
          <span class="tb-stat-value">1,318</span>
          <span class="tb-stat-sub"><span class="tb-stat-delta tb-stat-delta--bad">${i.trendingUp}+12.4&nbsp;%</span>vs Q2</span>
        </button>
        <button class="tb-stat" type="button" aria-pressed="false">
          <span class="tb-stat-label">Resolved${i.listFilter}</span>
          <span class="tb-stat-value">412</span>
          <span class="tb-stat-sub"><span class="tb-stat-delta tb-stat-delta--good">${i.trendingUp}+86</span>this week</span>
          <span class="tb-bar tb-bar--sm tb-tone-accent" style="--value: 31.3"></span>
        </button>
        <div class="tb-stat tb-stat--danger">
          <span class="tb-stat-label">Failed sources</span>
          <span class="tb-stat-value">2</span>
          <span class="tb-stat-sub">Fix and upload again</span>
        </div>
      </div>
    `, 'is-block is-canvas')}
    <h3>Large, with a sparkline, and as a tile</h3>
    <p><code>tb-stat--lg</code> is for a figure that heads its own card. <code>tb-stat-spark</code> sits right of the value and draws in the accent colour. <code>tb-stat--tile</code> puts a stat on a sunken tile, for a grid of figures inside a card.</p>
    ${example(i => `
      <div class="tb-row tb-gap-3" style="align-items: stretch">
        <div class="tb-card" style="width: 300px">
          <div class="tb-stat tb-stat--lg">
            <span class="tb-stat-label">Revenue</span>
            <span class="tb-stat-value">6,904,120.00&nbsp;€</span>
            <span class="tb-stat-spark">${spark(i, '0,22 12,20 24,21 36,16 48,17 60,11 72,12 84,6 96,4')}</span>
            <span class="tb-stat-sub"><span class="tb-stat-delta">${i.minus}0.0&nbsp;%</span>vs last week</span>
          </div>
        </div>
        <div class="tb-stat tb-stat--tile" style="width: 180px">
          <span class="tb-stat-label">At-risk accounts</span>
          <span class="tb-stat-value">8</span>
          <span class="tb-stat-sub">3 over 60&nbsp;%</span>
        </div>
      </div>
    `, 'is-block is-canvas')}
    ${rules([
      'Four to six stats per strip. More than that belongs in a table.',
      'The label names the figure in one to three words. The sub line gives the period, the comparison or the next step, never a sentence.',
      'Direction comes from the Lucide icon (<code>trending-up</code>, <code>trending-down</code>, <code>minus</code>). Tone says good or bad for the reader: more late orders is <code>tb-stat-delta--bad</code> even when the number goes up.',
      'Only a stat that filters the view is a button, and it shows its state with <code>aria-pressed</code>.',
      'Values come from the shared formatters. Truncate a value that does not fit rather than wrap it.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Chip group
   ------------------------------------------------------------------------------------------ */

const chipGroup = {
  id: 'chip-group',
  title: 'Chip group',
  lead: 'A wrapping row of tags or filter chips, with an optional label.',
  body: `
    <p>Chip groups hold the filters applied to a view, quick filters with counts, the sources an answer cites, or the example prompts under a composer. The chips are <code>tb-tag</code>, and <code>tb-tag--interactive</code> when they toggle. <code>tb-tag-count</code> adds a count and <code>tb-tag-text</code> lets a long name truncate.</p>
    ${example(i => `
      <div class="tb-stack tb-gap-4">
        <div class="tb-chip-group" role="group" aria-label="AI confidence">
          <span class="tb-chip-group-label">AI confidence</span>
          <button class="tb-tag tb-tag--interactive" type="button" aria-pressed="true">High<span class="tb-tag-count">214</span></button>
          <button class="tb-tag tb-tag--interactive" type="button" aria-pressed="false">Medium<span class="tb-tag-count">598</span></button>
          <button class="tb-tag tb-tag--interactive" type="button" aria-pressed="false">Low<span class="tb-tag-count">506</span></button>
          <button class="tb-tag tb-tag--interactive is-zero" type="button" aria-pressed="false">None<span class="tb-tag-count">0</span></button>
        </div>
        <div class="tb-chip-group">
          <span class="tb-chip-group-label">Filters</span>
          <span class="tb-tag">Europe<button class="tb-tag-remove" type="button" aria-label="Remove Europe" data-tb-tag-remove>${i.x}</button></span>
          <span class="tb-tag">Revenue over 10,000&nbsp;€<button class="tb-tag-remove" type="button" aria-label="Remove the revenue filter" data-tb-tag-remove>${i.x}</button></span>
        </div>
        <div class="tb-chip-group">
          <span class="tb-chip-group-label">Sources</span>
          <button class="tb-tag tb-tag--interactive" type="button" style="max-width: 200px">${i.fileText}<span class="tb-tag-text">orders_2026_Q3.csv</span></button>
          <button class="tb-tag tb-tag--interactive" type="button">${i.fileText}<span class="tb-tag-text">accounts_trillium_logistics.pdf</span></button>
        </div>
      </div>
    `, 'is-block')}
    ${rules([
      '<code>tb-chip-group--loose</code> widens the gap between chips, for a row that reads as choices rather than a list.',
      'Give the group a label, visible with <code>tb-chip-group-label</code> or through <code>aria-label</code>, so it is clear what the chips filter.',
      'A chip that toggles shows its state with <code>aria-pressed</code>. A chip that removes a filter uses <code>tb-tag-remove</code>, which moves focus to the next chip.',
      'Counts use tabular figures and stay after the name. A chip whose count is zero takes <code>is-zero</code> and stays clickable.',
      'Set a <code>max-width</code> on chips with file or account names and put the name in <code>tb-tag-text</code>, with the full name in a tooltip.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Breadcrumbs
   ------------------------------------------------------------------------------------------ */

const crumbs = i => `
  <nav class="tb-breadcrumbs" aria-label="Path from the root">
    <ol>
      <li><a class="tb-breadcrumb" href="#breadcrumbs">All revenue</a></li>
      <li><a class="tb-breadcrumb" href="#breadcrumbs">Europe</a></li>
      <li><a class="tb-breadcrumb" href="#breadcrumbs">Germany</a></li>
      <li><span class="tb-breadcrumb" aria-current="page">Insights add-on</span></li>
    </ol>
  </nav>`

const breadcrumbs = {
  id: 'breadcrumbs',
  title: 'Breadcrumbs',
  lead: 'The path from the root of the hierarchy to the node in view.',
  body: `
    <p>Breadcrumbs show where a node sits in the revenue hierarchy and let a person climb back up. Each level is a link or a button, the last one is the current node. The chevrons are drawn in CSS.</p>
    ${example(crumbs, 'is-block')}
    <h3>Truncation and wrapping</h3>
    <p>In a narrow space, levels shrink and end in an ellipsis, the current one last. In a side panel where the full path matters, <code>tb-breadcrumbs--wrap</code> breaks onto more lines instead.</p>
    ${stageOnly(`
      <div style="width: 360px">${crumbs(I)}</div>
      <div style="width: 260px">${crumbs(I).replace('tb-breadcrumbs"', 'tb-breadcrumbs tb-breadcrumbs--wrap"')}</div>
    `)}
    ${rules([
      'Wrap the list in <code>nav</code> with an <code>aria-label</code>, and mark the last level with <code>aria-current="page"</code>.',
      'Name each level by what it is, such as a region, a country or a product. Never by an internal id.',
      'Put the full name in a <code>title</code> on any level that can truncate.',
      'Breadcrumbs start at the root of the tree, never at the app. The app bar already says where the person is.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Toolbar and search
   ------------------------------------------------------------------------------------------ */

const toolbar = {
  id: 'toolbar',
  title: 'Toolbar and search',
  lead: 'The row of search, filters and actions above a table or a list.',
  body: `
    <p><code>tb-toolbar</code> lays out controls in a wrapping row. Placed straight inside a card, between the header and the body, it becomes its own band with a rule under it. <code>tb-spacer</code> pushes what follows to the right, <code>tb-toolbar-group</code> keeps a few controls together, <code>tb-toolbar-count</code> shows the result count, and a <code>tb-divider--vertical</code> separates groups.</p>
    <p><code>tb-search</code> is an input group with the search icon and a clear button. With <code>data-tb-search</code> on the group, the clear button empties the field, fires an <code>input</code> event so the page filters again, and keeps the focus in the field. Escape does the same while the field has text. The button shows only when there is text, which needs a placeholder on the input. <code>tb-search--block</code> makes it fill its row.</p>
    ${example(i => `
      <div class="tb-card" style="width: 100%">
        <div class="tb-card-header"><h3 class="tb-card-title">Accounts</h3></div>
        <div class="tb-toolbar">
          <div class="tb-input-group tb-search" data-tb-search>
            ${i.search}
            <input class="tb-input" type="search" placeholder="Search ID, company, owner" aria-label="Search accounts" autocomplete="off" />
            <button class="tb-button tb-button--minimal tb-button--icon tb-search-clear" type="button" aria-label="Clear the search" data-tb-search-clear>${i.x}</button>
          </div>
          <select class="tb-select" aria-label="Status">
            <option>All statuses</option><option>At risk</option><option>Paused</option>
          </select>
          <span class="tb-spacer"></span>
          <span class="tb-toolbar-count">480 accounts</span>
          <span class="tb-divider tb-divider--vertical"></span>
          <div class="tb-toolbar-group">
            <button class="tb-button" type="button">${i.tag}Segment</button>
            <button class="tb-button" type="button">${i.download}Export</button>
          </div>
        </div>
        <div class="tb-card-body"><p class="tb-text tb-text--muted">The table goes here.</p></div>
      </div>
    `, 'is-block is-canvas')}
    ${rules([
      'Order: search first, then filters, then the spacer, then the count and the actions. The same order on every page.',
      'The search placeholder names what it searches, such as "Search ID, company, owner". The <code>aria-label</code> names the list.',
      'Filter as the person types. Never add a search button.',
      'Actions that apply to selected rows appear only while rows are selected, in their own group before the search.',
      'Keep a toolbar to one line on a wide screen. When it wraps, move rare filters into a filter rail.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Filter rail
   ------------------------------------------------------------------------------------------ */

const option = (name, count, extra = '', checked = false) => `
            <label class="tb-checkbox tb-filter-option${count === '0' ? ' is-zero' : ''}"><input type="checkbox"${checked ? ' checked' : ''} /><span>${extra}<span class="tb-filter-option-name">${name}</span><span class="tb-filter-option-count">${count}</span></span></label>`

const filterRail = {
  id: 'filter-rail',
  title: 'Filter rail',
  lead: 'A column of filter groups beside a table.',
  body: `
    <p>The filter rail holds every filter of a long list in one column: a title per group, options with their counts, and a reset per group. It sits in a card to the left of the table and scrolls on its own. Options are <code>tb-checkbox</code> or <code>tb-radio</code> with <code>tb-filter-option</code>; a group of few values can use a chip group instead.</p>
    ${example(() => `
      <div class="tb-card" style="width: 240px">
        <div class="tb-card-header tb-card-header--plain"><h3 class="tb-card-title">Filters</h3></div>
        <div class="tb-card-body tb-card-body--flush">
          <div class="tb-filter-rail">
            <div class="tb-filter-group" role="group" aria-labelledby="doc-filter-status">
              <div class="tb-filter-group-head">
                <h4 class="tb-filter-group-title" id="doc-filter-status">Status</h4>
                <button class="tb-button tb-button--minimal tb-button--sm tb-filter-reset" type="button">Reset</button>
              </div>${option('At risk', '88', '<span class="tb-swatch tb-tone-danger"></span>', true)}${option('Paused', '41', '<span class="tb-swatch tb-tone-warning"></span>', true)}${option('Active', '297', '<span class="tb-swatch tb-tone-success"></span>')}${option('New', '54', '<span class="tb-swatch tb-tone-accent"></span>')}
            </div>
            <div class="tb-filter-group" role="group" aria-labelledby="doc-filter-region">
              <div class="tb-filter-group-head"><h4 class="tb-filter-group-title" id="doc-filter-region">Region</h4></div>${option('North America', '178')}${option('Europe', '214')}${option('Asia Pacific', '88')}${option('Latin America', '0')}
            </div>
          </div>
        </div>
      </div>
    `)}
    ${rules([
      'Order groups by how often people use them, and options by their natural order (statuses as in the status set, revenue from low to high).',
      'Every option shows its count for the current filters. An option with no match takes <code>is-zero</code> and stays selectable.',
      'Reset appears on a group only while that group filters something. Hide it with <code>hidden</code> otherwise.',
      'Give each group <code>role="group"</code> and <code>aria-labelledby</code> pointing at its title, so a screen reader reads the group name with each option.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   List
   ------------------------------------------------------------------------------------------ */

const list = {
  id: 'list',
  title: 'List',
  lead: 'Selectable rows: conversations, activity, queues, report filters.',
  body: `
    <p>A list item has an optional leading slot (an avatar, an icon, a swatch), a body with a title and a meta line, and a trailing slot (a time, a count, buttons). Make the row clickable with a <code>tb-list-item-link</code> in its body: the link covers the whole row, and the trailing buttons stay separate buttons above it. A row with no trailing action can itself be a <code>button</code> or an <code>a</code>.</p>
    <h3>Inset, for navigation</h3>
    ${example(i => `
      <ul class="tb-list" style="width: 300px" aria-label="Conversations">
        <li class="tb-list-item is-selected">
          <div class="tb-list-item-body">
            <a class="tb-list-item-link tb-list-item-title" href="#list" aria-current="true">Why is Quarry Supply at risk?</a>
            <span class="tb-list-item-meta">No order in 45 days and two open support tickets</span>
          </div>
          <div class="tb-list-item-trailing">10:14</div>
        </li>
        <li class="tb-list-item">
          <div class="tb-list-item-body">
            <a class="tb-list-item-link tb-list-item-title" href="#list">Revenue by country</a>
            <span class="tb-list-item-meta">Most revenue comes from the United States and Germany</span>
          </div>
          <div class="tb-list-item-trailing">
            <button class="tb-button tb-button--minimal tb-button--icon tb-button--sm tb-list-item-reveal" type="button" aria-label="Pin" aria-pressed="false">${i.pin}</button>
          </div>
        </li>
      </ul>
    `)}
    <h3>Divided, inside a flush card body</h3>
    <p><code>tb-list--divided</code> runs rows edge to edge with a rule between them. <code>tb-list--dense</code> brings rows down to control height.</p>
    ${example(i => `
      <div class="tb-row tb-gap-3" style="align-items: flex-start">
        <div class="tb-card" style="width: 340px">
          <div class="tb-card-header"><h3 class="tb-card-title">Recent activity</h3></div>
          <ul class="tb-list tb-list--divided">
            <li><button class="tb-list-item" type="button">
              <span class="tb-list-item-leading" style="color: var(--tb-success)">${i.circleCheck}</span>
              <span class="tb-list-item-body"><span class="tb-list-item-title">churn_scores_v3_2026-09-23.csv imported</span><span class="tb-list-item-meta">Hana Sato</span></span>
              <span class="tb-list-item-trailing">08:15</span>
            </button></li>
            <li><button class="tb-list-item" type="button">
              <span class="tb-list-item-leading" style="color: var(--tb-danger)">${i.circleX}</span>
              <span class="tb-list-item-body"><span class="tb-list-item-title">orders_export_2026-09-21.csv failed</span><span class="tb-list-item-meta">Ella Novak</span></span>
              <span class="tb-list-item-trailing">21 Sep</span>
            </button></li>
          </ul>
        </div>
        <div class="tb-card" style="width: 300px">
          <div class="tb-card-header"><h3 class="tb-card-title">Report filters</h3></div>
          <ul class="tb-list tb-list--divided tb-list--dense">
            <li class="tb-list-item">
              <span class="tb-swatch tb-tone-high"></span>
              <span class="tb-list-item-body"><span class="tb-list-item-title">Revenue over 10,000&nbsp;€</span></span>
              <span class="tb-list-item-trailing"><button class="tb-button tb-button--minimal tb-button--icon tb-button--sm" type="button" aria-label="Remove from the report">${i.x}</button></span>
            </li>
            <li class="tb-list-item">
              <span class="tb-swatch tb-tone-mid"></span>
              <span class="tb-list-item-body"><span class="tb-list-item-title">No order in the last 30 days</span></span>
              <span class="tb-list-item-trailing"><button class="tb-button tb-button--minimal tb-button--icon tb-button--sm" type="button" aria-label="Remove from the report">${i.x}</button></span>
            </li>
          </ul>
        </div>
      </div>
    `, 'is-block is-canvas')}
    ${rules([
      'Mark the open item with <code>is-selected</code>, <code>aria-selected</code> or <code>aria-current</code>. The row fills with the selection colour and the title turns to the link colour.',
      'One line of title and one line of meta, both truncated. Details belong in the panel the row opens.',
      'Controls that clutter every row, such as a pin, take <code>tb-list-item-reveal</code>: they show on hover and focus, and stay when pressed.',
      'Never nest a button in a row that is itself a button. Use <code>tb-list-item-link</code> and a trailing slot instead.',
      'Times in the trailing slot use the shared date and time formatters: time for today, date otherwise.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Legend, swatch and share bar
   ------------------------------------------------------------------------------------------ */

const legend = {
  id: 'legend',
  title: 'Legend and share bar',
  lead: 'The key to a chart, and a thin bar for a share of a whole.',
  body: `
    <p><code>tb-legend</code> lists the series of a chart: a swatch, a label and up to two values. The rows share their columns, so values line up. A row that filters its chart is a <code>button</code> with <code>aria-pressed</code>. <code>tb-legend--inline</code> is a key in a row, under or beside a chart.</p>
    <p><code>tb-swatch</code> is the colour key: a square by default, <code>--dot</code>, <code>--line</code> or <code>--hollow</code>. Colour it with a tone class (<code>tb-tone-low</code>, <code>-mid</code>, <code>-high</code>, <code>-accent</code>, <code>-danger</code>, <code>-warning</code>, <code>-success</code>, <code>-ai</code>) or with an inline <code>--tone</code> set to a token.</p>
    ${example(() => `
      <div class="tb-row tb-gap-8" style="align-items: flex-start">
        <ul class="tb-legend" style="width: 260px">
          <li class="tb-legend-item"><span class="tb-swatch tb-tone-danger"></span><span class="tb-legend-label">At risk</span><span class="tb-legend-value">88</span><span class="tb-legend-value">18.3&nbsp;%</span></li>
          <li class="tb-legend-item"><span class="tb-swatch tb-tone-warning"></span><span class="tb-legend-label">Paused</span><span class="tb-legend-value">41</span><span class="tb-legend-value">8.5&nbsp;%</span></li>
          <li class="tb-legend-item"><span class="tb-swatch" style="--tone: var(--tb-border-strong)"></span><span class="tb-legend-label">Active</span><span class="tb-legend-value">351</span><span class="tb-legend-value">73.1&nbsp;%</span></li>
        </ul>
        <ul class="tb-legend" style="width: 260px" aria-label="Filter the chart by status">
          <li><button class="tb-legend-item" type="button" aria-pressed="true"><span class="tb-swatch tb-swatch--dot tb-tone-danger"></span><span class="tb-legend-label">At risk</span><span class="tb-legend-value">88</span></button></li>
          <li><button class="tb-legend-item" type="button" aria-pressed="false"><span class="tb-swatch tb-swatch--dot tb-tone-warning"></span><span class="tb-legend-label">Paused</span><span class="tb-legend-value">41</span></button></li>
        </ul>
      </div>
      <div class="tb-legend tb-legend--inline" style="margin-top: var(--tb-space-5)">
        <span class="tb-legend-item"><span class="tb-swatch tb-swatch--line tb-tone-accent"></span>Orders</span>
        <span class="tb-legend-item"><span class="tb-swatch tb-swatch--line tb-tone-high"></span>Late orders</span>
        <span class="tb-legend-item"><span class="tb-swatch tb-swatch--dot tb-swatch--hollow" style="--tone: var(--tb-fg-muted)"></span>Model suggestion</span>
      </div>
    `, 'is-block')}
    <h3>Share bar</h3>
    <p><code>tb-bar</code> is a thin block bar from 0 to 100, set with an inline <code>--value</code>. Colour it with a tone class; it is grey without one. <code>tb-bar--sm</code> is thinner, for a row in a list. For a probability next to its number, use <code>tb-prob-bar</code> inside <code>tb-prob</code> instead.</p>
    ${example(() => `
      <div class="tb-stack tb-gap-3" style="width: 280px">
        <div><div class="tb-progress-label"><span>Share of orders</span><span class="tb-num">12.0&nbsp;%</span></div><span class="tb-bar" style="--value: 12"></span></div>
        <div><div class="tb-progress-label"><span>AI confidence</span><span class="tb-num">82.0&nbsp;%</span></div><span class="tb-bar tb-tone-ai" style="--value: 82"></span></div>
        <div><div class="tb-progress-label"><span>Churn risk</span><span class="tb-num">72.4&nbsp;%</span></div><span class="tb-bar tb-bar--sm tb-tone-high" style="--value: 72.4"></span></div>
      </div>
    `, 'is-block')}
    ${rules([
      'Every chart with more than one series has a legend, and the legend uses the same tone as the mark.',
      'Values in a legend come from the shared formatters and add up to the chart\'s total.',
      'A share bar always sits next to its number. The bar shows proportion, the number gives the value.',
      'Probability tones (<code>tb-tone-low</code>, <code>-mid</code>, <code>-high</code>) show churn risk bands and nothing else.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   App shell
   ------------------------------------------------------------------------------------------ */

const nav = (i, active) => [
  ['Dashboard', i.chart, ''],
  ['Analytics', i.tree, ''],
  ['Accounts', i.database, '88'],
  ['Report', i.fileText, ''],
].map(([label, icon, badge]) => `
        <a class="tb-tab${label === active ? ' is-active' : ''}" href="#app-shell"${label === active ? ' aria-current="page"' : ''}>${icon}<span class="tb-appbar-nav-label">${label}</span>${badge ? `<span class="tb-appbar-nav-badge" aria-label="${badge} waiting">${badge}</span>` : ''}</a>`).join('')

const bar = i => `
    <header class="tb-appbar">
      <div class="tb-appbar-brand"><span class="tb-brand-mark" aria-hidden="true"></span><span class="tb-appbar-brand-name">Tabula</span></div>
      <nav class="tb-tabs tb-appbar-nav" aria-label="Main">${nav(i, 'Analytics')}
      </nav>
      <span class="tb-spacer"></span>
      <div class="tb-appbar-tools">
        <button class="tb-button tb-button--minimal tb-button--icon tb-appbar-collapse" type="button" aria-label="Collapse the menu">${withClass(i.panelClose, 'tb-appbar-when-expanded')}${withClass(i.panelOpen, 'tb-appbar-when-collapsed')}</button>
        <button class="tb-button tb-button--minimal tb-button--icon tb-appbar-dock" type="button" aria-label="Move the menu to the left">${withClass(i.panelLeft, 'tb-appbar-when-top')}${withClass(i.panelTop, 'tb-appbar-when-left')}</button>
      </div>
      <div class="tb-dropdown tb-appbar-account">
        <button class="tb-appbar-account-trigger" type="button" data-tb-dropdown aria-label="Account">
          <span class="tb-avatar" aria-hidden="true">JL</span>
          <span class="tb-appbar-account-text"><span class="tb-appbar-account-name">Jordan Lee</span><span class="tb-appbar-account-org">Example Co.</span></span>
          ${withClass(i.chevronDown, 'tb-appbar-account-chevron')}
        </button>
        <div class="tb-popover tb-popover--end">
          <div class="tb-menu" role="menu">
            <div class="tb-menu-heading">jordan.lee@example.com</div>
            <button class="tb-menu-item" type="button" role="menuitem" aria-pressed="false">${withClass(i.moon, 'tb-light-only')}${withClass(i.sun, 'tb-dark-only')}<span class="tb-menu-label">Dark theme</span></button>
            <div class="tb-menu-divider" role="separator"></div>
            <button class="tb-menu-item" type="button" role="menuitem">${i.logout}<span class="tb-menu-label">Log out</span></button>
          </div>
        </div>
      </div>
    </header>`

const shellMarkup = i => `
  <body class="tb-app-shell">
    ${bar(i).trim()}
    <div class="tb-page">
      <div class="tb-page-toolbar">
        <h1 class="tb-page-title">Analytics</h1>
        <div class="tb-page-context">
          <select class="tb-select tb-select--sm" aria-label="Report"><option>QBR-2026-Q3, Q3 2026</option></select>
          <span class="tb-tag tb-tag--minimal">Version v3</span>
        </div>
        <span class="tb-spacer"></span>
        <div class="tb-page-actions">
          <button class="tb-button" type="button">Add to report</button>
          <button class="tb-button tb-button--primary" type="button">Export</button>
        </div>
      </div>
      <main class="tb-page-main"><!-- the page's cards --></main>
    </div>
  </body>`

const demo = (cls, i) => `
  <div class="doc-shell-demo${cls ? ` ${cls}` : ''}">
    <div class="tb-app-shell">
      ${bar(i)}
      <div class="tb-page">
        <div class="tb-page-toolbar">
          <h1 class="tb-page-title">Analytics</h1>
          ${cls ? '' : `<div class="tb-page-context"><select class="tb-select tb-select--sm" aria-label="Report"><option>QBR-2026-Q3, Q3 2026</option></select><span class="tb-tag tb-tag--minimal">Version v3</span></div>`}
          <span class="tb-spacer"></span>
          <div class="tb-page-actions">${cls ? '' : '<button class="tb-button" type="button">Add to report</button>'}<button class="tb-button tb-button--primary" type="button">Export</button></div>
        </div>
        <div class="tb-page-main"><div class="tb-card" style="flex: 1"><div class="tb-card-header"><h3 class="tb-card-title">Tree</h3></div><div class="tb-card-body"></div></div></div>
      </div>
    </div>
  </div>`

const HEAD = `<script>try { if (localStorage.getItem('tb-theme') !== 'light') document.documentElement.classList.add('tb-dark'); if (localStorage.getItem('tb-nav') === 'left') document.documentElement.classList.add('tb-nav-left'); if (localStorage.getItem('tb-nav-collapsed') === '1') document.documentElement.classList.add('tb-nav-collapsed') } catch (e) {}</script>`

const appShell = {
  id: 'app-shell',
  title: 'App shell',
  lead: 'The app bar every page shares, and the frame of the page under it.',
  body: `
    <p>The app bar carries the brand (the stack and the name in the brand face), the pages as tabs, each with a badge when work waits there, the menu tools and the account. It docks at the top, or on the left as a sidebar that collapses to a rail of icons. Under it, <code>tb-page</code> holds the page toolbar (title, context, spacer, actions) and <code>tb-page-main</code>, the canvas where the cards go.</p>
    <h3>Docked at the top</h3>
    ${stageOnly(demo('', I), 'is-block is-canvas')}
    <h3>Docked on the left, open and collapsed</h3>
    ${stageOnly(`<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--tb-space-4)">${demo('tb-nav-left', I)}${demo('tb-nav-left tb-nav-collapsed', I)}</div>`, 'is-block is-canvas')}
    <h3>Markup</h3>
    ${codeOnly(shellMarkup(P))}
    <h3>Behaviour and mounting</h3>
    <p><code>src/shell.js</code> renders the bar into <code>&lt;header data-shell&gt;</code> and wires it. The product passes its own brand, tabs, submenus and account, so the script knows nothing about the product. Call it once, before anything on the page measures the layout.</p>
    ${codeOnly(`import { mountShell } from './src/shell.js'

mountShell({
  brand: { name: 'Tabula', href: '/' },
  nav: [{ id: 'dashboard', label: 'Dashboard', href: './dashboard.html', icon, badge: 0, context: 'Last 12 months' }],
  menus: { dashboard: [{ label: 'Last 30 days', href: './dashboard.html#p30' }, { label: 'Scheduled emails', todo: 'Scheduled emails' }] },
  account: { name: 'Jordan Lee', initials: 'JL', email: 'jordan.lee@example.com', org: 'Example Co.' },
  active: 'dashboard',
  layout: 'free',   // mounts edit mode on the page's sections
  widgets,          // the widget catalogue for edit mode and zones
})`)}
    <p><code>HEAD_SNIPPET</code> is the line below, exported for pages built in script. The shell also loads card collapse, card focus and expand, and puts the Edit page layout button first in <code>tb-page-actions</code> when the page has something to edit. It wires four things:</p>
    <ul class="doc-rules">
      <li><strong>Dock.</strong> The dock button toggles <code>tb-nav-left</code> on <code>&lt;html&gt;</code>. Icons marked <code>tb-appbar-when-top</code> and <code>tb-appbar-when-left</code> swap with it, and the account menu opens upwards in the sidebar. The move plays as a view transition: the script sets <code>tb-docking</code> on <code>&lt;html&gt;</code> for its length, the bar reshapes from a strip into a column, the brand, pages, tools and account fly to their new places and the page slides. Without view transitions, or with reduced motion, the menu moves at once.</li>
      <li><strong>Collapse.</strong> Shown only in the sidebar. It toggles <code>tb-nav-collapsed</code>: the bar narrows to a rail as wide as the column of icons, so the icons stay in place while labels, counts and the account text fade and are clipped. Each tab gets its name as a tooltip. <code>shell:dock</code> fires once the bar has settled. Icons marked <code>tb-appbar-when-expanded</code> and <code>tb-appbar-when-collapsed</code> swap.</li>
      <li><strong>Theme.</strong> The account menu holds the theme switch. It toggles <code>tb-dark</code> on <code>&lt;html&gt;</code>; its moon and sun icons use <code>tb-light-only</code> and <code>tb-dark-only</code>.</li>
      <li><strong>Memory.</strong> Choices are kept in <code>localStorage</code> under <code>tb-theme</code> (<code>dark</code> or <code>light</code>, shared with this site, dark when nothing is saved), <code>tb-nav</code> (<code>left</code> or <code>top</code>) and <code>tb-nav-collapsed</code> (<code>1</code> or <code>0</code>). After a change the script fires <code>shell:dock</code> with <code>detail.left</code> and <code>shell:theme</code> with <code>detail.dark</code> on <code>document</code>, so a page can refit what it measured.</li>
    </ul>
    <h3>Fitted page</h3>
    <p>A work screen with panes side by side, such as filters, a table and a detail, adds <code>tb-page--fit</code> to <code>tb-page</code>. The window becomes the frame: the app bar and the page toolbar stay put, <code>tb-page-main</code> fills exactly what is left, and the page itself never scrolls. The page's own CSS makes each pane fill the height and scroll on its own.</p>
    <ul class="doc-rules">
      <li>One scroll per pane, side by side. Never put a scroll area inside another, because the wheel then moves the wrong thing and headers slide out of view.</li>
      <li>Headers stay inside their pane: the table header row, and the part of a detail a person acts with, such as the status buttons.</li>
      <li>Side panes scroll only up and down. Long values wrap or end with an ellipsis. Only the main table may scroll sideways.</li>
      <li>Moving to another record opens its detail at the top. Redrawing the same record keeps the place.</li>
      <li>From 1181px wide only. A layout saved from the layout editor stays fitted, and so does the editor itself: its bar takes its own height, and the rows of sections share the rest. Narrower, it scrolls as a normal page.</li>
    </ul>
    <h3>Submenus</h3>
    <p>A page can carry a submenu: its views and the screens under it. A small chevron after the tab opens it. It also opens on hover after a short delay. On top it drops under the bar. On the left, open or collapsed, it flies out touching its tab, level with it, so the pointer can cross to it without closing it, and the chevron points right.</p>
    ${stageOnly(`
      <div style="position: relative; height: 230px">
        <div class="tb-appbar-nav-item is-open" style="display: inline-flex; height: 40px">
          <a class="tb-tab is-active" href="#app-shell" style="height: 40px; gap: var(--tb-space-2); text-decoration: none"><span class="tb-appbar-nav-label">Analytics</span></a>
          <button class="tb-appbar-nav-toggle" type="button" aria-expanded="true" aria-label="Analytics menu"><svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button>
          <div class="tb-popover tb-appbar-submenu" style="top: 44px">
            <div class="tb-menu" role="menu">
              <div class="tb-menu-heading">Analytics<span class="tb-menu-heading-note">4 regions, 16 countries</span></div>
              <a class="tb-menu-item" role="menuitem" href="#app-shell"><span class="tb-menu-label">Trends</span></a>
              <a class="tb-menu-item" role="menuitem" href="#app-shell"><span class="tb-menu-label">Customers</span></a>
              <a class="tb-menu-item" role="menuitem" href="#app-shell"><span class="tb-menu-label">Revenue hierarchy</span></a>
              <button class="tb-menu-item" type="button" role="menuitem"><span class="tb-menu-label">Saved views</span><span class="tb-menu-hint">4</span></button>
            </div>
          </div>
        </div>
      </div>`, 'is-block')}
    ${codeOnly(`<div class="tb-appbar-nav-item">
  <a class="tb-tab" href="./analytics.html">...</a>
  <button class="tb-appbar-nav-toggle" type="button" aria-expanded="false"
    aria-controls="sub-analytics" aria-label="Analytics menu">...chevron...</button>
  <div class="tb-popover tb-appbar-submenu" id="sub-analytics">
    <div class="tb-menu" role="menu">
      <div class="tb-menu-heading">Analytics</div>
      <a class="tb-menu-item" role="menuitem" href="./analytics.html#trends">
        <span class="tb-menu-label">Trends</span>
      </a>
    </div>
  </div>
</div>`)}
    ${rules([
      'A submenu lists places, never actions. Actions belong in the page toolbar.',
      'Four to six items. More than that is a page of its own.',
      'The tab itself still goes to the page; the chevron only opens the list.',
      'Open state is <code>is-open</code> on <code>tb-appbar-nav-item</code> with <code>aria-expanded</code> on the chevron. Escape closes a floating submenu and returns focus to the chevron.',
    ])}
    <p>Put this line in <code>&lt;head&gt;</code>, before the stylesheets, so the theme and the dock are right on the first paint and nothing jumps:</p>
    ${codeOnly(HEAD)}
    ${rules([
      'Every product page uses the shell. A page never builds its own bar or brand.',
      'The toolbar title is the page name, the same word as its tab. Context (period, report version) follows it; the primary action is last.',
      'Tabs are the main pages in their order. The badge after a label is the count of what waits for the person there (accounts at risk, reports to review, unread replies), through <code>fmtCompact</code>, and nothing else: how much a page holds is not a reason to click. On the collapsed rail it becomes a dot.',
      'Inventory goes in the submenu heading, as <code>tb-menu-heading-note</code>: "480 accounts", "16 countries, 6 products". It is one hover away and reads as context.',
      'Anything a page measures (a tree canvas, a sticky column) listens for <code>shell:dock</code> and measures again.',
      'Sticky panels offset by the bar height, 48px, when docked at the top and by nothing when docked on the left.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Timeline
   ------------------------------------------------------------------------------------------ */

const tlItem = (i, tone, icon, title, text, time, value = '') => `
      <li class="tb-timeline-item${tone ? ` tb-timeline-item--${tone}` : ''}">
        <span class="tb-timeline-marker">${i[icon]}</span>
        <div class="tb-timeline-body">
          <div class="tb-timeline-head"><span class="tb-timeline-title">${title}</span>${value ? `<span class="tb-timeline-value">${value}</span>` : ''}</div>
          <p class="tb-timeline-text">${text}</p>
          <span class="tb-timeline-time">${time}</span>
        </div>
      </li>`

const timeline = {
  id: 'timeline',
  title: 'Timeline',
  lead: 'What happened to one record, newest first.',
  body: `
    <p>A timeline lists the events of one record: an order, an invoice, a support ticket, a note. Each item has a marker with an icon, a title, an optional value on the right, a line of detail and the time. A tone on the item colours the marker only, so the list stays calm when many items carry one.</p>
    ${example(i => `
    <ol class="tb-timeline" style="max-width: 420px">${tlItem(i, 'danger', 'fileText', 'Invoice overdue', 'Aug 2026 invoice', '31 Aug 2026, 07:12', '2,620.13&nbsp;€')}${tlItem(i, 'success', 'circleCheck', 'Support ticket resolved', 'Cannot export the monthly report', '28 Aug 2026, 09:36')}${tlItem(i, 'accent', 'chart', 'Order for Insights add-on', '12 items', '14 Jul 2026, 11:02', '4,118.40&nbsp;€')}${tlItem(i, '', 'tag', 'Note', 'Asked about volume pricing for next year, Tom Becker', '2 Jul 2026, 16:45')}
    </ol>`, 'is-block')}
    ${rules([
      'Newest first, with the date and time on every item through <code>fmtDateTime</code>. Values go through the formatters.',
      'Tones follow meaning: danger for something that needs action, success for something closed, accent for the main events of the record. Most items carry no tone.',
      '<code>tb-timeline--dense</code> tightens the spacing for a side pane. Show the latest four or five there and link to the full record.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Data visualisation
   ------------------------------------------------------------------------------------------ */

// A small bar chart of orders per week, drawn by hand with tokens only.
const WEEKS = [['W34', 96], ['W35', 118], ['W36', 142], ['W37', 188], ['W38', 131], ['W39', 164]]
const chartSvg = () => {
  const W = 420, H = 180, l = 36, b = 24, t = 8, max = 200
  const iw = W - l - 8, ih = H - t - b, bw = iw / WEEKS.length
  const y = v => t + ih - (v / max) * ih
  const grid = [0, 50, 100, 150, 200].map(v => `
    <line x1="${l}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" style="stroke: var(--tb-border)" shape-rendering="crispEdges" />
    <text x="${l - 6}" y="${y(v) + 4}" text-anchor="end" style="fill: var(--tb-fg-muted); font-size: var(--tb-text-xs)">${v}</text>`).join('')
  const bars = WEEKS.map(([w, v], k) => {
    const x = l + k * bw + bw * 0.2
    const hot = w === 'W37'
    return `
    <rect x="${x}" y="${y(v)}" width="${bw * 0.6}" height="${y(0) - y(v)}" style="fill: var(--tb-accent); opacity: ${hot ? 1 : 0.3}" />
    <text x="${x + bw * 0.3}" y="${H - 6}" text-anchor="middle" style="fill: var(--tb-fg-muted); font-size: var(--tb-text-xs)">${w}</text>`
  }).join('')
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Orders per week, highest in week 37 with 188" style="display: block; font-variant-numeric: tabular-nums">${grid}${bars}</svg>`
}

const dataVis = {
  id: 'data-visualisation',
  title: 'Data visualisation',
  lead: 'Charts are drawn with the same tokens as everything else, and read the same across pages.',
  body: `
    <p>Charts are inline SVG drawn from shared data. Every colour, size and text style comes from a token, so a chart follows the theme with no extra code. The example is drawn with tokens only: accent bars, <code>--tb-border</code> grid lines, <code>--tb-fg-muted</code> axis text, one week selected and the others dimmed.</p>
    ${stageOnly(`
      <div class="tb-card" style="width: 460px">
        <div class="tb-card-header"><h3 class="tb-card-title">Orders per week</h3></div>
        <div class="tb-card-body">
          ${chartSvg()}
          <div class="tb-legend tb-legend--inline" style="margin-top: var(--tb-space-2)"><span class="tb-legend-item"><span class="tb-swatch tb-tone-accent"></span>Orders</span><span class="tb-legend-item">Week 37 selected<span class="tb-legend-value">188</span></span></div>
        </div>
      </div>
    `, 'is-canvas')}
    <h3>Colour</h3>
    <ul class="doc-rules">
      <li>One series is <code>--tb-accent</code>. Categories with no meaning of their own (regions, products, segments) take <code>--tb-series-1</code> to <code>--tb-series-6</code> in order. A series that means something uses that meaning's token: risk is <code>--tb-prob-*</code>, a comparison period is <code>--tb-fg-subtle</code> dashed, totals and context are <code>--tb-fg-subtle</code>.</li>
      <li>Series that are statuses use the status's semantic token (danger, warning, success, accent), the same as its tag. A neutral group is <code>--tb-border-strong</code>.</li>
      <li>Grid lines are <code>--tb-border</code>, axis and tick text <code>--tb-fg-muted</code> at <code>--tb-text-xs</code>, the plot background is the card surface. No raw colours, not even in a gradient; mix tokens with <code>color-mix()</code> for a ramp.</li>
    </ul>
    <h3>Axes, legends and tooltips</h3>
    <ul class="doc-rules">
      <li>Tick labels and every value in a tooltip go through the shared formatters, with tabular figures. Show at most five ticks on an axis.</li>
      <li>Every chart with more than one series has a <code>tb-legend</code>. A legend row that filters the chart is a button with <code>aria-pressed</code>.</li>
      <li>Tooltips use the <code>tb-tooltip</code> box: a title, then one row per series with its swatch, name and value. They follow the pointer and also open on keyboard focus of a mark.</li>
    </ul>
    <h3>Hover and selection</h3>
    <ul class="doc-rules">
      <li>Hovering a mark highlights it and its legend row. Selecting it keeps the highlight and dims every other mark to 0.3 opacity.</li>
      <li>A selection filters the rest of the page, and a chip in the toolbar says so and removes it.</li>
      <li>Marks that can be selected are focusable, arrow keys move between them, Enter or Space selects, and Escape removes the newest filter.</li>
    </ul>
    <h3>Sparklines and churn risk</h3>
    <ul class="doc-rules">
      <li>A sparkline sits in <code>tb-stat-spark</code>, 96 by 28 pixels, one line in <code>currentColor</code> with no axes. It shows the trend; the stat shows the value.</li>
      <li>A churn risk is always the number, the band colour and a bar together: <code>tb-prob</code> with <code>tb-prob-bar</code>. Bands are low under 10&nbsp;%, mid from 10&nbsp;% up to 40&nbsp;%, high over 40&nbsp;%, from the shared <code>band()</code>.</li>
    </ul>
    <div class="tb-row tb-gap-6" style="margin: var(--tb-space-3) 0 var(--tb-space-5)">
      <span class="tb-prob tb-prob--low">4.1&nbsp;%<span class="tb-prob-bar" style="--value: 4.1"></span></span>
      <span class="tb-prob tb-prob--mid">27.0&nbsp;%<span class="tb-prob-bar" style="--value: 27"></span></span>
      <span class="tb-prob tb-prob--high">72.4&nbsp;%<span class="tb-prob-bar" style="--value: 72.4"></span></span>
    </div>`,
}

/* ------------------------------------------------------------------------------------------
   Tree views
   ------------------------------------------------------------------------------------------ */

const colRow = (name, share, meta, prob, band, state = '') => `
          <li class="tb-list-item${state}" style="flex-direction: column; align-items: stretch; gap: var(--tb-space-1)">
            <span class="tb-row" style="flex-wrap: nowrap"><a class="tb-list-item-link tb-list-item-title" href="#tree-views" style="flex: 1">${name}</a>${I.chevronRight}</span>
            <span class="tb-bar tb-bar--sm${state ? ' tb-tone-accent' : ''}" style="--value: ${share}"></span>
            <span class="tb-row" style="justify-content: space-between; font-size: var(--tb-text-sm)"><span class="tb-text--muted tb-num">${meta}</span><span class="tb-prob tb-prob--${band}">${prob}</span></span>
          </li>`

const icicle = [
  ['All revenue', 100, 'mid', '10.3 %'],
  ['Asia Pacific', 23, 'low', '9.4 %'],
  ['India', 3, 'high', '43.0 %'],
]

const DOC_TREE = {
  id: 'root', label: 'All revenue', value: 17012331, risk: 0.103, children: [
    { id: 'na', label: 'North America', value: 6761000, risk: 0.096, children: [{ id: 'US', label: 'United States', value: 5639000, risk: 0.102 }, { id: 'CA', label: 'Canada', value: 1122000, risk: 0.063 }] },
    { id: 'eu', label: 'Europe', value: 5544000, risk: 0.087, children: [{ id: 'DE', label: 'Germany', value: 1624000, risk: 0.097 }, { id: 'GB', label: 'United Kingdom', value: 1297000, risk: 0.124 }, { id: 'FR', label: 'France', value: 1079000, risk: 0.158 }, { id: 'NL', label: 'Netherlands', value: 735000, risk: 0.084 }, { id: 'ES', label: 'Spain', value: 360000, risk: 0.084 }, { id: 'SE', label: 'Sweden', value: 449000, risk: 0.129 }] },
    { id: 'apac', label: 'Asia Pacific', value: 3845000, risk: 0.094, children: [{ id: 'JP', label: 'Japan', value: 1562000, risk: 0.071 }, { id: 'AU', label: 'Australia', value: 1102000, risk: 0.112 }, { id: 'SG', label: 'Singapore', value: 750000, risk: 0.046 }, { id: 'IN', label: 'India', value: 431000, risk: 0.43 }] },
    { id: 'latam', label: 'Latin America', value: 863000, risk: 0.054, children: [{ id: 'BR', label: 'Brazil', value: 341000, risk: 0.061 }, { id: 'MX', label: 'Mexico', value: 274000, risk: 0.048 }, { id: 'CL', label: 'Chile', value: 140000, risk: 0.052 }, { id: 'AR', label: 'Argentina', value: 108000, risk: 0.05 }] },
  ],
}

const treeViews = {
  mount(section) {
    const card = section.querySelector('[data-doc-tree]')
    if (!card) return
    Promise.all([import('../../src/tree.js'), import('../../src/format.js')]).then(([{ mountTree }, { fmtEurCompact }]) => mountTree(card, {
      root: DOC_TREE, title: 'Revenue by region and country', size: n => n.value, sizeLabel: 'Revenue', sizeText: n => fmtEurCompact(n.value),
      score: n => n.risk, scoreName: 'Churn risk', noun: (n, c) => (n.id === 'root' ? (c === 1 ? 'region' : 'regions') : c === 1 ? 'country' : 'countries'),
      collapsed: ['eu', 'apac', 'latam'], mode: 'columns', storageKey: 'doc-tree-view',
    }))
  },
  id: 'tree-views',
  title: 'Tree views',
  lead: 'Three ways to read the same revenue hierarchy, for three different questions.',
  body: `
    <p><code>src/tree.js</code> draws any hierarchy in one card with four views and a switch: Tree, Columns, Icicle and Table. Clicking a node with children selects it and opens or closes it: the children grow out of it one after another, the clicked branch stays still, and a tall branch zooms out to fit, never below 60&nbsp;%. A closed branch is a deck of two outlines and says how many children it holds. The wheel zooms the Tree while the pointer is over it; outside it the page scrolls. The example below is the component, on revenue by region and country.</p>
    <div class="doc-example"><div class="doc-example-stage is-block is-canvas"><section class="tb-card" data-doc-tree style="--tb-tree-height: 440px"></section></div></div>
    ${codeOnly(`import { mountTree } from './src/tree.js'

const tree = mountTree(card, {
  root,                                  // { id, label, children } all the way down
  title: 'Revenue by region and country',
  size: n => n.value, sizeLabel: 'Revenue', sizeText: n => fmtEurCompact(n.value),
  score: n => n.risk, scoreName: 'Churn risk',   // optional, on the probability bands
  noun: (n, count) => 'countries',
  collapsed: ['eu'], mode: 'columns',
  onSelect: node => renderInspector(node),
})
tree.select('DE', true)`)}
    <p>The table below says what three of the views are for. All views share the selection, the churn risk bands and the breadcrumbs, so a person can switch view without losing their place.</p>
    <table class="doc-table">
      <thead><tr><th>View</th><th>What it shows</th><th>Use it to</th></tr></thead>
      <tbody>
        <tr><td>Tree</td><td>Nodes and links, each node with its name, revenue and churn risk. Pans and zooms.</td><td>Show the whole hierarchy at once: how revenue splits from region to country to product, in a demo or a review.</td></tr>
        <tr><td>Columns</td><td>One column per level. Choosing a row opens its children in the next column.</td><td>Walk down from a region to a country to a product quickly and compare siblings at one level.</td></tr>
        <tr><td>Icicle</td><td>Levels left to right, each node as tall as its share of the revenue.</td><td>See where the revenue is, and which large regions or countries carry a high churn risk.</td></tr>
      </tbody>
    </table>
    <h3>One column of the Columns view</h3>
    <p>A column is a <code>tb-list--divided</code>: the name as title, a <code>tb-bar</code> for the share of the parent, then the revenue and the churn risk. The row on the open path is selected.</p>
    ${stageOnly(`
      <div class="tb-card" style="width: 280px; overflow: hidden">
        <div class="tb-card-header tb-card-header--plain" style="background: var(--tb-bg-sunken)"><span class="tb-caps">Asia Pacific</span></div>
        <ul class="tb-list tb-list--divided">
          ${colRow('Japan', 41, '1.6M&nbsp;€', '7.1&nbsp;%', 'low')}
          ${colRow('Australia', 29, '1.1M&nbsp;€', '11.2&nbsp;%', 'mid')}
          ${colRow('India', 11, '431k&nbsp;€', '43.0&nbsp;%', 'high', ' is-selected')}
        </ul>
      </div>
    `, 'is-canvas')}
    <h3>One strip of the Icicle view</h3>
    <p>Each box is as tall as its share of the revenue and tinted with its band colour. The path to the selected node reads from left to right.</p>
    ${stageOnly(`
      <div style="display: flex; align-items: flex-start; gap: 2px; height: 200px; width: 540px">
        ${icicle.map(([name, share, band, prob]) => `
        <div style="flex: 1; height: ${share}%; min-height: 44px; padding: var(--tb-space-2); overflow: hidden; background: color-mix(in oklab, var(--tb-prob-${band}) 14%, var(--tb-bg-surface)); box-shadow: inset 3px 0 0 var(--tb-prob-${band})">
          <div style="font-size: var(--tb-text-sm); font-weight: var(--tb-weight-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${name.replace(' €', '&nbsp;€')}</div>
          <div class="tb-num tb-text--sm tb-text--muted">${prob.replace(' %', '&nbsp;%')}</div>
        </div>`).join('')}
      </div>
    `, 'is-canvas')}
    ${rules([
      'Open on the Tree for a new report, and remember the last view a person used after that.',
      'Show the name of a node in words, its revenue and its churn risk in every view. Never the churn risk alone.',
      'Selecting a node in any view updates the inspector, the breadcrumbs and the other views.',
      'Tint by churn risk band only. The accent marks the selection and the open path, never a band.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Edit mode
   ------------------------------------------------------------------------------------------ */

const miniChart = icons => icons === P
  ? '<svg viewBox="0 0 400 96" aria-hidden="true"><!-- chart --></svg>'
  : `<svg viewBox="0 0 400 96" width="100%" height="96" preserveAspectRatio="none" aria-hidden="true" style="display: block">
      <path d="M0 70 L40 52 L80 60 L120 34 L160 44 L200 22 L240 36 L280 18 L320 30 L360 12 L400 20 L400 96 L0 96Z" style="fill: var(--tb-accent); fill-opacity: 0.1" />
      <polyline points="0,70 40,52 80,60 120,34 160,44 200,22 240,36 280,18 320,30 360,12 400,20" fill="none" style="stroke: var(--tb-accent)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    </svg>`

const editToolbar = (i, title) => `
      <div class="tb-edit-toolbar" role="toolbar" aria-label="Layout of ${title}">
        <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-edit-handle" type="button" aria-roledescription="drag handle" aria-label="Move ${title}, with the arrow keys">${i.gripVertical}</button>
        <span class="tb-divider tb-divider--vertical"></span>
        <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" aria-label="Move ${title} up">${i.arrowUp}</button>
        <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" aria-label="Move ${title} down">${i.arrowDown}</button>
        <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-edit-delete" type="button" aria-label="Remove ${title}">${i.trash}</button>
      </div>`

const editDemo = i => `
    <main class="tb-page-main tb-edit-grid tb-edit">
      <div class="tb-edit-bar" style="position: static">
        <span class="tb-edit-bar-title">${i.pencilRuler}Editing layout</span>
        <span class="tb-edit-bar-hint">Drag a section by its handle: beside another to make a column, above or below to stack.</span>
        <div class="tb-edit-bar-actions">
          <button class="tb-button" type="button" aria-haspopup="dialog">${i.plus}Add widget</button>
          <button class="tb-button" type="button" disabled>${i.rotateCcw}Reset layout</button>
          <button class="tb-button tb-button--primary" type="button">${i.check}Done</button>
        </div>
      </div>
      <div class="tb-edit-row">
        <div class="tb-edit-col" style="--span: 8">
              <section class="tb-card tb-edit-section is-anchor is-active" data-tb-section="volume">
                <div class="tb-card-header"><h3 class="tb-card-title">Daily volume</h3></div>
                <div class="tb-card-body">${miniChart(i)}</div>${editToolbar(i, 'Daily volume')}
              </section>
          <div class="tb-edit-resize" role="separator" aria-orientation="vertical" tabindex="0" aria-label="Column width"></div>
        </div>
        <div class="tb-edit-col" style="--span: 4">
              <section class="tb-card tb-edit-section is-anchor" data-tb-section="summary">
                <div class="tb-card-header"><h3 class="tb-card-title">Account summary</h3></div>
                <div class="tb-card-body">
                  <dl class="tb-dl tb-dl--dense">
                    <div><dt>Account</dt><dd>AC-1228</dd></div>
                    <div><dt>Owner</dt><dd>Maya Chen</dd></div>
                    <div><dt>Orders</dt><dd>214</dd></div>
                  </dl>
                </div>${editToolbar(i, 'Account summary')}
              </section>
        </div>
      </div>
    </main>`

const dropDemo = () => `
    <main class="tb-page-main tb-edit-grid tb-edit" style="max-width: 560px">
      <div class="tb-edit-row">
        <div class="tb-edit-col" style="--span: 6">
          <section class="tb-card tb-edit-section" data-tb-section="at-risk">
            <div class="tb-card-header"><h3 class="tb-card-title">At risk</h3></div>
            <div class="tb-card-body tb-stat tb-stat--lg"><span class="tb-stat-value">88</span></div>
          </section>
        </div>
        <div class="tb-edit-col" style="--span: 6">
          <section class="tb-card tb-edit-section" data-tb-section="paused">
            <div class="tb-card-header"><h3 class="tb-card-title">Paused</h3></div>
            <div class="tb-card-body tb-stat tb-stat--lg"><span class="tb-stat-value">41</span></div>
          </section>
        </div>
      </div>
      <div class="tb-edit-drop" style="left: calc(50% - 1.5px); top: var(--tb-space-3); bottom: var(--tb-space-3)" aria-hidden="true"></div>
    </main>`

const catalogDemo = () => `
    <div class="tb-widget-catalog" style="width: 100%; max-width: 480px; grid-template-columns: repeat(2, minmax(0, 1fr))">
      <h3 class="tb-widget-catalog-title">Charts</h3>
      <button class="tb-widget-option" type="button">
        <span class="tb-widget-option-preview"><svg viewBox="0 0 112 48" aria-hidden="true">${[18, 26, 22, 32, 28, 38, 34].map((h, k) => `<rect x="${8 + k * 14}" y="${44 - h}" width="8" height="${h}" rx="1" style="fill: currentColor" />`).join('')}</svg></span>
        <span class="tb-widget-option-text"><span class="tb-widget-option-name">Bar chart</span><span class="tb-widget-option-desc">Orders per week, latest week highlighted.</span></span>
      </button>
      <button class="tb-widget-option" type="button">
        <span class="tb-widget-option-preview"><svg viewBox="0 0 112 48" aria-hidden="true"><polyline points="4,38 20,30 36,33 52,20 68,24 84,12 108,8" fill="none" stroke="currentColor" stroke-width="2" /></svg></span>
        <span class="tb-widget-option-text"><span class="tb-widget-option-name">Line chart</span><span class="tb-widget-option-desc">Orders per day over the quarter.</span></span>
      </button>
    </div>`

const MOUNT = `
// Mounted on every page whose main marks its sections.
import { mountEditMode } from './src/edit.js'

const edit = mountEditMode({
  main: document.querySelector('main.tb-page-main'),
  page: 'dashboard',     // layout saved under tb-layout:dashboard
  button: editButton,    // toggles edit mode, carries aria-pressed
  widgets,               // the product's catalogue of widget types
})
edit.enter()  edit.exit()  edit.toggle()  edit.reset()  edit.addWidget('bars')

<!-- A movable section is a direct child of main. A column of cards is one section. -->
<section class="tb-card" data-tb-section="line">...</section>
<div class="an-side" data-tb-section="side" data-tb-label="Account inspector">...</div>
<!-- data-tb-span gives the width of a section that is hidden when the layout is measured -->
<section class="tb-card" data-tb-section="columns" data-tb-span="9">...</section>`

const editMode = {
  id: 'edit-mode',
  title: 'Edit mode',
  lead: 'A layout editor for the pages people shape themselves: move, resize, remove and add sections.',
  body: `
    <p>Edit mode is for free pages, the ones a person shapes, such as the Layout editor page. A fixed page such as Accounts keeps its own cards in place and takes widgets in its zone instead (see Stage zone). The Edit page layout button turns the page into its own layout editor. It acts on the page, so it leads the page's actions in the page toolbar, beside Export and the rest, and never sits in the app bar. The page becomes rows of columns: a row runs the full width, its columns share it, and each column stacks its sections. The gutters carry a faint hatch. Each section gets a floating toolbar on hover or focus: a drag handle, move up and down, and remove. A row holds three columns at most. The line between two columns drags to resize them. A bar at the top says the page is being edited and holds Add widget, Add row, Reset layout and Done. Add row puts an empty row of three columns, 50, 25 and 25 %, at the end of the page; its columns stay when empty, and each shows a dashed Add widget slot (<code>tb-edit-hole</code>) while editing. A row left with nothing in it goes when editing ends. A new widget lands in the empty column it was asked for, or else the first empty column, or else in a row of its own at the end of the page, or, on a fitted page, under the widest column of the last row.</p>
    ${example(editDemo, 'is-block is-canvas')}
    <h3>Dropping</h3>
    <p>While a section is dragged it lifts off the page with a large shadow and follows the pointer. Where it lands depends on where the pointer is over another section: its top or bottom half stacks it in that column, its left or right edge opens a new column there, and the top or bottom edge of a row opens a new row. <code>tb-edit-drop</code> marks the place: a vertical bar for a new column, a horizontal one (<code>tb-edit-drop--horizontal</code>) for a stack or a row. A second column splits the row in halves, and a third makes it 50, 25 and 25 %, the half going to the wider of the two already there. A row with three columns takes no fourth: the drop stacks in the column instead. Over an empty column the slot lights up and the section drops into it. On release every section slides to its new place.</p>
    ${stageOnly(dropDemo(), 'is-block is-canvas')}
    <h3>Widget catalogue</h3>
    <p>Add widget opens a dialog of widgets built only from system components (stat strip, stat with sparkline, bar, line and donut charts, list, description list, table, legend, callout, empty state) with figures from the shared data. Each <code>tb-widget-option</code> shows a small drawing, the name and what it holds, grouped under <code>tb-widget-catalog-title</code>.</p>
    ${stageOnly(catalogDemo(), 'is-canvas')}
    <h3>Mounting</h3>
    ${codeOnly(MOUNT)}
    <p>Classes: <code>tb-edit-grid</code> on the container, <code>tb-edit-row</code> for a row, <code>tb-edit-col</code> for a column with its width in <code>--span</code> (twelve to a row), <code>tb-edit-resize</code> for the line between columns, <code>tb-edit-hole</code> for the slot in an empty column of a row marked <code>data-tb-keep</code>, <code>tb-edit</code> while editing, <code>tb-edit-section</code> with the states <code>is-active</code>, <code>is-dragging</code>, <code>is-settling</code>, <code>is-removed</code> and <code>is-new</code>, then <code>tb-edit-toolbar</code>, <code>tb-edit-handle</code>, <code>tb-edit-drop</code>, <code>tb-edit-bar</code>, <code>tb-widget-catalog</code> and <code>tb-widget-option</code>.</p>
    ${rules([
      'What moves: the direct children of the page main marked <code>data-tb-section</code>. A column of several cards is one section. The app bar and the page toolbar never move.',
      'Columns share their row by weight, twelve to a row, three columns at most. The line between two neighbours snaps to a quarter, a third, a half, two thirds or three quarters of the row, and no column goes under a quarter. Under 900px every column takes the full width.',
      'Remove hides the section and says so in a toast with Undo. A page\'s own sections are never destroyed and come back with Reset layout; an added widget is deleted.',
      'Reset layout brings back the page\'s own order, widths and sections, removes added widgets, and offers Undo in a toast.',
      'Every change is saved as it happens, in <code>localStorage</code> under <code>tb-layout:&lt;page&gt;</code>, on this computer only, as rows of columns (version 2; a version 1 layout is converted on load). With no saved edit the page keeps its own grid, exactly as designed.',
      'Keyboard: Tab reaches each handle and each line between columns. On a handle, up and down move the section through its column and out into a new row, left and right move it to the next column, Home and End send it first or last. On a line, left and right resize. Esc cancels a drag or leaves edit mode. Every move is announced.',
      'Sections settle into place in about 240ms with the system ease, when a section moves and when the editor opens or closes. Opening, the editing bar fades in while the sections make room. With reduced motion everything moves at once.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Stage zone
   ------------------------------------------------------------------------------------------ */

const zoneDemo = i => `
    <div class="tb-stack" style="width: 340px; gap: var(--tb-space-3)">
      <section class="tb-card">
        <div class="tb-card-header"><h3 class="tb-card-title">Accounts</h3></div>
        <div class="tb-card-body tb-text tb-text--sm tb-text--muted">A card of the page. It stays where it is.</div>
      </section>
      <div class="tb-zone tb-edit is-editing" data-tb-zone="the side column" data-tb-zone-max="2" data-tb-zone-widgets="summary,kpi,bars,note">
        <section class="tb-callout tb-edit-section is-active" data-tb-widget="note" aria-label="Note">
          ${i.fileText}<div class="tb-callout-content"><strong class="tb-callout-title">Note</strong><p>Call the two at-risk accounts before Friday.</p></div>
          <div class="tb-edit-toolbar" role="toolbar" aria-label="Place of Note">
            <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" aria-label="Move Note up" disabled>${i.arrowUp}</button>
            <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" aria-label="Move Note down" disabled>${i.arrowDown}</button>
            <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-edit-delete" type="button" aria-label="Remove Note">${i.trash}</button>
          </div>
        </section>
        <button class="tb-zone-slot tb-zone-add" type="button"><span class="tb-zone-add-icon">${i.plus}</span><span class="tb-zone-add-label">Add widget</span><span class="tb-zone-count">1 of 2 in the side column</span></button>
      </div>
    </div>`

const ZONE_MOUNT = `
// Mounted on a stage whose main holds a zone.
import { mountZone } from './src/zone.js'

const zone = mountZone({ zone, page: 'accounts', button: editButton, stage: 'Accounts', widgets })
zone.enter()  zone.exit()  zone.toggle()  zone.isEditing()`

const stageZone = {
  id: 'stage-zone',
  title: 'Stage zone',
  lead: 'A fixed page keeps its own cards and leaves one place for widgets people add.',
  body: `
    <p>A fixed page such as Accounts is a tool with a fixed job, so its own cards, its core, never move and never go. Some pages leave one place for the widgets a person adds, the zone, usually under the side column. The layout button in the page toolbar, labelled Add widgets on such a page, opens it. A bar above the page says what stays and how many widgets fit, the zone shows the Add widget slot (<code>tb-zone-add</code>) in the action colour, with a filled plus, the brand stacks faint in its corner and the count, pulsing once as adding starts, and each widget gets a toolbar to move it up or down or remove it. Once the zone is full, the slot turns into <code>tb-zone-full</code>, a blocked area in amber diagonal stripes with a warning icon, the count and a Make a page button. It uses warning and never danger, because nothing went wrong: a limit is reached.</p>
    ${example(zoneDemo, 'is-canvas')}
    ${codeOnly(ZONE_MOUNT)}
    <p>Classes: <code>tb-zone</code>, with <code>tb-edit</code> and <code>is-editing</code> while adding, and <code>tb-zone-slot</code> on the slot or on <code>tb-zone-full</code>. The widgets reuse <code>tb-edit-section</code>, <code>tb-edit-toolbar</code>, <code>tb-edit-bar</code> and the widget catalogue from edit mode.</p>
    ${rules([
      'Mark the zone with <code>data-tb-zone</code> (the place, named for a sentence, such as "the side column"), <code>data-tb-zone-max</code> (the cap) and <code>data-tb-zone-widgets</code> (the catalogue types that fit there). The catalogue shows only those.',
      'An empty zone takes no room, so the page looks as designed until someone adds to it.',
      'Keep caps small, two or three. A fixed page that needs more has turned into a free page.',
      'Remove says so in a toast with Undo. The widgets are saved as they change, under <code>tb-zone:&lt;page&gt;</code>, on this computer only.',
      'Esc or Done leaves. Every add, move and removal is announced.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Collapse
   ------------------------------------------------------------------------------------------ */

const collapseDemo = i => `
    <div class="tb-stack" style="width: 420px; gap: var(--tb-space-3)">
      <section class="tb-card is-collapsed" id="doc-collapse-a">
        <div class="tb-card-header"><h3 class="tb-card-title">Accounts</h3>
          <div class="tb-card-actions">
            <span class="tb-text tb-text--sm tb-text--muted">480 accounts</span>
            <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-card-collapse" type="button" aria-controls="doc-collapse-a" aria-expanded="false" aria-label="Show Accounts">${i.chevronUp}</button>
          </div>
        </div>
        <div class="tb-card-body">The table of accounts.</div>
      </section>
      <section class="tb-card" id="doc-collapse-b">
        <div class="tb-card-header"><h3 class="tb-card-title">Recent activity</h3>
          <div class="tb-card-actions">
            <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-card-collapse" type="button" aria-controls="doc-collapse-b" aria-expanded="true" aria-label="Collapse Recent activity">${i.chevronUp}</button>
          </div>
        </div>
        <div class="tb-card-body tb-text tb-text--sm tb-text--muted">The last things that happened to the account.</div>
      </section>
    </div>`

const collapse = {
  id: 'collapse',
  title: 'Collapse',
  lead: 'Fold a card down to its header to make room for a while.',
  body: `
    <p>Every titled card in the page main carries <code>tb-card-collapse</code>, a minimal chevron, last in its header actions. It folds the card down to its header and opens it again. While the card is folded, <code>is-collapsed</code> hides its body, its footer and its other header actions, and lets go of any fixed height the page gave it. The chevron turns to point down.</p>
    ${example(collapseDemo, 'is-canvas')}
    <p>The behaviour is <code>src/collapse.js</code>. Import it once and it works on every page. It also adds the button to cards drawn later, such as widgets.</p>
    ${rules([
      'It lasts until reload. It is for making room while working and never changes the saved layout.',
      'Left out: a card with no title (a stat strip), a card inside another card, and a card that is a whole pane of a fitted page, where folding would leave an empty column. <code>data-tb-no-collapse</code> opts a card out.',
      'The cards of a fixed page collapse like any other. That is how such a page gives room back without anyone moving its cards.',
      'The button is labelled Collapse or Show and the card name, with <code>aria-expanded</code> and <code>aria-controls</code>.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Expand
   ------------------------------------------------------------------------------------------ */

const expandCard = i => `
    <section class="tb-card" style="width: 460px">
      <div class="tb-card-header">
        <h3 class="tb-card-title">Orders per week</h3>
        <div class="tb-card-actions">
          <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-card-expand" type="button" data-tb-expand aria-label="Expand orders per week">${i.maximize}</button>
        </div>
      </div>
      <div class="tb-card-body">${i === P ? '<svg viewBox="0 0 420 180"><!-- chart --></svg>' : chartSvg()}</div>
    </section>`

const expandStage = `
    ${expandCard(I).replace('data-tb-expand', 'data-tb-dialog-open="doc-expand-demo"')}
    <div class="tb-dialog-backdrop" id="doc-expand-demo">
      <div class="tb-dialog tb-dialog--full" role="dialog" aria-modal="true" aria-labelledby="doc-expand-demo-title">
        <div class="tb-dialog-header">
          <h2 class="tb-dialog-title" id="doc-expand-demo-title">Orders per week</h2>
          <span class="tb-legend tb-legend--inline"><span class="tb-legend-item"><span class="tb-swatch tb-tone-accent"></span>Orders</span></span>
          <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon" type="button" data-tb-dialog-close aria-label="Close">${I.x}</button>
        </div>
        <div class="tb-dialog-body">
          <div class="tb-card-expand-view"><div style="max-width: 760px">${chartSvg()}</div></div>
        </div>
      </div>
    </div>`

const EXPAND_CODE = `
<div class="tb-card-actions">
  <!-- other actions first -->
  <button class="tb-button tb-button--minimal tb-button--sm tb-button--icon tb-card-expand"
    type="button" data-tb-expand aria-label="Expand daily volume" data-tb-tooltip="Expand">
    <svg class="tb-icon" aria-hidden="true"><!-- maximize-2 --></svg>
  </button>
</div>

// src/expand.js opens it. A page that can draw the chart at any size hands it over:
import { setExpandRender, expandButton } from './src/expand.js'
setExpandRender(card, host => { host.append(canvas); fit(); return () => { home.append(canvas); fit() } })`

const expand = {
  id: 'expand',
  title: 'Expand',
  lead: 'Any chart, seen full screen.',
  body: `
    <p>A chart card carries <code>tb-card-expand</code>, a minimal icon button, last in its header actions. It opens the chart in a <code>tb-dialog--full</code>: the dialog fills the window short of a small margin, keeps the card title and the legends from the card header, and shows the chart large in <code>tb-card-expand-view</code>. Try it on the card below.</p>
    ${stageOnly(expandStage, 'is-canvas')}
    ${codeOnly(EXPAND_CODE)}
    ${rules([
      'Every chart gets the button: the charts on the Dashboard, the chart blocks on pages people build, the tree canvas and the chart widgets. Tables and lists do not.',
      'The page draws the chart again at the larger size when it can. Otherwise the SVG is copied and scaled through its viewBox, at most 1.8 times, so the text stays in proportion.',
      'Esc, the close button and a click on the backdrop close it, and focus goes back to the expand button.',
      'The full view is for reading. Filters and selections stay on the page, except on a live canvas the page moves in, such as the tree, which keeps its pan, zoom and selection.',
      'Label the button "Expand" and the chart name, with the tooltip Expand.',
    ])}`,
}

const cardFocus = {
  id: 'card-focus',
  title: 'Card focus',
  lead: 'Hold a card header to work on that card alone.',
  body: `
    <p>Pressing and holding the header of a card in the page for half a second brings that card forward. Everything around it blurs, dims and turns inert, and the card lifts with a large shadow, still fully usable: its filters, switches, menus and table work as before. Esc or a click anywhere outside brings the page back. While the pointer is held, four small dots circle it for the length of the hold, then open out as the card comes forward, so the press reads as something happening before it happens.</p>
    <p>The behaviour is <code>src/focus.js</code>. Import it once and it works on every page. It sets <code>tb-focus-on</code> on <code>&lt;html&gt;</code>, <code>is-focused</code> on the card, <code>tb-focus-dim</code> and <code>inert</code> on everything around it, and draws <code>tb-hold-ring</code> at the pointer.</p>
    ${rules([
      'Only a card with a <code>tb-card-header</code>, inside the page main. The app bar, dialogs and the docs never take part.',
      'A press on a button, link, field, switch or menu in the header does what it always did and never starts a hold. So does a press that moves more than a few pixels, which reads as a drag or a text selection.',
      'The layout editor turns it off, because there the header is where sections are dragged.',
      'Keyboard focus moves into the card, so Tab stays inside it, and goes back where it was when the page returns. The change is announced.',
      'Esc first closes a menu or dialog open from the card, and only then brings the page back.',
      'With reduced motion there are no dots and no fades; the hold still works.',
    ])}`,
}

export const sections = [avatar, dl, stat, chipGroup, breadcrumbs, toolbar, filterRail, list, legend, timeline, appShell, editMode, stageZone, expand, collapse, cardFocus]
export const dataSections = [dataVis, treeViews]
