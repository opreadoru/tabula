// Controls: button, input, select, checkbox and radio, switch, tag, menu, tooltip.
// Each main sample is written once and shown twice, live on the stage and as code under it.

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

// A small live sample inside a do or do not card.
const sample = html => `<div class="tb-row" style="margin: var(--tb-space-2) 0">${html}</div>`

// Fields laid out in columns on the stage.
const grid = html =>
  `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--tb-space-5) var(--tb-space-4); align-items: start">${html}</div>`

const icon = body =>
  `<svg class="tb-icon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

const I = {
  search: icon('<circle cx="7" cy="7" r="4.25"/><path d="m10.25 10.25 3.5 3.5"/>'),
  plus: icon('<path d="M8 3v10M3 8h10"/>'),
  check: icon('<path d="m3.25 8.5 3 3 6.5-7"/>'),
  close: icon('<path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/>'),
  chevron: icon('<path d="m4.5 6.25 3.5 3.5 3.5-3.5"/>'),
  more: icon('<path d="M3.5 8h.01M8 8h.01M12.5 8h.01"/>'),
  report: icon('<path d="M4 1.75h5.25L12 4.5v9.75H4z"/><path d="M9 1.75V4.75h3M6 8.5h4M6 11h4"/>'),
  label: icon('<path d="M2.25 2.25h5.5l6 6-5.5 5.5-6-6z"/><path d="M5.25 5.25h.01"/>'),
  download: icon('<path d="M8 2.25v8M4.75 7 8 10.25 11.25 7M2.75 13.75h10.5"/>'),
  trash: icon('<path d="M2.75 4.25h10.5M6.25 4.25v-1.5h3.5v1.5M4.25 4.25l.6 9.5h6.3l.6-9.5"/>'),
  table: icon('<path d="M2.25 2.75h11.5v10.5H2.25zM2.25 6.25h11.5M2.25 9.75h11.5M6.25 6.25v7"/>'),
  tree: icon('<path d="M8 2.5v3M8 5.5 4 9.5M8 5.5l4 4"/><path d="M2.75 9.5h2.5v3h-2.5zM10.75 9.5h2.5v3h-2.5z"/>'),
  ai: icon('<path d="M8 1.75 9.4 6.6l4.85 1.4-4.85 1.4L8 14.25 6.6 9.4 1.75 8l4.85-1.4z"/>'),
}

/* ------------------------------------------------------------------------------------------
   Button
   ------------------------------------------------------------------------------------------ */

const buttonMain = `
<button class="tb-button tb-button--primary" type="button">Confirm segment</button>`

const buttonGroup = `
<div class="tb-button-group" role="group" aria-label="View">
  <button class="tb-button" type="button" aria-pressed="true">Table</button>
  <button class="tb-button" type="button" aria-pressed="false">Tree</button>
  <button class="tb-button" type="button" aria-pressed="false">Report</button>
