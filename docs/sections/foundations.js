// Foundations: the rules and tokens every element is built on.
// Each example renders its markup live and prints the same string, escaped, underneath.

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function dedent(s) {
  const lines = s.replace(/^\n+/, '').replace(/\s+$/, '').split('\n')
  const indent = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length))
  return lines.map(l => l.slice(indent)).join('\n')
}

function example(markup, stage = '') {
  const m = dedent(markup)
  return `
    <div class="doc-example">
      <div class="doc-example-stage${stage ? ` ${stage}` : ''}">${m}</div>
      <pre class="doc-example-code">${esc(m)}</pre>
    </div>`
}

const rules = items => `<ul class="doc-rules">${items.map(i => `<li>${i}</li>`).join('')}</ul>`

const doDont = (d, dont) => `
  <div class="doc-do-dont">
    <div class="doc-do"><strong>Do</strong>${d}</div>
    <div class="doc-dont"><strong>Don't</strong>${dont}</div>
  </div>`

const table = (head, rows) => `
  <table class="doc-table">
    <thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`

/* Colour */

const colourGroups = [
  ['Surfaces', [
    ['--tb-bg-canvas', 'Page background behind panels'],
    ['--tb-bg-surface', 'Panels, tables, cards'],
    ['--tb-bg-raised', 'Floating layers: menus, dialogs. Also fields, so they stand off a card in the dark theme'],
    ['--tb-bg-sunken', 'Wells, code, inset areas'],
    ['--tb-bg-hover', 'Row and control hover'],
    ['--tb-bg-active', 'Pressed state'],
    ['--tb-bg-selected', 'Selected row or item'],
    ['--tb-bg-overlay', 'Scrim behind a dialog'],
  ]],
  ['Text', [
    ['--tb-fg', 'Default text and numbers'],
    ['--tb-fg-muted', 'Labels, secondary text'],
    ['--tb-fg-subtle', 'Placeholders, empty cells'],
    ['--tb-fg-on-accent', 'Text on an accent fill'],
    ['--tb-fg-link', 'Links'],
  ]],
  ['Borders', [
    ['--tb-border', 'Default divider between surfaces'],
    ['--tb-border-strong', 'Control outlines'],
    ['--tb-border-focus', 'Keyboard focus ring'],
  ]],
  ['Accent', [
    ['--tb-accent', 'Primary action, selection'],
    ['--tb-accent-hover', 'Primary action on hover'],
    ['--tb-accent-active', 'Primary action pressed'],
    ['--tb-accent-soft', 'Tinted selection background'],
  ]],
  ['Semantic', [
    ['--tb-danger', 'Errors, destructive actions'],
    ['--tb-danger-hover', 'Destructive action on hover'],
    ['--tb-danger-soft', 'Error background'],
    ['--tb-warning', 'Needs attention'],
    ['--tb-warning-hover', 'Warning action on hover'],
    ['--tb-warning-soft', 'Warning background'],
    ['--tb-success', 'Done, passed'],
    ['--tb-success-hover', 'Success action on hover'],
    ['--tb-success-soft', 'Success background'],
  ]],
  ['Product semantics', [
    ['--tb-ai', 'Value suggested by the model'],
    ['--tb-ai-soft', 'Background of an AI marker'],
    ['--tb-confirmed', 'Value confirmed by a person'],
    ['--tb-confirmed-soft', 'Background of a confirmed marker'],
  ]],
  ['Probability', [
    ['--tb-prob-low', 'Under 10 %'],
    ['--tb-prob-mid', '10 to 40 %'],
    ['--tb-prob-high', 'Over 40 %'],
  ]],
  ['Chart series', [
    ['--tb-series-1', 'First series, blue'],
    ['--tb-series-2', 'Second series, orange'],
    ['--tb-series-3', 'Third series, teal'],
    ['--tb-series-4', 'Fourth series, violet'],
    ['--tb-series-5', 'Fifth series, amber'],
    ['--tb-series-6', 'Sixth series and comparisons, grey'],
  ]],
  ['Brand', [
    ['--tb-brand-1', 'Brand blue, blue 500'],
    ['--tb-brand-2', 'Brand red, red 500'],
    ['--tb-brand-3', 'Brand orange, orange 500'],
    ['--tb-brand-4', 'Brand ink, light in the dark theme'],
  ]],
]

