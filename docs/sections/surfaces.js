// Surfaces: card, table, tabs, dialog, toast, callout, empty state, progress.
// Each sample is written once and shown twice, live on the stage and as code under it.

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function dedent(s) {
  const lines = s.replace(/^\n+/, '').replace(/\s+$/, '').split('\n')
  const indents = lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length)
  const min = indents.length ? Math.min(...indents) : 0
  return lines.map(l => l.slice(min)).join('\n')
}

const example = (stage, code, mods = '') => `
  <div class="doc-example">
    <div class="doc-example-stage${mods ? ` ${mods}` : ''}">${stage}</div>
    <pre class="doc-example-code">${esc(dedent(code))}</pre>
  </div>`

const rules = items => `<ul class="doc-rules">${items.map(i => `<li>${i}</li>`).join('')}</ul>`

const doDont = (yes, no) => `
  <div class="doc-do-dont">
    <div class="doc-do"><strong>Do</strong>${yes}</div>
    <div class="doc-dont"><strong>Do not</strong>${no}</div>
  </div>`

const icon = body =>
  `<svg class="tb-icon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

const I = {
  info: icon('<circle cx="8" cy="8" r="6.25"/><path d="M8 7.25v3.75M8 5v.01"/>'),
  alert: icon('<path d="M8 2.25 14.25 13.5H1.75z"/><path d="M8 6.5v3M8 11.5v.01"/>'),
  check: icon('<circle cx="8" cy="8" r="6.25"/><path d="m5.25 8.25 1.9 1.9 3.6-3.9"/>'),
  danger: icon('<circle cx="8" cy="8" r="6.25"/><path d="M8 4.75v4M8 11.25v.01"/>'),
  ai: icon('<path d="M8 1.75 9.4 6.6l4.85 1.4-4.85 1.4L8 14.25 6.6 9.4 1.75 8l4.85-1.4z"/>'),
  close: icon('<path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/>'),
  more: icon('<path d="M3.5 8h.01M8 8h.01M12.5 8h.01"/>'),
  source: icon('<ellipse cx="8" cy="3.75" rx="5" ry="1.75"/><path d="M3 3.75v8.5c0 .97 2.24 1.75 5 1.75s5-.78 5-1.75v-8.5M3 8c0 .97 2.24 1.75 5 1.75S13 8.97 13 8"/>'),
  filter: icon('<path d="M2.25 3h11.5L9.25 8.5v4.25l-2.5 1V8.5z"/>'),
}

/* ------------------------------------------------------------------------------------------
   Card
   ------------------------------------------------------------------------------------------ */

const cardMain = `
<div class="tb-card">
  <div class="tb-card-header">
    <h3 class="tb-card-title">Accounts export</h3>
    <div class="tb-card-actions">
      <button class="tb-button tb-button--minimal tb-button--sm" type="button">Edit</button>
      <button class="tb-button tb-button--minimal tb-button--sm" type="button" aria-label="More">${I.more}</button>
    </div>
  </div>
  <div class="tb-card-body">
    <p class="tb-text">480 accounts and 1,284,902 orders. Last import on 23 Sep 2026.</p>
  </div>
  <div class="tb-card-footer">
    <button class="tb-button tb-button--sm" type="button">Import again</button>
    <button class="tb-button tb-button--primary tb-button--sm" type="button">Open analysis</button>
  </div>
</div>`

const cardInteractive = `
<a class="tb-card tb-card--interactive" href="#card">
  <div class="tb-card-header">
    <h3 class="tb-card-title">Accounts Q3 2026</h3>
  </div>
  <div class="tb-card-body">
    <p class="tb-text tb-text--muted">8 accounts, 4 marked At risk.</p>
  </div>
</a>`

const cardSelected = `
<a class="tb-card tb-card--interactive tb-card--selected" href="#card" aria-current="true">
  <div class="tb-card-header">
    <h3 class="tb-card-title">Renewals Q3 2026</h3>
  </div>
  <div class="tb-card-body">
    <p class="tb-text tb-text--muted">12 accounts, none reviewed yet.</p>
  </div>
</a>`

const cardGrid = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--tb-space-3); align-items: start;">
  ${cardMain}${cardInteractive}${cardSelected}
</div>`