</div>`

const button = {
  id: 'button',
  title: 'Button',
  lead: 'Starts an action. One primary button per view.',
  body: `
    <p>Buttons start an action: confirm a segment, add an account to a report, run an export. The primary button is the action the person came to the screen for. Everything else is default, and actions that repeat on every row are minimal so the table stays quiet.</p>

    <h3>Variants</h3>
    ${example(`
      ${buttonMain}
      <button class="tb-button" type="button">${I.plus}Add to report</button>
      <button class="tb-button tb-button--minimal" type="button">Skip</button>
      <button class="tb-button tb-button--danger" type="button">${I.trash}Delete account</button>
    `, buttonMain)}

    <h3>States</h3>
    ${stageOnly(`
      <button class="tb-button" type="button">Default</button>
      <button class="tb-button is-active" type="button">Active</button>
      <button class="tb-button" type="button" disabled>Disabled</button>
      <button class="tb-button tb-button--primary" type="button" disabled>Confirm segment</button>
      <button class="tb-button tb-button--primary is-loading" type="button" aria-busy="true">Confirm segment</button>
      <button class="tb-button is-loading" type="button" aria-busy="true">Add to report</button>
      <button class="tb-button tb-button--minimal is-active" type="button">Minimal active</button>
    `)}

    <h3>Sizes and icon buttons</h3>
    ${stageOnly(`
      <button class="tb-button tb-button--primary tb-button--sm" type="button">Confirm segment</button>
      <button class="tb-button tb-button--primary" type="button">Confirm segment</button>
      <button class="tb-button tb-button--primary tb-button--lg" type="button">Confirm segment</button>
      <button class="tb-button tb-button--icon tb-button--sm" type="button" aria-label="More actions">${I.more}</button>
      <button class="tb-button tb-button--icon" type="button" aria-label="Download report">${I.download}</button>
      <button class="tb-button tb-button--icon tb-button--lg" type="button" aria-label="Add to report">${I.plus}</button>
      <button class="tb-button tb-button--icon tb-button--minimal" type="button" aria-label="More actions">${I.more}</button>
    `)}

    <h3>Button group</h3>
    <p>A group joins related buttons, most often a switch between views. Mark the current one with <code>aria-pressed="true"</code>.</p>
    ${example(`
      ${buttonGroup}
      <div class="tb-button-group" role="group" aria-label="Zoom">
        <button class="tb-button tb-button--icon" type="button" aria-label="Table view">${I.table}</button>
        <button class="tb-button tb-button--icon" type="button" aria-label="Tree view" aria-pressed="true">${I.tree}</button>
      </div>
    `, buttonGroup)}

    <h3>Rules</h3>
    ${rules([
      'Use <code>--primary</code> once per view, for the main action. Use the default for the rest.',
      'Use <code>--minimal</code> for actions repeated on every row or card, and in toolbars.',
      'Use <code>--danger</code> only for actions that destroy data. Pair it with a dialog that says what is lost.',
      'An icon-only button always has an <code>aria-label</code>, and usually a tooltip with the same words.',
      'While a request runs, add <code>is-loading</code> and <code>aria-busy="true"</code>. The label keeps its width, so the layout does not move.',
      'Labels are verbs with an object: "Confirm segment", "Add to report". Avoid "OK" and "Submit".',
      'Use <code>--sm</code> inside tables and dense toolbars, <code>--lg</code> only on standalone screens such as sign-in.',
    ])}
    ${doDont(
      `One primary action, the rest default.${sample(`
        <button class="tb-button tb-button--primary" type="button">Confirm segment</button>
        <button class="tb-button" type="button">Skip account</button>`)}`,
      `Two primaries side by side. Nobody can tell which one moves the work on.${sample(`
        <button class="tb-button tb-button--primary" type="button">Confirm segment</button>
        <button class="tb-button tb-button--primary" type="button">Add to report</button>`)}`,
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Input
   ------------------------------------------------------------------------------------------ */

const inputMain = `
<div class="tb-field">
  <label class="tb-field-label" for="doc-account-ref">Account ID</label>
  <input class="tb-input" id="doc-account-ref" type="text" placeholder="AC-1228" aria-describedby="doc-account-ref-help">
  <p class="tb-field-help" id="doc-account-ref-help">Two letters, a hyphen and four digits.</p>
</div>`

const inputGroup = `
<div class="tb-input-group">
  ${I.search}
  <input class="tb-input" type="search" placeholder="Search accounts" aria-label="Search accounts">
  <button class="tb-button tb-button--icon tb-button--minimal" type="button" aria-label="Clear search">${I.close}</button>
</div>`

const inputGroupCode = `
<div class="tb-input-group">
  <svg class="tb-icon" aria-hidden="true"><!-- search icon --></svg>
  <input class="tb-input" type="search" placeholder="Search accounts" aria-label="Search accounts">
  <button class="tb-button tb-button--icon tb-button--minimal" type="button" aria-label="Clear search">
    <svg class="tb-icon" aria-hidden="true"><!-- close icon --></svg>
  </button>
</div>`

const input = {
  id: 'input',
  title: 'Input',
  lead: 'Free text: a reference, a search, a note.',
  body: `
    <p>Inputs take text a person types: an account ID, a search query, a threshold, a note on a segment. Put every input in a <code>tb-field</code>, so it has a visible label and room for help text and an error. Use a textarea for notes longer than one line.</p>

    <h3>Field</h3>
    ${example(grid(`
      ${inputMain}
      <div class="tb-field is-invalid">
        <label class="tb-field-label" for="doc-threshold">Revenue threshold (EUR)</label>
        <input class="tb-input" id="doc-threshold" type="text" value="ten thousand" aria-invalid="true" aria-describedby="doc-threshold-help doc-threshold-error">
        <p class="tb-field-help" id="doc-threshold-help">Accounts above this amount are highlighted.</p>
        <p class="tb-field-error" id="doc-threshold-error">Enter a number, for example 10000.</p>
      </div>
      <div class="tb-field">
        <label class="tb-field-label" for="doc-account-id">Account ID</label>
        <input class="tb-input" id="doc-account-id" type="text" value="AC-1228" readonly>
        <p class="tb-field-help">Read only. Set when the account is created.</p>
      </div>
      <div class="tb-field">
        <label class="tb-field-label" for="doc-owner">Account manager</label>
        <input class="tb-input" id="doc-owner" type="text" value="Assigned automatically" disabled>
      </div>
      <div class="tb-field">
        <label class="tb-field-label" for="doc-note">Note for the report</label>
        <textarea class="tb-input" id="doc-note" placeholder="Why this segment, in one or two sentences"></textarea>
      </div>
    `), inputMain, 'is-block')}

    <h3>Input group</h3>
    <p>A group puts a leading icon and a trailing button inside the input border. The trailing button is <code>--icon</code> or <code>--sm</code>.</p>
    ${example(grid(`
      ${inputGroup}
      <div class="tb-input-group">
        ${I.label}
        <input class="tb-input" type="text" placeholder="Filter segments" aria-label="Filter segments">
        <button class="tb-button tb-button--sm" type="button">Apply</button>
      </div>
      <div class="tb-input-group">
        ${I.search}
        <input class="tb-input" type="search" placeholder="Search accounts" aria-label="Search accounts, disabled" disabled>
      </div>
    `), inputGroupCode, 'is-block')}

    <h3>Sizes</h3>
    ${stageOnly(grid(`
      <input class="tb-input tb-input--sm" type="text" placeholder="Small, in tables" aria-label="Small input">
      <input class="tb-input" type="text" placeholder="Default" aria-label="Default input">
      <input class="tb-input tb-input--lg" type="text" placeholder="Large, standalone screens" aria-label="Large input">
    `), 'is-block')}

    <h3>Rules</h3>
    ${rules([
      'Every input has a visible label. An input without one, such as a search in a toolbar, has an <code>aria-label</code>.',
      'The placeholder shows an example of the format. It never replaces the label, because it disappears on the first keystroke.',
      'Mark errors with <code>is-invalid</code> on the field and <code>aria-invalid="true"</code> on the input. Link the error text with <code>aria-describedby</code>.',
      'Error text says how to fix the value: "Enter a number, for example 10000". Avoid "Invalid input".',
      'Validate when the person leaves the field or submits, never on every keystroke.',
      'Use <code>readonly</code> for values a person should see and copy but not change. Use <code>disabled</code> only when the value does not apply right now.',
    ])}
    ${doDont(
      `Label above, example in the placeholder.${sample(`
        <div class="tb-field" style="flex: 1">
          <label class="tb-field-label" for="doc-do-ref">Account ID</label>
          <input class="tb-input" id="doc-do-ref" type="text" placeholder="AC-1228">
        </div>`)}`,
      `The placeholder as the only label. It is gone as soon as the person types.${sample(`
        <input class="tb-input" type="text" placeholder="Account ID" aria-label="Account ID">`)}`,
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Select
   ------------------------------------------------------------------------------------------ */

const selectMain = `
<div class="tb-field">
  <label class="tb-field-label" for="doc-status">Account status</label>
  <select class="tb-select" id="doc-status">
    <option>All accounts</option>
    <option selected>At risk</option>
    <option>Active</option>
    <option>Paused</option>
  </select>
</div>`

const select = {
  id: 'select',
  title: 'Select',
  lead: 'One value from a short, known list.',
  body: `
    <p>Select picks one value from a short list that the person already knows: an account status, a report format, a time range. It is the native element with Tabula styling, so the keyboard, touch screens and screen readers all behave the way people expect. It has the same height as an input, so both line up in a form or a toolbar.</p>
    ${example(grid(`
      ${selectMain}
      <div class="tb-field">
        <label class="tb-field-label" for="doc-range">Time range</label>
        <select class="tb-select tb-select--sm" id="doc-range">
          <option>Last 7 days</option>
          <option selected>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
        <p class="tb-field-help">Small size, for toolbars and tables.</p>
      </div>
      <div class="tb-field is-invalid">
        <label class="tb-field-label" for="doc-format">Report format</label>
        <select class="tb-select" id="doc-format" aria-invalid="true" aria-describedby="doc-format-error">
          <option value="" selected>Choose a format</option>
          <option>PDF</option>
          <option>Spreadsheet</option>
        </select>
        <p class="tb-field-error" id="doc-format-error">Choose a format to export the report.</p>
      </div>
      <div class="tb-field">
        <label class="tb-field-label" for="doc-model">Model</label>
        <select class="tb-select" id="doc-model" disabled>
          <option>Churn model, version 3</option>
        </select>
      </div>
    `), selectMain, 'is-block')}

    <h3>Rules</h3>
    ${rules([
      '<code>tb-select--sm</code> and <code>tb-select--lg</code> follow the same sizes as buttons and inputs.',
      'Use a select for three to about fifteen options. For two options, use radios. For an on or off setting, use a switch.',
      'For long lists, such as companies or accounts, use an input with a menu of results.',
      'When no default makes sense, start on an empty option that says what to do: "Choose a format".',
      'Option labels are short and parallel: "Last 7 days", "Last 30 days". Do not mix formats in one list.',
      'Changing a select in a toolbar applies at once. In a form, the change waits for the submit button.',
    ])}
  `,
}

/* ------------------------------------------------------------------------------------------
   Checkbox and radio
   ------------------------------------------------------------------------------------------ */

const checkboxMain = `
<label class="tb-checkbox">
  <input type="checkbox" checked>
  <span>Restrict to confirmed segments</span>
</label>`

const radioCode = `
<div role="radiogroup" aria-label="Report format">
  <label class="tb-radio">
    <input type="radio" name="format" value="pdf" checked>
    <span>PDF</span>
  </label>
  <label class="tb-radio">
    <input type="radio" name="format" value="sheet">
    <span>Spreadsheet</span>
  </label>
</div>`

const checkbox = {
  id: 'checkbox',
  title: 'Checkbox and radio',
  lead: 'Checkbox for independent options, radio for one choice in a set.',
  body: `
    <p>A checkbox turns one option on or off, independent of the others: restrict the analysis to confirmed segments, include paused accounts. A radio picks exactly one option from a small set. Both keep the native input in the page, hidden, so the keyboard and screen readers work as usual, and the span after it draws the box.</p>

    <h3>Checkbox</h3>
    ${example(`
      <div class="tb-stack tb-gap-1">
        ${checkboxMain}
        <label class="tb-checkbox">
          <input type="checkbox">
          <span>Include paused accounts</span>
        </label>
        <label class="tb-checkbox">
          <input type="checkbox" data-tb-indeterminate>
          <span>Select all 24 accounts on this page</span>
        </label>
        <label class="tb-checkbox">
          <input type="checkbox" disabled>
          <span>Share with the customer (not available)</span>
        </label>
        <label class="tb-checkbox">
          <input type="checkbox" checked disabled>
          <span>Keep an audit trail</span>
        </label>
      </div>
    `, checkboxMain)}
    <p>The indeterminate state means part of the items it controls are selected. Set it with <code>data-tb-indeterminate</code>, or with <code>input.indeterminate = true</code> from your own code.</p>

    <h3>Radio</h3>
    ${example(`
      <div class="tb-stack tb-gap-1" role="radiogroup" aria-label="Report format">
        <label class="tb-radio">
          <input type="radio" name="doc-format-radio" value="pdf" checked>
          <span>PDF</span>
        </label>
        <label class="tb-radio">
          <input type="radio" name="doc-format-radio" value="sheet">
          <span>Spreadsheet</span>
        </label>
        <label class="tb-radio">
          <input type="radio" name="doc-format-radio" value="slides" disabled>
          <span>Slides (not available)</span>
        </label>
      </div>
    `, radioCode)}

    <h3>Rules</h3>
    ${rules([
      'Use a checkbox when each option stands alone and the change is saved with the form.',
      'Use radios for two to five exclusive options. Beyond five, use a select.',
      'In a radio group, one option is always selected. Pick the safest one as the default.',
      'Labels say what happens when the box is checked: "Restrict to confirmed segments". Avoid negatives like "Do not include paused accounts".',
      'The whole label is the click target. Do not put links or buttons inside it.',
      'A checkbox with no visible text, such as a row selector in a table, keeps an empty span and gets an <code>aria-label</code> on the input.',
    ])}
    ${doDont(
      `A positive label, checked means on.${sample(`
        <label class="tb-checkbox"><input type="checkbox" checked><span>Include paused accounts</span></label>`)}`,
      `A negative label. The reader has to reverse it before deciding.${sample(`
        <label class="tb-checkbox"><input type="checkbox"><span>Do not exclude paused accounts</span></label>`)}`,
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Switch
   ------------------------------------------------------------------------------------------ */

const switchMain = `
<label class="tb-switch">
  <input type="checkbox" role="switch" checked>
  <span class="tb-switch-track"></span>
  <span>Show AI suggestions</span>
</label>`

const switchLabelled = `
<label class="tb-switch">
  <input type="checkbox" role="switch">
  <span class="tb-switch-track" data-on="On" data-off="Off"></span>
  <span>Auto-refresh</span>
</label>`

const toggle = {
  id: 'switch',
  title: 'Switch',
  lead: 'A setting that takes effect the moment it changes.',
  body: `
    <p>A switch turns a setting on or off and applies it at once, with no save button: show AI suggestions in the tree, refresh the account list every minute. It is a checkbox underneath with <code>role="switch"</code>, so screen readers announce it as on or off. Add <code>data-on</code> and <code>data-off</code> to the track for a label inside it.</p>
    ${example(`
      <div class="tb-stack tb-gap-1">
        ${switchMain}
        <label class="tb-switch">
          <input type="checkbox" role="switch">
          <span class="tb-switch-track"></span>
          <span>Restrict to confirmed segments</span>
        </label>
        ${switchLabelled}
        <label class="tb-switch">
          <input type="checkbox" role="switch" checked>
          <span class="tb-switch-track" data-on="On" data-off="Off"></span>
          <span>Highlight high churn risk</span>
        </label>
        <label class="tb-switch">
          <input type="checkbox" role="switch" disabled>
          <span class="tb-switch-track"></span>
          <span>Share with the customer (not available)</span>
        </label>
        <label class="tb-switch">
          <input type="checkbox" role="switch" checked disabled>
          <span class="tb-switch-track"></span>
          <span>Keep an audit trail</span>
        </label>
      </div>
    `, switchMain)}

    <h3>Rules</h3>
    ${rules([
      'Use a switch when the change applies immediately. Inside a form that waits for a submit button, use a checkbox.',
      'The label names the setting and stays the same in both states: "Show AI suggestions". Do not rewrite it to "Hide AI suggestions" when on.',
      'Keep the inner label to three characters or less, such as On and Off. Longer words make the track jump in width.',
      'If turning a setting on takes time, show progress next to the switch and keep the switch in its new position.',
    ])}
    ${doDont(
      `A switch for a view setting that applies at once.${sample(switchMain)}`,
      `A switch in a form with a submit button. The person expects it to apply already, and it does not.${sample(`
        <label class="tb-switch"><input type="checkbox" role="switch"><span class="tb-switch-track"></span><span>Add to report</span></label>
        <button class="tb-button tb-button--primary tb-button--sm" type="button">Save</button>`)}`,
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Tag
   ------------------------------------------------------------------------------------------ */

const tagMain = `
<span class="tb-tag tb-tag--danger">
  <span class="tb-tag-dot"></span>
  At risk
</span>`

const tagRemoveCode = `
<span class="tb-tag">
  Revenue over 10,000&nbsp;€
  <button class="tb-tag-remove" type="button" data-tb-tag-remove aria-label="Remove filter: Revenue over 10,000&nbsp;€">
    <svg class="tb-icon" aria-hidden="true"><!-- close icon --></svg>
  </button>
</span>`

const removable = text => `
  <span class="tb-tag">
    ${text}
    <button class="tb-tag-remove" type="button" data-tb-tag-remove aria-label="Remove filter: ${text}">${I.close}</button>
  </span>`

const tag = {
  id: 'tag',
  title: 'Tag',
  lead: 'A short label for a status, a category or an active filter.',
  body: `
    <p>Tags label a thing with a status or a category: an account marked at risk, a segment suggested by the model, a filter that is on. They are small and read at a glance in a table row. The colour carries the meaning, so each colour has one job. <code>--ai</code> marks anything the model suggested, and <code>--confirmed</code> marks what a person has checked. The two always stay apart.</p>

    <h3>Variants</h3>
    ${example(`
      <span class="tb-tag">Active</span>
      <span class="tb-tag tb-tag--accent">In review</span>
      ${tagMain}
      <span class="tb-tag tb-tag--warning">Needs review</span>
      <span class="tb-tag tb-tag--success">Renewed</span>
      <span class="tb-tag tb-tag--ai">${I.ai}AI suggested</span>
      <span class="tb-tag tb-tag--confirmed">${I.check}Confirmed</span>
    `, tagMain)}

    <h3>With a dot, and minimal</h3>
    ${stageOnly(`
      <div class="tb-stack">
        <div class="tb-row">
          <span class="tb-tag"><span class="tb-tag-dot"></span>Draft</span>
          <span class="tb-tag tb-tag--accent"><span class="tb-tag-dot"></span>In review</span>
          <span class="tb-tag tb-tag--danger"><span class="tb-tag-dot"></span>At risk</span>
          <span class="tb-tag tb-tag--warning"><span class="tb-tag-dot"></span>Needs review</span>
          <span class="tb-tag tb-tag--success"><span class="tb-tag-dot"></span>Renewed</span>
          <span class="tb-tag tb-tag--ai"><span class="tb-tag-dot"></span>AI suggested</span>
          <span class="tb-tag tb-tag--confirmed"><span class="tb-tag-dot"></span>Confirmed</span>
        </div>
        <div class="tb-row">
          <span class="tb-tag tb-tag--minimal"><span class="tb-tag-dot"></span>Draft</span>
          <span class="tb-tag tb-tag--minimal tb-tag--accent"><span class="tb-tag-dot"></span>In review</span>
          <span class="tb-tag tb-tag--minimal tb-tag--danger"><span class="tb-tag-dot"></span>At risk</span>
          <span class="tb-tag tb-tag--minimal tb-tag--warning"><span class="tb-tag-dot"></span>Needs review</span>
          <span class="tb-tag tb-tag--minimal tb-tag--success"><span class="tb-tag-dot"></span>Renewed</span>
          <span class="tb-tag tb-tag--minimal tb-tag--ai"><span class="tb-tag-dot"></span>AI suggested</span>
          <span class="tb-tag tb-tag--minimal tb-tag--confirmed"><span class="tb-tag-dot"></span>Confirmed</span>
        </div>
      </div>
    `)}
    <p>Minimal drops the fill and keeps the colour. Use it in dense tables where a column of filled tags would be too loud.</p>

    <h3>Removable and interactive</h3>
    <p>A remove button with <code>data-tb-tag-remove</code> removes its tag. The tag first fires a cancelable <code>tb:tag-remove</code> event, so your code can update the filter or keep the tag. An interactive tag is a button, for filters a person turns on and off.</p>
    ${example(`
      <div class="tb-stack">
        <div class="tb-row">
          ${removable('Revenue over 10,000&nbsp;€')}
          ${removable('Last 30 days')}
          ${removable('At risk')}
        </div>
        <div class="tb-row">
          <button class="tb-tag tb-tag--interactive" type="button" aria-pressed="true">At risk</button>
          <button class="tb-tag tb-tag--interactive" type="button" aria-pressed="false">Needs review</button>
          <button class="tb-tag tb-tag--interactive" type="button" aria-pressed="false">Renewed</button>
          <button class="tb-tag tb-tag--interactive" type="button" disabled>Archived</button>
        </div>
      </div>
    `, tagRemoveCode)}

    <h3>Rules</h3>
    ${rules([
      'One colour, one meaning. <code>--danger</code> is at risk or a failed check, <code>--warning</code> needs a person, <code>--success</code> is renewed, <code>--accent</code> is in progress.',
      'Anything the model produced carries <code>--ai</code> until a person confirms it. Then it becomes <code>--confirmed</code>. Never show a suggestion as confirmed.',
      'Keep tag text to one to three words. Put the detail in the row or a tooltip.',
      'Do not rely on colour alone. The words carry the meaning, and the dot or icon backs them up.',
      'A plain tag is not clickable. When a tag does something, make it a <code>button</code> with <code>--interactive</code>.',
      'The remove button always has an <code>aria-label</code> that names what it removes.',
    ])}
    ${doDont(
      `Show the origin. The model's suggestion and the account owner's decision look different.${sample(`
        <span class="tb-tag tb-tag--ai">${I.ai}AI suggested</span>
        <span class="tb-tag tb-tag--confirmed">${I.check}Confirmed</span>`)}`,
      `Colour a model suggestion as if it were a decision. An account owner will read it as settled.${sample(`
        <span class="tb-tag tb-tag--danger">At risk</span>
        <span class="tb-tag tb-tag--danger">At risk</span>`)}`,
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Menu
   ------------------------------------------------------------------------------------------ */

const menuStatic = `
<div class="tb-popover">
  <div class="tb-menu" role="menu" aria-label="Account actions">
    <div class="tb-menu-heading">Account AC-1228</div>
    <button class="tb-menu-item" type="button" role="menuitem">${I.plus}<span class="tb-menu-label">Add to report</span><span class="tb-menu-hint">R</span></button>
    <button class="tb-menu-item" type="button" role="menuitem">${I.check}<span class="tb-menu-label">Confirm segment</span><span class="tb-menu-hint">C</span></button>
    <button class="tb-menu-item is-active" type="button" role="menuitem">${I.tree}<span class="tb-menu-label">Open in tree</span></button>
    <button class="tb-menu-item is-disabled" type="button" role="menuitem" aria-disabled="true">${I.download}<span class="tb-menu-label">Export data</span><span class="tb-menu-hint">Admins only</span></button>
    <div class="tb-menu-divider" role="separator"></div>
    <button class="tb-menu-item tb-menu-item--danger" type="button" role="menuitem">${I.trash}<span class="tb-menu-label">Delete account</span></button>
  </div>
</div>`

const dropdownMain = `
<div class="tb-dropdown">
  <button class="tb-button" type="button" data-tb-dropdown>
    Actions
    ${I.chevron}
  </button>
  <div class="tb-popover">
    <div class="tb-menu" role="menu">
      <button class="tb-menu-item" type="button" role="menuitem">${I.plus}<span class="tb-menu-label">Add to report</span></button>
      <button class="tb-menu-item" type="button" role="menuitem">${I.check}<span class="tb-menu-label">Confirm segment</span></button>
      <div class="tb-menu-divider" role="separator"></div>
      <button class="tb-menu-item tb-menu-item--danger" type="button" role="menuitem">${I.trash}<span class="tb-menu-label">Delete account</span></button>
    </div>
  </div>
</div>`

const dropdownCode = `
<div class="tb-dropdown">
  <button class="tb-button" type="button" data-tb-dropdown>
    Actions
    <svg class="tb-icon" aria-hidden="true"><!-- chevron icon --></svg>
  </button>
  <div class="tb-popover">
    <div class="tb-menu" role="menu">
      <button class="tb-menu-item" type="button" role="menuitem">
        <svg class="tb-icon" aria-hidden="true"><!-- plus icon --></svg>
        <span class="tb-menu-label">Add to report</span>
        <span class="tb-menu-hint">R</span>
      </button>
      <div class="tb-menu-divider" role="separator"></div>
      <button class="tb-menu-item tb-menu-item--danger" type="button" role="menuitem">
        <span class="tb-menu-label">Delete account</span>
      </button>
    </div>
  </div>
</div>`

const menu = {
  id: 'menu',
  title: 'Menu',
  lead: 'A list of actions, opened from a button.',
  body: `
    <p>A menu lists actions on one thing, most often an account or a row, when there are too many for buttons. Items have an optional icon, a label and an optional hint on the right, such as a keyboard shortcut. The menu sits in a <code>tb-popover</code>, the floating container with a shadow. Give the trigger <code>data-tb-dropdown</code>, put the popover right after it, and wrap both in <code>tb-dropdown</code>. The menu then opens below the trigger.</p>

    <h3>Items and states</h3>
    ${stageOnly(menuStatic, 'is-canvas')}

    <h3>Dropdown</h3>
    <p>Click a trigger to open its menu. It closes on a click outside, on Escape and when an item is chosen. Arrow keys move between items, and only one menu is open at a time. Add <code>tb-popover--end</code> to align the menu to the right edge of the trigger.</p>
    ${example(`
      ${dropdownMain}
      <div class="tb-dropdown">
        <button class="tb-button tb-button--icon tb-button--minimal" type="button" data-tb-dropdown aria-label="More actions">${I.more}</button>
        <div class="tb-popover tb-popover--end">
          <div class="tb-menu" role="menu">
            <div class="tb-menu-heading">Sort by</div>
            <button class="tb-menu-item" type="button" role="menuitemradio" aria-checked="true"><span class="tb-menu-label">Churn risk</span></button>
            <button class="tb-menu-item" type="button" role="menuitemradio" aria-checked="false"><span class="tb-menu-label">Revenue</span></button>
            <button class="tb-menu-item" type="button" role="menuitemradio" aria-checked="false"><span class="tb-menu-label">Last order</span></button>
          </div>
        </div>
      </div>
    `, dropdownCode)}

    <h3>Opening upwards</h3>
    <p>Add <code>tb-popover--up</code> when the trigger sits at the bottom of the screen, such as the account menu at the foot of the left sidebar. It combines with <code>tb-popover--end</code>. The sample below is held open.</p>
    ${example(`
      <div class="tb-dropdown" style="margin-top: 76px">
        <button class="tb-button" type="button" aria-expanded="true">
          Export
          ${I.chevron}
        </button>
        <div class="tb-popover tb-popover--up">
          <div class="tb-menu" role="menu">
            <button class="tb-menu-item" type="button" role="menuitem"><span class="tb-menu-label">PDF report</span></button>
            <button class="tb-menu-item" type="button" role="menuitem"><span class="tb-menu-label">CSV of at-risk accounts</span></button>
          </div>
        </div>
      </div>
    `, `
<div class="tb-dropdown">
  <button class="tb-button" type="button" data-tb-dropdown>Export</button>
  <div class="tb-popover tb-popover--up">
    <div class="tb-menu" role="menu">...</div>
  </div>
</div>`)}

    <h3>Rules</h3>
    ${rules([
      'Use a menu for three or more secondary actions. For one or two, show buttons.',
      'Open a menu upwards with <code>tb-popover--up</code> only when there is no room below the trigger.',
      'Put the most frequent action first and the destructive one last, under a divider.',
      'Labels are verbs with an object, as on buttons. The hint is a shortcut or a short reason, never a sentence.',
      'Show unavailable actions as disabled when a person would look for them, and say why in the hint. Hide actions that never apply to this user.',
      'Use <code>is-active</code> or <code>aria-checked="true"</code> for the current choice in a sort or view menu.',
      'Do not nest menus. Split them, or move the options to a dialog.',
    ])}
    ${doDont(
      `Destructive action last, set apart by a divider, in danger colour.${sample(`
        <div class="tb-popover" style="flex: 1">
          <div class="tb-menu">
            <button class="tb-menu-item" type="button"><span class="tb-menu-label">Add to report</span></button>
            <div class="tb-menu-divider"></div>
            <button class="tb-menu-item tb-menu-item--danger" type="button"><span class="tb-menu-label">Delete account</span></button>
          </div>
        </div>`)}`,
      `Delete account between everyday actions, where a slip of the mouse reaches it.${sample(`
        <div class="tb-popover" style="flex: 1">
          <div class="tb-menu">
            <button class="tb-menu-item" type="button"><span class="tb-menu-label">Add to report</span></button>
            <button class="tb-menu-item" type="button"><span class="tb-menu-label">Delete account</span></button>
            <button class="tb-menu-item" type="button"><span class="tb-menu-label">Confirm segment</span></button>
          </div>
        </div>`)}`,
    )}
  `,
}

/* ------------------------------------------------------------------------------------------
   Tooltip
   ------------------------------------------------------------------------------------------ */

const tooltipMain = `
<button class="tb-button tb-button--icon" type="button" aria-label="Add to report" data-tb-tooltip="Add to report">
  ${I.plus}
</button>`

const tooltipCode = `
<button class="tb-button tb-button--icon" type="button" aria-label="Add to report" data-tb-tooltip="Add to report">
  <svg class="tb-icon" aria-hidden="true"><!-- plus icon --></svg>
</button>`

const tooltip = {
  id: 'tooltip',
  title: 'Tooltip',
  lead: 'A short label that names a control on hover or focus.',
  body: `
    <p>A tooltip names a control that has no visible text, most often an icon button, or adds one short fact to it. Put the text in <code>data-tb-tooltip</code>. It appears above the element after 300 ms of hover or keyboard focus, and below it when there is no room above. It goes away on leave, on blur, on click and on Escape.</p>

    <h3>Live</h3>
    <p>Hover or tab to these buttons.</p>
    ${example(`
      ${tooltipMain}
      <button class="tb-button tb-button--icon" type="button" aria-label="Confirm segment" data-tb-tooltip="Confirm segment">${I.check}</button>
      <button class="tb-button tb-button--icon" type="button" aria-label="Download report" data-tb-tooltip="Download report">${I.download}</button>
      <button class="tb-button" type="button" data-tb-tooltip="Only segments an account owner has confirmed are used">Restrict to confirmed segments</button>
    `, tooltipCode)}

    <h3>Appearance</h3>
    ${stageOnly(`
      <div class="tb-tooltip" aria-hidden="true" style="position: static">Add to report</div>
      <div class="tb-tooltip" aria-hidden="true" style="position: static">Only segments an account owner has confirmed are used</div>
    `, 'is-canvas')}

    <h3>Rules</h3>
    ${rules([
      'Every icon-only button has a tooltip with the same words as its <code>aria-label</code>.',
      'Keep it to a few words, one line if possible. It is a label, not help text.',
      'Never put the only copy of important information in a tooltip. Touch screens do not show it.',
      'Do not put links or buttons in a tooltip. It disappears when the pointer moves to them.',
      'Put tooltips on elements that can take focus, so keyboard users see them too. A disabled button cannot take focus, so explain why it is disabled next to it.',
    ])}
    ${doDont(
      `Name the icon in the words of the product.${sample(`
        <button class="tb-button tb-button--icon" type="button" aria-label="Add to report" data-tb-tooltip="Add to report">${I.plus}</button>`)}`,
      `Write a paragraph that a person has to hold the mouse still to read.${sample(`
        <button class="tb-button tb-button--icon" type="button" aria-label="Add to report" data-tb-tooltip="Adds the selected account to the report that is open. You can remove it later from the report screen, and it will keep its segment.">${I.plus}</button>`)}`,
    )}
  `,
}

export const sections = [button, input, select, checkbox, toggle, tag, menu, tooltip]