const swatches = list => `
  <div class="doc-swatches">
    ${list.map(([token, use]) => `
      <div class="doc-swatch-card">
        <div class="chip" style="background: var(${token})"></div>
        <div class="meta"><strong>${token}</strong><span>${use}</span></div>
      </div>`).join('')}
  </div>`

/* Typography */

const typeScale = [
  ['--tb-text-3xl', '32px', 'Token only', 'Key figures on a dashboard'],
  ['--tb-text-2xl', '24px', '<code>tb-h1</code>', 'Page title'],
  ['--tb-text-xl', '18px', '<code>tb-h2</code>', 'Section title'],
  ['--tb-text-lg', '15px', '<code>tb-h3</code>', 'Panel and dialog title'],
  ['--tb-text-md', '13px', '<code>tb-text</code>, <code>tb-h4</code>', 'Body, controls, table cells'],
  ['--tb-text-sm', '12px', '<code>tb-text--sm</code>, <code>tb-caps</code>', 'Help text, labels, column headers, captions'],
  ['--tb-text-xs', '11px', '', 'Chart axes, markers, timestamps'],
]

/* Spacing */

const spaceScale = [
  ['--tb-space-1', '4px', 'Icon to label, tight inline gaps'],
  ['--tb-space-2', '8px', 'Padding in small controls, gap between controls'],
  ['--tb-space-3', '12px', 'Padding in controls and table cells'],
  ['--tb-space-4', '16px', 'Padding in panels, gap between groups'],
  ['--tb-space-5', '20px', 'Padding in dialogs'],
  ['--tb-space-6', '24px', 'Gap between blocks in a panel'],
  ['--tb-space-8', '32px', 'Gap between sections'],
  ['--tb-space-10', '40px', 'Page margins'],
  ['--tb-space-12', '48px', 'Page margins on wide screens'],
]

/* Icons: Lucide on its 24 grid, 16px on screen */

const icon = paths =>
  `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`

// From lucide-static, copied as they ship.
const libraryIcons = [
  ['search', icon('<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />')],
  ['x', icon('<path d="M18 6 6 18" /><path d="m6 6 12 12" />')],
  ['chevron-right', icon('<path d="m9 18 6-6-6-6" />')],
  ['download', icon('<path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" />')],
  ['database', icon('<ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" />')],
  ['tag', icon('<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />')],
  ['file-text', icon('<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />')],
  ['sparkles', icon('<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" />')],
  ['trending-up', icon('<path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />')],
]

// Drawn for Tabula because the library has no match, on the same grid and stroke.
const productIcons = [
  ['hierarchy tree', icon('<path d="M12 3.75v4.5M12 8.25 6 14.25M12 8.25l6 6" /><path d="M4.125 14.25h3.75v4.5h-3.75zM16.125 14.25h3.75v4.5h-3.75z" />')],
]

const iconRow = list => list.map(([name, svg]) => `<span class="tb-row tb-gap-1">${svg}<span class="tb-text--sm">${name}</span></span>`).join('\n')