const card = {
  id: 'card',
  title: 'Card',
  lead: 'A bordered surface that groups one object and the actions on it.',
  body: `
    <p>Use a card for one thing a person can act on: a source, a report, a saved analysis. The header holds the title and a slot for small actions. The body holds the content. The footer holds the main actions. A card has no shadow because it sits on the page.</p>
    ${example(cardGrid, cardMain, 'is-block is-canvas')}
    <h3>Interactive and selected</h3>
    <p>Add <code>tb-card--interactive</code> when the whole card is a link or opens something. Put it on an <code>a</code> or a focusable element so it takes the keyboard. Add <code>tb-card--selected</code> to the one card that is current in a list.</p>
    ${example(`<div style="width: 280px;">${cardInteractive}</div>`, cardInteractive, 'is-canvas')}
    ${rules([
      'Keep the header to a title and at most three small minimal buttons. Everything else goes in the body or the footer.',
      'Use <code>tb-card-body--flush</code> when a table or a list runs edge to edge.',
      'Do not nest cards. Use a divider or a table inside instead.',
      'Only one card in a group is selected at a time.',
    ])}
    ${doDont(
      'Make the whole card interactive, with no buttons inside it.',
      'Put buttons inside an interactive card. Two targets in one place confuse the keyboard and the pointer.',
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Table
   ------------------------------------------------------------------------------------------ */

const accounts = [
  ['AC-1204', '2026-09-12', 'Quarry Supply', 'Tom Becker', '10,000&nbsp;€', '0.94', 'ai'],
  ['AC-1228', '2026-09-18', 'Trillium Logistics', 'Maya Chen', '248,500&nbsp;€', '0.71', 'confirmed'],
  ['AC-1231', '2026-09-23', 'Orchid Partners', 'Luis Ortega', '31,550&nbsp;€', '0.08', 'active'],
  ['AC-1236', '2026-08-27', 'Nimbus Builders', 'Priya Nair', '57,000&nbsp;€', '0.46', 'paused'],
  ['AC-1240', '2026-09-25', 'Keystone Foods', 'Maya Chen', '1,200,000&nbsp;€', '0.12', 'active'],
  ['AC-1245', '2026-08-14', 'Lantern Studio', 'Tom Becker', '18,750&nbsp;€', '0.63', 'ai'],
  ['AC-1252', '2026-08-02', 'Brook Hardware', 'Luis Ortega', '9,990&nbsp;€', '0.88', 'ai'],
  ['AC-1259', '2026-09-28', 'Summit Textiles', 'Priya Nair', '425,000&nbsp;€', '0.03', 'active'],
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = iso => `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`

// Follows the formatting rule: number, band colour and bar together, bands at 10 % and 40 %.
const probTag = p => {
  const n = Math.round(parseFloat(p) * 1000) / 10
  const band = n > 40 ? 'high' : n >= 10 ? 'mid' : 'low'
  return `<span class="tb-prob tb-prob--${band}">${n.toFixed(1)}&nbsp;%<span class="tb-prob-bar" style="--value: ${n}"></span></span>`
}

const STATUS = {
  ai: '<span class="tb-tag tb-tag--ai">At risk</span>',
  confirmed: '<span class="tb-tag tb-tag--confirmed">At risk</span>',
  paused: '<span class="tb-tag">Paused</span>',
  active: '<span class="tb-tag">Active</span>',
}

const accountRow = ([id, date, company, owner, revenue, risk, status], selected = false) => `
      <tr${selected ? ' class="is-selected"' : ''}>
        <td class="tb-mono">${id}</td>
        <td data-tb-sort-value="${date}">${shortDate(date)}</td>
        <td>${company}</td>
        <td>${owner}</td>
        <td class="is-num">${revenue}</td>
        <td class="is-num">${probTag(risk)}</td>
        <td>${STATUS[status]}</td>
      </tr>`

const tableMarkup = rows => `
<div class="tb-table-wrap" style="max-height: 232px;">
  <table class="tb-table">
    <thead>
      <tr>
        <th data-tb-sort>Account</th>
        <th data-tb-sort>Last order</th>
        <th data-tb-sort>Company</th>
        <th data-tb-sort>Owner</th>
        <th class="is-num" data-tb-sort="desc">Revenue</th>
        <th class="is-num" data-tb-sort="desc">Churn risk</th>
        <th data-tb-sort>Status</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>
</div>`

const tableLive = `
<div class="tb-card">
  <div class="tb-card-header">
    <h3 class="tb-card-title">Accounts Q3 2026</h3>
    <div class="tb-card-actions">
      <button class="tb-button tb-button--minimal tb-button--sm" type="button">Export report</button>
    </div>
  </div>
  <div class="tb-card-body tb-card-body--flush">
    ${tableMarkup(accounts.map((t, i) => accountRow(t, i === 1)).join(''))}
  </div>
</div>`

const tableCode = tableMarkup(accounts.slice(0, 2).map(t => accountRow(t)).join(''))

const tableVariants = `
<table class="tb-table tb-table--striped tb-table--bordered">
  <thead>
    <tr><th>Account</th><th class="is-num">Orders</th><th class="is-num">Revenue</th></tr>
  </thead>
  <tbody>
    <tr><td>Trillium Logistics</td><td class="is-num">214</td><td class="is-num">1,902,400&nbsp;€</td></tr>
    <tr><td>Quarry Supply</td><td class="is-num">87</td><td class="is-num">640,120&nbsp;€</td></tr>
    <tr><td>Keystone Foods</td><td class="is-num">1,046</td><td class="is-num">12,481,000&nbsp;€</td></tr>
    <tr><td>Orchid Partners</td><td class="is-num">9</td><td class="is-num">31,550&nbsp;€</td></tr>
  </tbody>
</table>`

const table = {
  id: 'table',
  title: 'Table',
  lead: 'Dense rows for reading and comparing many records at once.',
  body: `
    <p>Tables are where most of the reading happens. Rows are 28px high so a screen holds a lot of them. Header cells use the label style: sentence case, small, medium weight and muted. Numbers align right with tabular figures so digits line up down the column. Click a header to sort. Try it on Revenue and Churn risk.</p>
    ${example(tableLive, tableCode, 'is-block is-canvas')}
    <h3>Striped and bordered</h3>
    <p>Add <code>tb-table--striped</code> for long rows that are hard to follow across. Add <code>tb-table--bordered</code> when cells are compared across columns, as in a pivot.</p>
    ${example(tableVariants, tableVariants, 'is-block')}
    <h3>Sorting</h3>
    <p>Put <code>data-tb-sort</code> on a <code>th</code>. A click, Enter or Space sorts the rows by that column and toggles between <code>is-sorted-asc</code> and <code>is-sorted-desc</code>. Columns whose cells have <code>is-num</code> sort as numbers, with currency signs and separators ignored. Set <code>data-tb-sort="desc"</code> to sort high to low on the first click. When the text does not sort well, put the value to sort on in <code>data-tb-sort-value</code> on the cell.</p>
    ${rules([
      'Every numeric column gets <code>is-num</code> on its header and on its cells.',
      'Wrap the table in <code>tb-table-wrap</code> and give the wrap a <code>max-height</code>. The header then stays in view while the rows scroll.',
      'Mark the row the person has open with <code>is-selected</code>. Only one row at a time.',
      'Show dates as 23 Sep 2026 and put the ISO date in <code>data-tb-sort-value</code> on the cell, so they sort in time order.',
      'Keep cells on one line. Truncate long names rather than wrap them.',
    ])}
    ${doDont(
      'Align amounts right and write them the same way in every row: <code>10,000&nbsp;€</code>.',
      'Mix formats in one column, like <code>10k&nbsp;€</code> next to <code>248,500&nbsp;€</code>. The eye compares by length first.',
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Tabs
   ------------------------------------------------------------------------------------------ */

const tabsLive = `
<div data-tb-tabs>
  <div class="tb-tabs">
    <button class="tb-tab is-active" type="button" data-tb-tab="overview">Overview</button>
    <button class="tb-tab" type="button" data-tb-tab="tree">Churn tree</button>
    <button class="tb-tab" type="button" data-tb-tab="segments">Segments</button>
    <button class="tb-tab" type="button" data-tb-tab="report">Report</button>
  </div>
  <div class="tb-tab-panel" data-tb-panel="overview">
    <p class="tb-text">Accounts Q3 2026. 8 accounts with 2,000,790&nbsp;€ in yearly revenue.</p>
  </div>
  <div class="tb-tab-panel" data-tb-panel="tree" hidden>
    <div class="tb-callout tb-callout--ai">
      ${I.ai}
      <div class="tb-callout-content">
        <p>The tree splits on region first. 3 of the 4 high branches are accounts on the Core plan with no order in the last 30 days.</p>
      </div>
    </div>
  </div>
  <div class="tb-tab-panel" data-tb-panel="segments" hidden>
    <p class="tb-text">4 accounts marked At risk. 1 confirmed by an account owner, 3 suggested by the model.</p>
  </div>
  <div class="tb-tab-panel" data-tb-panel="report" hidden>
    <div class="tb-empty tb-empty--compact">
      <span class="tb-empty-icon">${I.info}</span>
      <p class="tb-empty-title">No report yet.</p>
      <div class="tb-empty-action">
        <button class="tb-button tb-button--sm" type="button">Export report</button>
      </div>
    </div>
  </div>
</div>`

const tabsCode = `
<div data-tb-tabs>
  <div class="tb-tabs">
    <button class="tb-tab is-active" type="button" data-tb-tab="overview">Overview</button>
    <button class="tb-tab" type="button" data-tb-tab="tree">Churn tree</button>
  </div>
  <div class="tb-tab-panel" data-tb-panel="overview">...</div>
  <div class="tb-tab-panel" data-tb-panel="tree" hidden>...</div>
</div>`

const tabs = {
  id: 'tabs',
  title: 'Tabs',
  lead: 'Switch between views of the same object without leaving the page.',
  body: `
    <p>Use tabs when one object has several views and the person moves between them: an analysis with its overview, its tree, its segments and its report. The active tab has an underline in the accent colour. The script shows the panel whose <code>data-tb-panel</code> matches the tab's <code>data-tb-tab</code>, and adds the ARIA roles for you.</p>
    ${example(tabsLive, tabsCode, 'is-block')}
    ${rules([
      'Put <code>data-tb-tabs</code> on the element that holds both the bar and the panels.',
      'Mark the first view <code>is-active</code> and give every other panel <code>hidden</code>, so the page is right before the script runs.',
      'Left and Right arrows move between tabs. Home and End jump to the ends. Tab moves into the panel.',
      'Keep labels to one or two words. Put a count in the label, not in a badge next to it.',
      'Do not use tabs for steps in a sequence. Use a stepper or separate pages.',
    ])}
    ${doDont(
      'Use tabs for views a person can visit in any order.',
      'Use tabs to hide a form that must be filled before the next one.',
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Dialog
   ------------------------------------------------------------------------------------------ */

const dialogExport = `
<div class="tb-dialog-backdrop" id="dlg-export-report">
  <div class="tb-dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-export-report-title">
    <div class="tb-dialog-header">
      <h2 class="tb-dialog-title" id="dlg-export-report-title">Export report</h2>
      <button class="tb-button tb-button--minimal tb-button--sm" type="button" data-tb-dialog-close aria-label="Close">${I.close}</button>
    </div>
    <div class="tb-dialog-body">
      <p class="tb-text">The report covers Accounts Q3 2026. It holds 8 accounts, 4 of them marked At risk.</p>
      <div class="tb-callout tb-callout--ai" style="margin-top: var(--tb-space-3);">
        ${I.ai}
        <div class="tb-callout-content">
          <p>3 segments are still suggestions from the model. The report marks them as not confirmed.</p>
        </div>
      </div>
    </div>
    <div class="tb-dialog-footer">
      <button class="tb-button" type="button" data-tb-dialog-close>Cancel</button>
      <button class="tb-button tb-button--primary" type="button" data-tb-dialog-close onclick="window.tb.toast({ message: 'Report exported.', intent: 'success' })">Export report</button>
    </div>
  </div>
</div>`

const dialogDelete = `
<div class="tb-dialog-backdrop" id="dlg-delete-source">
  <div class="tb-dialog tb-dialog--sm tb-dialog--danger" role="dialog" aria-modal="true" aria-labelledby="dlg-delete-source-title">
    <div class="tb-dialog-header">
      ${I.danger}
      <h2 class="tb-dialog-title" id="dlg-delete-source-title">Delete source</h2>
      <button class="tb-button tb-button--minimal tb-button--sm" type="button" data-tb-dialog-close aria-label="Close">${I.close}</button>
    </div>
    <div class="tb-dialog-body">
      <p class="tb-text">Accounts export and its 1,284,902 orders leave every analysis that uses them. Segments already confirmed stay in the audit log. This cannot be undone.</p>
    </div>
    <div class="tb-dialog-footer">
      <button class="tb-button" type="button" data-tb-dialog-close>Keep source</button>
      <button class="tb-button tb-button--danger" type="button" data-tb-dialog-close onclick="window.tb.toast({ message: 'Source deleted.', intent: 'danger' })">Delete source</button>
    </div>
  </div>
</div>`

const dialogStage = `
<button class="tb-button tb-button--primary" type="button" data-tb-dialog-open="dlg-export-report">Export report</button>
<button class="tb-button" type="button" data-tb-dialog-open="dlg-delete-source">Delete source</button>
${dialogExport}
${dialogDelete}`

const dialogCode = `
<button class="tb-button tb-button--primary" type="button" data-tb-dialog-open="dlg-export-report">Export report</button>
${dialogExport}`

const dialog = {
  id: 'dialog',
  title: 'Dialog',
  lead: 'A panel over the page for one decision that cannot wait.',
  body: `
    <p>Use a dialog when the person must confirm or complete one thing before going on: exporting a report, deleting a source. It blocks the page, so keep it for decisions. The script opens it, moves focus inside, keeps Tab inside, and gives focus back to the button that opened it. Escape, the close button and a click on the backdrop all close it.</p>
    ${example(dialogStage, dialogCode)}
    <h3>Sizes and danger</h3>
    <p>The default panel is 480px wide. Add <code>tb-dialog--sm</code> for a short confirmation and <code>tb-dialog--lg</code> for a form or a preview. <code>tb-dialog--full</code> fills the window short of a small margin, for a chart or a canvas seen large (see Patterns, Expand). Add <code>tb-dialog--danger</code> when the action destroys something. Its header icon turns red and the main button is a danger button; there is no coloured strip.</p>
    ${rules([
      'Open with <code>data-tb-dialog-open="id"</code> on any button, where <code>id</code> is the id of the backdrop.',
      'Close with <code>data-tb-dialog-close</code> on any element inside. A button can close and act at once.',
      'Name the main button with the action, like Export report or Delete source. Never OK.',
      'A destructive dialog says in one sentence what is removed, what is kept and whether it can be undone.',
      'Put <code>autofocus</code> on the field or button that should take focus first. Without it, focus goes to the first control in the body or the footer.',
      'Page scroll is locked while a dialog is open. Do not open a dialog from inside another.',
    ])}
    ${doDont(
      'Title the dialog with the action and repeat it on the main button.',
      'Ask "Are you sure?" with Yes and No buttons. The reader has to read the question twice to know what Yes does.',
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Toast
   ------------------------------------------------------------------------------------------ */

const toastButtons = `
<button class="tb-button" type="button" onclick="window.tb.toast({ message: 'Draft saved.' })">Neutral</button>
<button class="tb-button" type="button" onclick="window.tb.toast({ message: 'Report exported.', intent: 'success' })">Success</button>
<button class="tb-button" type="button" onclick="window.tb.toast({ message: '3 rows have no date. They were skipped.', intent: 'warning' })">Warning</button>
<button class="tb-button" type="button" onclick="window.tb.toast({ message: 'Import failed. The file has no account ID column.', intent: 'danger', timeout: 0 })">Danger, stays</button>
<button class="tb-button" type="button" onclick="window.tb.toast({ message: 'The model suggested segments for 12 accounts.', intent: 'ai', action: { label: 'Review', onClick: () => { location.hash = '#table' } }, timeout: 8000 })">AI with action</button>`

const toastCall = `
import { tb } from './tabula.js'

const dismiss = tb.toast({
  message: 'The model suggested segments for 12 accounts.',
  intent: 'ai',                 // 'danger' | 'warning' | 'success' | 'ai', or leave out
  action: { label: 'Review', onClick: () => openSegments() },
  timeout: 8000,                // default 4000, 0 keeps it until closed
})`

const toastStatic = `
<div class="tb-toast tb-toast--success">
  <span class="tb-toast-icon">${I.check}</span>
  <div class="tb-toast-message">Report exported.</div>
  <button class="tb-button tb-button--minimal tb-button--sm tb-toast-action" type="button">Open</button>
  <button class="tb-button tb-button--minimal tb-button--sm tb-toast-close" type="button" aria-label="Dismiss">${I.close}</button>
</div>`

const toastSection = {
  id: 'toast',
  title: 'Toast',
  lead: 'A short message that confirms what just happened, then leaves.',
  body: `
    <p>Use a toast to confirm an action the person took, or to report something that happened in the background. It appears bottom right, stacks with others, and leaves after four seconds. The timer pauses while the pointer or the keyboard is on it. Call it from script. You do not write its markup.</p>
    ${example(toastButtons, toastCall)}
    <h3>Anatomy</h3>
    <p>This is what the call renders, shown in place. The stack <code>tb-toast-stack</code> is created on first use and announces new messages to screen readers. A danger toast interrupts.</p>
    ${example(`<div style="width: 360px; max-width: 100%;">${toastStatic}</div>`, toastStatic, 'is-canvas')}
    ${rules([
      'One sentence, two at most. Say what happened, in the past tense.',
      'Give a danger toast <code>timeout: 0</code> so it stays until the person closes it.',
      'At most one action, and never the only way to reach it. The toast may be gone before anyone clicks.',
      'Use the <code>ai</code> intent for work the model did on its own.',
      'Never use a toast for an error on a form field. Show it next to the field.',
    ])}
    ${doDont(
      'Report exported. 4 accounts marked At risk.',
      'Success! Your report has been exported successfully.',
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Callout
   ------------------------------------------------------------------------------------------ */

const calloutMain = `
<div class="tb-callout tb-callout--warning">
  ${I.alert}
  <div class="tb-callout-content">
    <strong class="tb-callout-title">12 accounts have no last order date</strong>
    <p>Their churn risk is less reliable. Add the missing dates to the source, then run the analysis again.</p>
  </div>
</div>`

const calloutStage = `
<div class="tb-stack">
  <div class="tb-callout">
    ${I.info}
    <div class="tb-callout-content"><p>This report uses data up to 30 September 2026.</p></div>
  </div>
  ${calloutMain}
  <div class="tb-callout tb-callout--danger">
    ${I.danger}
    <div class="tb-callout-content">
      <strong class="tb-callout-title">3 accounts moved to At risk</strong>
      <p>Review them before you export the report.</p>
    </div>
  </div>
  <div class="tb-callout tb-callout--success">
    ${I.check}
    <div class="tb-callout-content"><p>All segments in this analysis are confirmed.</p></div>
  </div>
  <div class="tb-callout tb-callout--ai">
    ${I.ai}
    <div class="tb-callout-content">
      <strong class="tb-callout-title">Suggested by the model</strong>
      <p>Confirm each segment before it counts in the report.</p>
    </div>
  </div>
</div>`

const callout = {
  id: 'callout',
  title: 'Callout',
  lead: 'An inline note that stays on the page next to what it is about.',
  body: `
    <p>Use a callout for something the reader should know while reading: a limit on the data, a risk, work the model did. It sits in the flow, so it stays until the cause is fixed. The icon, a soft background and a border in the tone carry the intent. The title is optional.</p>
    ${example(calloutStage, calloutMain, 'is-block')}
    ${rules([
      'The default is information. Add <code>--warning</code>, <code>--danger</code>, <code>--success</code> or <code>--ai</code> for the others.',
      'Put the icon first, then everything else inside <code>tb-callout-content</code>.',
      'Say what to do next when there is something to do.',
      'One callout per topic. Two in a row usually means one of them belongs somewhere else.',
    ])}
    ${doDont(
      'Place the callout above the table or the chart it talks about.',
      'Use a callout for a message about an action that just finished. That is a toast.',
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Empty state
   ------------------------------------------------------------------------------------------ */

const emptyMain = `
<div class="tb-empty">
  <span class="tb-empty-icon">${I.source}</span>
  <h3 class="tb-empty-title">No source selected</h3>
  <p class="tb-empty-description">Pick a data source to start the analysis. You can import a CSV file or connect an orders export.</p>
  <div class="tb-empty-action">
    <button class="tb-button tb-button--primary" type="button">Add source</button>
  </div>
</div>`

const emptyCompact = `
<div class="tb-empty tb-empty--compact">
  <span class="tb-empty-icon">${I.filter}</span>
  <p class="tb-empty-title">No accounts match these filters.</p>
  <div class="tb-empty-action">
    <button class="tb-button tb-button--minimal tb-button--sm" type="button">Clear filters</button>
  </div>
</div>`

const empty = {
  id: 'empty-state',
  title: 'Empty state',
  lead: 'What a surface shows when it has nothing to show yet.',
  body: `
    <p>Use an empty state wherever data can be missing: a new analysis, a filter with no results, a report not yet built. It says why the area is empty and gives the one action that fills it. Use <code>tb-empty--compact</code> inside a table, a panel or a card body.</p>
    ${example(`<div class="tb-card">${emptyMain}</div><div class="tb-card" style="margin-top: var(--tb-space-3);">${emptyCompact}</div>`, emptyMain, 'is-block is-canvas')}
    ${rules([
      'The title says what is missing. The description says how to get it.',
      'At most one primary action. A compact empty state uses a minimal button.',
      'Keep the icon plain and grey. It supports the title and does not decorate.',
      'When a filter causes the empty state, offer to clear the filter.',
    ])}
    ${doDont(
      'No source selected. Pick a data source to start the analysis.',
      'Nothing here yet! Start your first analysis today.',
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Progress
   ------------------------------------------------------------------------------------------ */

const progressMain = `
<div class="tb-progress-label"><span>Importing accounts</span><span>42&nbsp;%</span></div>
<div class="tb-progress" data-tb-value="42" aria-label="Importing accounts">
  <div class="tb-progress-bar"></div>
</div>`

const progressStage = `
<div class="tb-stack" style="max-width: 420px;">
  <div>${progressMain}</div>
  <div>
    <div class="tb-progress-label"><span>Model scoring</span><span>68&nbsp;%</span></div>
    <div class="tb-progress tb-progress--ai" data-tb-value="68" aria-label="Model scoring"><div class="tb-progress-bar"></div></div>
  </div>
  <div>
    <div class="tb-progress-label"><span>Analysis complete</span><span>100&nbsp;%</span></div>
    <div class="tb-progress tb-progress--success" data-tb-value="100" aria-label="Analysis complete"><div class="tb-progress-bar"></div></div>
  </div>
  <div>
    <div class="tb-progress-label"><span>Import stopped at row 18,204</span><span>31&nbsp;%</span></div>
    <div class="tb-progress tb-progress--danger tb-progress--sm" data-tb-value="31" aria-label="Import stopped"><div class="tb-progress-bar"></div></div>
  </div>
  <div>
    <div class="tb-progress-label"><span>Building churn tree</span></div>
    <div class="tb-progress tb-progress--indeterminate" aria-label="Building churn tree"><div class="tb-progress-bar"></div></div>
  </div>
</div>`

const spinners = `
<span class="tb-spinner tb-spinner--sm" role="status" aria-label="Loading"></span>
<span class="tb-spinner" role="status" aria-label="Loading"></span>
<span class="tb-spinner tb-spinner--lg" role="status" aria-label="Loading"></span>`

const progress = {
  id: 'progress',
  title: 'Progress',
  lead: 'Show that work is running and, when known, how far it has got.',
  body: `
    <p>Use a bar when the share of work done is known, like an import. Use the indeterminate bar when it is not, like building the churn tree. Use a spinner for a short wait inside a button, a cell or a panel. The bar reads its value from <code>data-tb-value</code>, from 0 to 100, or from <code>--value</code> set inline.</p>
    ${example(progressStage, progressMain, 'is-block')}
    <h3>Spinner</h3>
    <p>Three sizes: <code>tb-spinner--sm</code> at 12px for inside a button or a cell, the default at 16px, and <code>tb-spinner--lg</code> at 24px for a panel.</p>
    ${example(spinners, spinners)}
    ${rules([
      'Tones: <code>--success</code>, <code>--warning</code>, <code>--danger</code>, <code>--ai</code>. Without one, the bar is the accent.',
      'Always label a bar, visibly or with <code>aria-label</code>. Say what is running.',
      'Show the number next to a determinate bar. Readers want the figure.',
      'Use <code>--ai</code> for work the model is doing and <code>--danger</code> when a run has stopped on an error.',
      'After about ten seconds with no progress, swap the spinner for a bar or a message.',
      'Set the value from script with <code>el.style.setProperty(\'--value\', 42)</code>, or change <code>data-tb-value</code> and call <code>tb.init(el)</code>.',
    ])}
  `,
}

export const sections = [card, table, tabs, dialog, toastSection, callout, empty, progress]
