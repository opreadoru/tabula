// Getting started: what Tabula is, how to install it, and the first page in HTML and in
// React. Short and practical, in the spirit of the first pages of any design system's docs.

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

const codeOnly = code => `<div class="doc-example"><pre class="doc-example-code" style="border-top: 0">${esc(dedent(code))}</pre></div>`

const rules = items => `<ul class="doc-rules">${items.map(i => `<li>${i}</li>`).join('')}</ul>`

const table = (head, rows) => `
  <table class="doc-table">
    <thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`

// The pre-paint snippet a product puts in its head. Reads the saved theme and menu position before the
// first paint, so nothing flashes the wrong way then jumps.
const HEAD_SNIPPET = `<script>try { var s = localStorage, h = document.documentElement.classList, n = s.getItem('tb-nav'), c = s.getItem('tb-nav-collapsed'); if (s.getItem('tb-theme') !== 'light') h.add('tb-dark'); if (n === 'left') h.add('tb-nav-left'); if (c === '1') h.add('tb-nav-collapsed') } catch (e) {}</script>`

/* ------------------------------------------------------------------------------------------
   Overview
   ------------------------------------------------------------------------------------------ */

const overview = {
  id: 'overview',
  title: 'Overview',
  lead: 'An open design system for dense data UI: framework-agnostic CSS, a small JS layer, and React wrappers for teams that want them.',
  body: `
    <p>Tabula is built once and used everywhere a product needs a screen: tables, trees, charts, reports and the shell around them. It is plain CSS and a small vanilla JS layer, so it works the same inside a React app, a static HTML page, or a prototype thrown together for a demo. Nothing here depends on a framework.</p>
    <p>Version 0.1 is free and open source under the MIT licence. Use it, copy it and change it as you like.</p>
    ${table(['Ships as', 'Holds'], [
      ['Tokens', 'Colour, type, spacing, shape, motion and layer values as CSS custom properties, named by role.'],
      ['Base', 'The reset and the page defaults: box sizing, font, background, focus outline.'],
      ['Controls', 'Button, input, select, checkbox, radio, switch, tag, menu, tooltip.'],
      ['Surfaces', 'Card, table, tabs, dialog, toast, callout, empty state, progress.'],
      ['Patterns', 'Avatar, description list, stat, chip group, breadcrumbs, toolbar, filter rail, list, legend, and the app shell classes.'],
      ['Behaviours', 'A JS layer with no state of its own: <code>tb.init(root)</code> wires every <code>data-tb-*</code> attribute under <code>root</code>, and <code>tb.toast()</code> shows a toast.'],
    ])}
    ${rules([
      'One CSS file and one JS module carry the whole system. There is no per-component import.',
      'Everything is a token or a class. Nothing here reaches into a framework\'s internals, so it drops into any front end.',
      'React wrappers exist for convenience only. They render the same classes a hand-written page would.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Installation
   ------------------------------------------------------------------------------------------ */

const installation = {
  id: 'installation',
  title: 'Installation',
  lead: 'There is no package to install yet. Copy the src folder into your project.',
  body: `
    <p>Tabula is not published, so there is nothing to install with npm today. It becomes a package when it is rebuilt on the real product, with the developers.</p>
    <p>The system is two files: one stylesheet with every token and class, and one JS module exposing <code>tb.init</code> and <code>tb.toast</code>. The examples on this site link them by name, as <code>tabula.css</code> and <code>tabula.js</code>.</p>
    ${codeOnly(`
<link rel="stylesheet" href="tabula.css" />
<script type="module" src="tabula.js"></script>`)}
    <h3>Import order</h3>
    <p>Put the pre-paint snippet in <code>&lt;head&gt;</code>, before the stylesheet, so the saved theme and menu position are right on the first paint and nothing flashes the wrong way and then jumps. Every page of a product carries the same script.</p>
    ${codeOnly(HEAD_SNIPPET)}
    ${rules([
      'Pre-paint snippet first, inline, before any stylesheet.',
      'The Tabula stylesheet next, so tokens and classes are ready before anything renders.',
      'The app script last, as a module, so it can rely on the styles already being in place.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Usage in HTML
   ------------------------------------------------------------------------------------------ */

const usageHtml = {
  id: 'usage-html',
  title: 'Usage in HTML',
  lead: 'A card, a table and a button, wired with one call.',
  body: `
    <p>Write the markup with Tabula's classes, then call <code>tb.init()</code> once the page is in the DOM. It wires every behaviour the CSS alone cannot do: the table's sort, and anything else on the page using a <code>data-tb-*</code> attribute.</p>
    ${example(`
      <div class="tb-card" style="width: 360px">
        <div class="tb-card-header"><h3 class="tb-card-title">Sources</h3></div>
        <div class="tb-card-body tb-card-body--flush">
          <div class="tb-table-wrap">
            <table class="tb-table">
              <thead><tr><th data-tb-sort>File</th><th class="is-num" data-tb-sort="desc">Rows</th></tr></thead>
              <tbody>
                <tr><td>orders_2026_Q3.csv</td><td class="is-num">18,204</td></tr>
                <tr><td>accounts_2026.csv</td><td class="is-num">480</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="tb-card-footer">
          <button class="tb-button tb-button--primary" type="button">Add source</button>
        </div>
      </div>
    `, `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script>/* pre-paint snippet, see Installation */</script>
  <link rel="stylesheet" href="tabula.css" />
</head>
<body>
  <div class="tb-card" style="width: 360px">
    <div class="tb-card-header"><h3 class="tb-card-title">Sources</h3></div>
    <div class="tb-card-body tb-card-body--flush">
      <div class="tb-table-wrap">
        <table class="tb-table">
          <thead><tr><th data-tb-sort>File</th><th class="is-num" data-tb-sort="desc">Rows</th></tr></thead>
          <tbody>
            <tr><td>orders_2026_Q3.csv</td><td class="is-num">18,204</td></tr>
            <tr><td>accounts_2026.csv</td><td class="is-num">480</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="tb-card-footer">
      <button class="tb-button tb-button--primary" type="button">Add source</button>
    </div>
  </div>

  <script type="module">
    import { tb } from './tabula.js'
    tb.init(document)
  </script>
</body>
</html>`, 'is-block is-canvas')}
    ${rules([
      'Call <code>tb.init()</code> with no argument once, after the page loads, to wire everything on it.',
      'After adding new markup at runtime, such as a row or a dialog, call <code>tb.init(newElement)</code> again on just that part.',
      'Click the column headers above to try the sort this page just wired.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Usage in React
   ------------------------------------------------------------------------------------------ */

const usageReact = {
  id: 'usage-react',
  title: 'Usage in React',
  lead: 'Thin components that render Tabula classes. They add no behaviour of their own.',
  body: `
    ${codeOnly(`
import './tabula.css'
import { Button, Card, Tag, Stat, Dialog } from './react'`)}
    ${codeOnly(`
import { useEffect, useRef } from 'react'
import { tb } from './tabula.js'
import { Button, Card, Tag, Stat } from './react'

function SourceCard({ source }) {
  const ref = useRef(null)
  useEffect(() => { tb.init(ref.current) }, [source])

  return (
    <div ref={ref}>
      <Card>
        <Card.Header><h3 className="tb-card-title">{source.name}</h3></Card.Header>
        <Card.Body>
          <Tag tone="success">Imported</Tag>
          <Stat label="Rows" value={source.rows} />
        </Card.Body>
        <Card.Footer>
          <Button variant="primary">Open analysis</Button>
        </Card.Footer>
      </Card>
    </div>
  )
}`)}
    ${rules([
      'Every wrapper accepts <code>className</code> and merges it with the classes it renders, so a page can add layout without forking the component.',
      'The wrappers are markup only. Anything wired by <code>data-tb-*</code>, such as dropdowns, dialogs, tabs, tooltips and sortable tables, still needs <code>tb.init(root)</code> called once on the rendered DOM, usually from a <code>useEffect</code> with a ref.',
      'A component that is only a class, such as <code>Tag</code> or <code>Stat</code>, needs no <code>tb.init</code> call.',
      'The React wrappers are source files today, not a package.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Theming
   ------------------------------------------------------------------------------------------ */

const theming = {
  id: 'theming',
  title: 'Theming',
  lead: 'Override role tokens, never the palette behind them.',
  body: `
    <p>Every visual decision in Tabula is a role token: <code>--tb-accent</code>, not the blue it happens to point at today. The palette tokens (<code>--tb-p-*</code>) are private to <code>tokens.css</code> and exist only so the role tokens have somewhere to point. To theme the system, set role tokens on <code>:root</code>; never reach past them to a palette value or a raw colour.</p>
    ${codeOnly(`
:root {
  --tb-accent: #0449ab;
  --tb-accent-hover: #033a8c;
  --tb-accent-active: #022c6e;
}`)}
    <h3>Dark mode</h3>
    <p>Dark is the default. The head script adds <code>tb-dark</code> to <code>&lt;html&gt;</code> unless the saved choice is light. Toggle the <code>tb-dark</code> class on <code>&lt;html&gt;</code> to switch. Every role token has a dark value already defined under <code>.tb-dark</code> in <code>tokens.css</code>; a page never branches its own CSS on the theme.</p>
    ${codeOnly(`document.documentElement.classList.toggle('tb-dark', dark)`)}
    <h3>Brand tokens</h3>
    <p><code>--tb-brand-1</code> through <code>--tb-brand-4</code> are the four brand colours: three for the stack in the logo, and the ink that joins them in the pattern. They are decoration only, used by <code>tb-brand-mark</code> and <code>--tb-brand-pattern</code>, and never carry a status. Set them alongside the role tokens when the brand changes.</p>
    ${rules([
      'Set role tokens (<code>--tb-*</code>), never palette tokens (<code>--tb-p-*</code>) or a raw hex value, so a later brand change is a token swap and not a search across every page.',
      'Provide both the light and the dark value for anything overridden, under <code>:root</code> and under <code>.tb-dark</code>.',
      'Brand tokens stay decorative. A status keeps using the semantic tokens (danger, warning, success) even in a rebrand.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Icons
   ------------------------------------------------------------------------------------------ */

const iconography = {
  id: 'iconography',
  title: 'Adding icons',
  lead: 'Lucide, inlined as SVG, sized and coloured by one class.',
  body: `
    <p>Icons come from <a href="https://lucide.dev">Lucide</a>, the <code>lucide-static</code> package, copied in as they ship. There is no icon font and no sprite sheet: each icon is an inline <code>&lt;svg&gt;</code> so it can take the surrounding text colour and sit on the 16px grid controls use.</p>
    ${codeOnly(`<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />
</svg>`)}
    ${rules([
      'Copy the icon\'s inner paths from <code>lucide-static</code> as they ship, and wrap them in the shape above. <code>tb-icon</code> does the sizing and the colour.',
      'Hide a decorative icon next to text with <code>aria-hidden="true"</code>. An icon alone needs an <code>aria-label</code> on its button.',
      'Full rules, the library set already in use, and the two hand-drawn product icons are in Foundations, under Icons.',
    ])}`,
}

/* ------------------------------------------------------------------------------------------
   Conventions
   ------------------------------------------------------------------------------------------ */

const conventions = {
  id: 'conventions',
  title: 'Conventions',
  lead: 'How the class names, states and behaviours are built, so a new one reads like the rest.',
  body: `
    ${table(['Pattern', 'Means', 'Example'], [
      ['<code>tb-</code>', 'Every class the system owns starts with it, so it never collides with a product\'s own CSS.', '<code>tb-button</code>, <code>tb-card</code>'],
      ['<code>--modifier</code>', 'A variant of a base class, always paired with it, set once and not toggled at runtime.', '<code>tb-button--primary</code>, <code>tb-tag--danger</code>'],
      ['<code>is-state</code>', 'A state on the element itself, toggled at runtime as the UI changes.', '<code>is-active</code>, <code>is-selected</code>, <code>is-loading</code>'],
      ['<code>data-tb-*</code>', 'Marks an element for the JS layer to wire. Read once by <code>tb.init(root)</code>.', '<code>data-tb-dropdown</code>, <code>data-tb-sort</code>, <code>data-tb-tabs</code>'],
      ['<code>--_private</code>', 'A custom property local to one rule, set and read by the same file. Never set from outside it.', '<code>--_dialog-width</code>, <code>--_tone</code>'],
    ])}
    ${rules([
      '<code>tb-sr-only</code> hides text visually and keeps it for screen readers, for live announcements and labels. <code>tb-root</code> gives an element the body styles, for mounting the system inside a page that is not Tabula.',
      'Reach for an existing modifier or state before adding a new class. Most needs are already a combination of the two.',
      'After adding markup with a <code>data-tb-*</code> attribute at runtime, call <code>tb.init()</code> on it, or nothing will wire.',
      'Every number a person reads goes through the shared formatters (<code>src/format.js</code>: <code>fmtInt</code>, <code>fmtPct</code>, <code>fmtEur</code>, <code>fmtDate</code>, <code>fmtTime</code>, <code>fmtDateTime</code>, <code>fmtBytes</code>, <code>band</code>), never <code>toLocaleString</code>, <code>toFixed</code> or a hand-built string, so one figure reads the same on every screen.',
    ])}`,
}

export const sections = [overview, installation, usageHtml, usageReact, theming, iconography, conventions]