export const sections = [
  {
    id: 'principles',
    title: 'Principles',
    lead: 'Five rules behind every decision in the system. When a situation is not covered, apply these.',
    body: `
      <ol class="doc-rules">
        <li><strong>Dense but readable.</strong> People scan a lot of data at once. Keep rows tight, but never below 11px text or a 24px control.</li>
        <li><strong>Numbers first.</strong> Figures use tabular numerals, one format across the product, and the strongest contrast on the screen.</li>
        <li><strong>Borders over shadows.</strong> A 1px border separates surfaces. Only floating layers such as menus, popovers and dialogs cast a shadow.</li>
        <li><strong>One accent.</strong> Blue means you can act here or this is selected. It never carries a status.</li>
        <li><strong>AI is always marked.</strong> Any value the model suggested carries the AI marker until a person confirms it.</li>
      </ol>`,
  },
  {
    id: 'colour',
    title: 'Colour',
    lead: 'Use role tokens only. The palette values behind them will change with the brand, the roles will not.',
    body: `
      ${colourGroups.map(([name, list]) => `<h3>${name}</h3>${swatches(list)}`).join('')}
      <h3>Accent or semantic</h3>
      ${rules([
        'Accent is for interaction: the primary action, links, focus, selection.',
        'Semantic colours are for status: danger for errors and destructive actions, warning for things to check, success for things done.',
        'Probability tokens show churn risk bands and nothing else.',
        'AI tokens mark model output and nothing else.',
        'Series tokens colour chart categories that carry no meaning of their own, such as regions or products, in their order. A category that means something uses the token of that meaning instead.',
        'Brand tokens are decoration and nothing else. They never carry a status, so they borrow no meaning from the semantic colours.',
        'A colour never carries meaning alone. Pair it with text, an icon or a shape.',
      ])}
      ${doDont(
        'Show a failed import with the danger colour and a sentence that says what failed.',
        'Colour a status badge in the accent blue, or use warning orange to make a button stand out.',
      )}
      <h3>The stack</h3>
      <p>The brand is a stack: three tablets seen from the side, each shifted a step, in blue, orange and red. A tabula is a tablet to write on, and a stack of them is a stack of rows, which is what the system draws all day. It appears in two places. <code>tb-brand-mark</code> is the stack next to the product name, in the app bar and at the top of this site; it scales to any width and height, and on hover in the app bar its slabs fan out. <code>--tb-brand-pattern</code> is a tile of small stacks with the ink colour added, which every card header shows faintly behind its left edge, fading out to the right at <code>--tb-brand-pattern-opacity</code> (7&nbsp;% in the light theme, 10&nbsp;% in the dark). Children of the header sit above it.</p>
      <p>Add <code>tb-card-header--plain</code> to switch the pattern off where it would repeat too often or sit behind dense content: a column of small cards, a filter rail, a header that is itself a toolbar.</p>
      ${example(`
        <div class="tb-row tb-gap-3" style="align-items: flex-start">
          <div class="tb-card" style="width: 280px">
            <div class="tb-card-header"><h3 class="tb-card-title">Account inspector</h3></div>
            <div class="tb-card-body"><span class="tb-brand-mark" aria-hidden="true"></span> <span class="tb-text--sm tb-text--muted">tb-brand-mark</span></div>
          </div>
          <div class="tb-card" style="width: 280px">
            <div class="tb-card-header tb-card-header--plain"><h3 class="tb-card-title">Filters</h3></div>
            <div class="tb-card-body"><span class="tb-text--sm tb-text--muted">tb-card-header--plain</span></div>
          </div>
        </div>
      `, 'is-canvas')}
      ${rules([
        'The pattern belongs to card headers and the report page head. Do not put it on buttons, tables or the canvas.',
        'Never raise its opacity to make a card stand out. Emphasis comes from content and the accent.',
        'The stack keeps its three colours in both themes. In the pattern, only the ink slabs turn light on dark.',
      ])}`,
  },
  {
    id: 'typography',
    title: 'Typography',
    lead: 'Instrument Sans for everything, and a mono family for identifiers. Sizes step from 11px to 32px.',
    body: `
      ${table(['Sample', 'Token', 'Size', 'Class', 'Use'], typeScale.map(([token, size, cls, use]) => [
        `<span style="font-size: var(${token}); line-height: var(--tb-leading-tight)">Account 1228</span>`,
        `<code>${token}</code>`, size, cls, use,
      ]))}
      <h3>Family, weight, line height</h3>
      ${table(['Token', 'Value', 'Use'], [
        ['<code>--tb-font</code>', 'Instrument Sans, then the system sans stack', 'Everything. Shipped in <code>src/fonts</code> as a variable font, 400 to 700, so an offline install has it'],
        ['<code>--tb-font-brand</code>', 'The text face by default', 'The brand name beside the stack, and nothing else. A product sets its own brand face here'],
        ['<code>--tb-font-mono</code>', 'System mono stack', 'Identifiers, account IDs, rules, code'],
        ['<code>--tb-weight-regular</code>', '400', 'Body text'],
        ['<code>--tb-weight-medium</code>', '500', 'Names, labels of controls, tabs'],
        ['<code>--tb-weight-semibold</code>', '600', 'Headings and key figures'],
        ['<code>--tb-leading</code>', '1.45', 'Body text'],
        ['<code>--tb-leading-tight</code>', '1.25', 'Headings, figures, anything on one line'],
      ])}
      <h3>Headings and text</h3>
      ${example(`
        <div class="tb-stack tb-gap-2">
          <h1 class="tb-h1">Revenue, week 38</h1>
          <h2 class="tb-h2">Late orders</h2>
          <h3 class="tb-h3">Product breakdown</h3>
          <h4 class="tb-h4">Top products</h4>
          <p class="tb-text">Body text for descriptions and notes.</p>
          <p class="tb-text tb-text--sm tb-text--muted">Help text under a field.</p>
        </div>
      `, 'is-block')}
      <h3>Label, mono, tabular numbers</h3>
      ${example(`
        <div class="tb-stack tb-gap-1">
          <span class="tb-caps">Revenue</span>
          <span class="tb-mono">AC-1228</span>
          <span class="tb-num">1,204.50 €</span>
          <span class="tb-num">987.00 €</span>
        </div>
      `)}
      ${rules([
        'Links take <code>tb-link</code>, or are plain <code>a</code> elements, which get the same colour and hover underline.',
        '<code>tb-caps</code> is the label style, for column headers, group titles and field labels: sentence case, small, medium weight and muted. The name is older than the style. Keep labels to a few words.',
        '<code>tb-mono</code> is for identifiers a person may copy: account IDs, order numbers, hashes.',
        '<code>tb-num</code> gives tabular numerals so digits line up in columns. Use it on every figure.',
      ])}
      ${doDont(
        'Right-align numbers in a column and give them <code>tb-num</code> so the digits line up.',
        'Set a whole paragraph in mono, or write labels in capitals. Both slow reading down.',
      )}`,
  },
  {
    id: 'spacing',
    title: 'Spacing',
    lead: 'Every gap and padding is a step of the 4px scale. No other values.',
    body: `
      ${table(['Token', 'Size', 'Bar', 'Typical use'], spaceScale.map(([token, size, use]) => [
        `<code>${token}</code>`, size,
        `<span style="display: inline-block; vertical-align: middle; width: var(${token}); height: var(--tb-space-3); background: var(--tb-accent)"></span>`,
        use,
      ]))}
      <h3>Control heights</h3>
      ${table(['Token', 'Value', 'Use'], [
        ['<code>--tb-control-sm</code>', '24px', 'Controls in tables and dense toolbars (<code>--sm</code>)'],
        ['<code>--tb-control-md</code>', '30px', 'The default control, tabs, list rows'],
        ['<code>--tb-control-lg</code>', '40px', 'Standalone screens such as sign-in (<code>--lg</code>)'],
      ])}
      ${rules([
        'Padding inside a control comes from steps 1 to 3. The control height tokens do the rest.',
        'Gaps between controls in a row use step 2. Gaps between groups use step 4.',
        'Blocks inside a panel sit 16px to 24px apart. Sections sit 32px or more apart.',
        'Use <code>tb-stack</code> for vertical flow and <code>tb-row</code> for horizontal, then set the gap with <code>tb-gap-0</code> to <code>tb-gap-12</code>, one class per step of the scale.',
      ])}
      ${example(`
        <div class="tb-stack tb-gap-4">
          <div class="tb-row tb-gap-2">
            <span class="tb-caps">Filters</span>
            <span class="tb-text--sm">Revenue over 500&nbsp;€</span>
            <span class="tb-text--sm">Last 7 days</span>
          </div>
          <hr class="tb-divider">
          <div class="tb-row tb-gap-4">
            <span>Group A</span>
            <span class="tb-divider tb-divider--vertical"></span>
            <span>Group B</span>
          </div>
        </div>
      `, 'is-block')}`,
  },
  {
    id: 'shape',
    title: 'Shape and elevation',
    lead: 'Sharp corners and flat surfaces. Borders separate what sits side by side, shadows lift what floats.',
    body: `
      <h3>Radius and border</h3>
      ${example(`
        <div style="width: var(--tb-space-12); height: var(--tb-space-8); border: var(--tb-border-width) solid var(--tb-border-strong); border-radius: var(--tb-radius-sm)"></div>
        <div style="width: var(--tb-space-12); height: var(--tb-space-8); border: var(--tb-border-width) solid var(--tb-border-strong); border-radius: var(--tb-radius-md)"></div>
        <div style="width: var(--tb-space-12); height: var(--tb-space-8); border: var(--tb-border-width) solid var(--tb-border-strong); border-radius: var(--tb-radius-lg)"></div>
        <div style="width: var(--tb-space-12); height: var(--tb-space-6); border: var(--tb-border-width) solid var(--tb-border-strong); border-radius: var(--tb-radius-full)"></div>
      `)}
      ${table(['Token', 'Value', 'Use'], [
        ['<code>--tb-radius-sm</code>', '4px', 'Tags, markers, checkboxes'],
        ['<code>--tb-radius-md</code>', '5px', 'Buttons, inputs, panels'],
        ['<code>--tb-radius-lg</code>', '6px', 'Dialogs, popovers'],
        ['<code>--tb-radius-full</code>', '999px', 'Round shapes only, such as a switch track'],
        ['<code>--tb-border-width</code>', '1px', 'Every border in the system'],
      ])}
      <h3>Shadows</h3>
      ${example(`
        <div class="tb-stack tb-gap-1" style="padding: var(--tb-space-4); background: var(--tb-bg-surface); border: var(--tb-border-width) solid var(--tb-border); box-shadow: var(--tb-shadow-none)"><span class="tb-caps">none</span>Panel</div>
        <div class="tb-stack tb-gap-1" style="padding: var(--tb-space-4); background: var(--tb-bg-raised); box-shadow: var(--tb-shadow-sm)"><span class="tb-caps">sm</span>Tooltip</div>
        <div class="tb-stack tb-gap-1" style="padding: var(--tb-space-4); background: var(--tb-bg-raised); box-shadow: var(--tb-shadow-md)"><span class="tb-caps">md</span>Menu, popover</div>
        <div class="tb-stack tb-gap-1" style="padding: var(--tb-space-4); background: var(--tb-bg-raised); box-shadow: var(--tb-shadow-lg)"><span class="tb-caps">lg</span>Dialog, toast</div>
      `, 'is-canvas')}
      ${rules([
        'Panels, cards and tables sit flat on the canvas with a border and no shadow.',
        'Only elements that float above the page get a shadow: tooltips, menus, popovers, dialogs, toasts.',
        'A larger shadow means the element sits higher. Never stack two shadowed layers of the same size.',
        'A box never carries its tone as a coloured edge or stripe. The tone shows in the icon, a tinted background, a border mixed from the tone, or the figure itself, as callouts, toasts and the report findings do.',
      ])}
      <h3>Layers</h3>
      ${table(['Token', 'Value', 'Use'], [
        ['<code>--tb-z-dropdown</code>', '100', 'Menus, popovers, submenus, the app bar'],
        ['<code>--tb-z-overlay</code>', '200', 'Dialog backdrops'],
        ['<code>--tb-z-toast</code>', '300', 'Toasts'],
        ['<code>--tb-z-tooltip</code>', '400', 'Tooltips and the hold ring, above everything'],
        ['<code>--tb-opacity-disabled</code>', '0.45', 'Disabled controls and <code>tb-is-disabled</code>'],
      ])}
      ${rules([
        'Set <code>z-index</code> only from a layer token, and only on the elements listed. A page never invents a layer.',
      ])}`,
  },
  {
    id: 'motion',
    title: 'Motion',
    lead: 'Motion confirms what the user did and shows where something went. It is short, it never makes anyone wait, and it stops when the system asks for less motion.',
    body: `
      <h3>Durations and easing</h3>
      <div class="doc-example">
        <div class="doc-example-stage is-block" tabindex="0" aria-label="Motion durations, point at or focus to play">
          <div class="doc-motion">
            <span class="tb-text--sm">fast</span><span class="doc-motion-track"><span class="doc-motion-dot" style="--_d: var(--tb-duration-fast)"></span></span>
            <span class="tb-text--sm">base</span><span class="doc-motion-track"><span class="doc-motion-dot" style="--_d: var(--tb-duration)"></span></span>
            <span class="tb-text--sm">slow</span><span class="doc-motion-track"><span class="doc-motion-dot" style="--_d: var(--tb-duration-slow)"></span></span>
          </div>
        </div>
      </div>
      <p class="tb-text--sm tb-text--muted">Point at the example, or tab to it, to play the three durations on the system ease.</p>
      ${table(['Token', 'Value', 'Use'], [
        ['<code>--tb-duration-fast</code>', '80ms', 'Feedback on something the pointer touches: hover and press colours, borders, the sort arrow of a table'],
        ['<code>--tb-duration</code>', '150ms', 'Something that appears or changes state: tooltip, menu, submenu, dialog, toast, switch, a bar filling'],
        ['<code>--tb-duration-slow</code>', '240ms', 'Something that moves across the layout: the sidebar collapsing, sections settling in the layout editor'],
        ['<code>--tb-ease</code>', 'cubic-bezier(0.2, 0, 0, 1)', 'Every transition. It starts fast and lands softly, so the response feels immediate'],
      ])}
      <h3>Rules</h3>
      ${rules([
        'Use the tokens for every transition. Never write a duration or a curve by hand. Loading loops (skeleton, spinners, indeterminate progress) are the only animations with their own timing.',
        'Animate opacity and transform first. Animate a size only when the layout itself has to move, as the sidebar does.',
        'Nothing waits for an animation. A click acts at once and the motion shows what happened. Code that measures the page listens for the event sent once the move has settled, such as <code>shell:dock</code>.',
        'An element enters from where it comes from: a submenu drops from its tab, a dialog rises into place, a toast slides in from the edge.',
        'When something closes, its content leaves first. When it opens, the content arrives once there is room for it.',
        'Nothing moves for decoration. Only loading indicators move on their own.',
        'Every transition and animation has a <code>prefers-reduced-motion: reduce</code> rule next to it. Movement and fades stop and the change happens at once. Spinners and indeterminate progress slow down instead of stopping, so the page still shows it is working.',
      ])}
      <h3>Micro-interactions</h3>
      ${table(['Where', 'What moves', 'Timing'], [
        ['Buttons, inputs, tags, tabs, table rows, cards', 'Background and border colour on hover, press and focus', 'fast'],
        ['Table header', 'The sort arrow fades in on hover', 'fast'],
        ['Switch', 'The track changes colour and the thumb slides', 'base'],
        ['Tooltip', 'Fades in', 'base'],
        ['App bar submenu', 'Fades in and drops 4px from the bar. Its chevron turns over', 'base'],
        ['Dialog', 'The backdrop fades and the dialog rises 8px into place', 'base'],
        ['Toast', 'Rises and fades in, slides right and fades out', 'base'],
        ['Bar, progress', 'The fill grows to its new value', 'base'],
        ['Sidebar collapse', 'The bar narrows to a rail. Names fade out first, and fade back in once the bar has widened. Icons stay in place', 'slow, names fast out and base in'],
        ['Moving the menu', 'The bar reshapes between the top strip and the sidebar. The brand, pages, tools and account fly to their new places and the page slides, with no cross-fade', 'slow'],
        ['Layout editor', 'Opening, the editing bar fades in while the sections slide to make room, and closing they slide back. The section toolbar fades in on hover. Moved sections settle into place. A new section pulses once so the eye finds it', 'slow, base, 1.2s pulse'],
        ['Brand mark', 'On hover the three slabs of the stack fan out to the right, each a tenth of its size further, and slide back when the pointer leaves', '450ms'],
        ['Card focus', 'While a card header is held, four dots circle the pointer for the length of the hold, then open out. The rest of the page blurs and dims as the card lifts', '500ms hold, base, slow'],
        ['Loading', 'Skeleton shimmer, spinner, button spinner, indeterminate progress', 'own loops'],
      ])}`,
  },
  {
    id: 'formatting',
    title: 'Formatting',
    lead: 'One format for every figure in the product. People compare numbers across screens, so they must read the same everywhere.',
    body: `
      ${table(['Type', 'Rule', 'Sample'], [
        ['Integer', 'Thousands separated by a comma.', '<span class="tb-num">1,204,000</span>'],
        ['Decimal', 'Decimal point. Fixed decimals within a column.', '<span class="tb-num">1,204.50</span>'],
        ['Percentage', 'One decimal, a non-breaking space, then the sign.', '<span class="tb-num">12.3&nbsp;%</span>'],
        ['Currency', 'Symbol after the amount, with a non-breaking space.', '<span class="tb-num">10,000&nbsp;€</span>'],
        ['Date', 'Day, short month, year. No numeric dates.', '<span class="tb-num">23 Sep 2026</span>'],
        ['Date and time', 'Date, a comma, then 24-hour time.', '<span class="tb-num">23 Sep 2026, 10:14</span>'],
        ['Account ID', 'Two letters, a hyphen and four digits, in mono.', '<span class="tb-mono tb-num">AC-1228</span>'],
        ['Churn risk', 'Number, band colour and bar together.', '<span class="tb-prob tb-prob--high">72.4&nbsp;%<span class="tb-prob-bar" style="--value: 72.4"></span></span>'],
      ])}
      <h3>Shared formatters</h3>
      ${rules([
        'Numbers, amounts, percentages, dates, times and file sizes are formatted only through the shared formatters in <code>src/format.js</code>: <code>fmtInt</code> (a count, rounded), <code>fmtNum</code>, <code>fmtPct</code> and <code>fmtPctN</code>, <code>fmtDelta</code> (a signed change), <code>fmtPts</code> (percentage points), <code>fmtCompact</code> (1.9k, 48k), <code>fmtEur</code>, <code>fmtEurRound</code> (whole euros for totals), <code>fmtEurCompact</code> (axes and tight cells), <code>fmtDate</code>, <code>fmtDay</code>, <code>fmtTime</code>, <code>fmtDateTime</code>, <code>fmtBytes</code>, and <code>band</code> with <code>probHtml</code> for probabilities.',
        'Never call <code>toLocaleString</code>, <code>toFixed</code> or build a figure by hand in a page. If a format is missing, add a formatter to the shared file and use it everywhere.',
        'Chart ticks, tooltips, legends, stats and exports use the same formatters as tables, so one figure reads the same on every screen.',
      ])}
      <h3>Churn risk bands</h3>
      ${rules([
        'Low is under 10 %. Mid is 10 % up to and including 40 %. High is over 40 %.',
        'Always show the number. The colour and the bar support it, they never replace it.',
        'Set the bar with an inline <code>--value</code> from 0 to 100, the same number as the label.',
        'Without a bar, <code>tb-prob</code> shows a small square in the band colour.',
      ])}
      ${example(`
        <div class="tb-stack tb-gap-2">
          <span class="tb-prob tb-prob--low">4.1&nbsp;%<span class="tb-prob-bar" style="--value: 4.1"></span></span>
          <span class="tb-prob tb-prob--mid">27.0&nbsp;%<span class="tb-prob-bar" style="--value: 27"></span></span>
          <span class="tb-prob tb-prob--high">72.4&nbsp;%<span class="tb-prob-bar" style="--value: 72.4"></span></span>
          <span class="tb-prob tb-prob--high">72.4&nbsp;%</span>
        </div>
      `)}`,
  },
  {
    id: 'states',
    title: 'States',
    lead: 'Every view that loads data has these states. Design all of them, not only the filled one.',
    body: `
      <h3>Empty</h3>
      <p>Use when a query returns nothing. Say why, and what to change.</p>
      ${example(`
        <div class="tb-stack tb-gap-1">
          <p class="tb-text">No accounts match these filters.</p>
          <p class="tb-text tb-text--sm tb-text--muted">Widen the date range or clear the revenue filter.</p>
        </div>
      `, 'is-block')}
      <h3>Loading</h3>
      <p>Use <code>tb-skeleton</code> in the shape of the content that will arrive. Set its size inline.</p>
      ${example(`
        <div class="tb-stack tb-gap-2" aria-busy="true">
          <span class="tb-skeleton" style="width: 40%"></span>
          <span class="tb-skeleton" style="width: 90%"></span>
          <span class="tb-skeleton" style="width: 75%"></span>
        </div>
      `, 'is-block')}
      <h3>Error</h3>
      <p>Use when something failed. Say what failed and what the user can do, next to where it failed.</p>
      ${example(`
        <p class="tb-text tb-text--danger">The file could not be imported. Row 214 has no account ID.</p>
      `, 'is-block')}
      <h3>Disabled</h3>
      <p>Use <code>tb-is-disabled</code> on content that cannot be used yet. Tell the user why nearby.</p>
      ${example(`
        <div class="tb-stack tb-gap-1">
          <a href="#" class="tb-is-disabled" aria-disabled="true" tabindex="-1">Export report</a>
          <span class="tb-text tb-text--sm tb-text--muted">Confirm all segments to export.</span>
        </div>
      `, 'is-block')}
      <h3>AI-suggested and human-confirmed</h3>
      <p>Mark every value the model produced. The marker switches to confirmed once a person accepts it.</p>
      ${example(`
        <div class="tb-stack tb-gap-2">
          <span class="tb-row tb-gap-2">Mid-market <span class="tb-origin tb-origin--ai" title="Suggested by the model">AI</span></span>
          <span class="tb-row tb-gap-2">Enterprise <span class="tb-origin tb-origin--confirmed" title="Confirmed by an account owner">Confirmed</span></span>
        </div>
      `, 'is-block')}`,
  },
  {
    id: 'icons',
    title: 'Icons',
    lead: 'Icons come from Lucide. Only the few concepts the library has no icon for are drawn by hand.',
    body: `
      <p>The product uses <a href="https://lucide.dev">Lucide</a>, from the <code>lucide-static</code> package under the ISC licence. There is no icon font and no sprite: each icon is inlined as an SVG, copied from the package as it ships.</p>
      ${example(iconRow(libraryIcons))}
      ${example(`<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" /></svg>`)}
      ${rules([
        'Inline the SVG with <code>viewBox="0 0 24 24"</code>, <code>stroke-width="2"</code>, <code>fill="none"</code>, <code>stroke="currentColor"</code> and round caps and joins. <code>tb-icon</code> sizes it to 16px and gives it the text colour.',
        'Before drawing an icon, look for it in the library under its Lucide name. Draw one only for a concept that is the product\'s own and has no match, such as the hierarchy tree.',
        'A hand-drawn icon uses the same 24 grid and 2px stroke, so it sits beside the library ones without a seam.',
        'An icon next to text is decoration, so hide it with <code>aria-hidden="true"</code>. An icon alone needs an <code>aria-label</code> on its button and a tooltip.',
        'One icon per meaning across the product: the same icon for a page in the app bar, its empty state and its menu item.',
      ])}
      <h3>Product icons</h3>
      ${example(iconRow(productIcons))}`,
  },
]
