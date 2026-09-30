# Tabula

An open design system for data-dense products: tables, trees, charts and reports that people read all day. It is dense, sharp and quiet. Everything is a token or a class, so it drops into any front end, with thin React wrappers when you want them.

Version 0.1, September 2026. Designed and built by [Alex Oprea](https://opreadoru.com). Free and open source under the MIT licence.

See it live: [the documentation](https://opreadoru.github.io/tabula/) and [the template pages](https://opreadoru.github.io/tabula/pages/dashboard.html).



https://github.com/user-attachments/assets/67ce81c7-9cdc-45e6-8b68-1590ae0ab2a7



## What is inside

- **150 tokens** in `src/tokens.css`: 57 palette values behind 93 role tokens, six of them for chart series. Components use roles only, so the brand changes one file.
- **Light and dark themes.** The `tb-dark` class redefines 40 roles. Nothing else changes.
- **16 components** (8 controls, 8 surfaces) and **19 patterns**, including the app shell, edit mode, a timeline, a chart library and tree views.
- **Behaviours** in plain JS: dropdowns, dialogs, tabs, tooltips, sortable tables, toasts, card collapse, card focus, expandable charts, a layout editor and widget zones, the app shell, eight chart builders and the tree views.
- **Formatters** in `src/format.js` for every number, amount, percentage, date and file size.
- **Template pages** in `pages/`: a dashboard, analytics, a data table, a record in detail, a report and a layout editor, on one seeded set of generic business data.
- **A documentation site** with a live example, the exact markup, rules and do and don't for every component, plus the foundations: colour, type, spacing, shape, formatting, states and icons.

## Run the docs

```
npm install
npx vite --port 5190
```

The documentation opens at `http://localhost:5190/`, and the templates at `http://localhost:5190/pages/dashboard.html`.

## Use it

In plain HTML, load the styles and the small behaviour layer, then use the classes:

```html
<link rel="stylesheet" href="src/tabula.css">
<script type="module">
  import { tb } from './src/tabula.js'
  tb.init(document)
</script>

<button class="tb-button tb-button--primary" type="button">Save</button>
<span class="tb-tag tb-tag--danger">Overdue</span>
```

`tb.init(root)` wires the behaviours through `data-tb-*` attributes, so markup from any framework works. Call it again after rendering new markup. `tb.toast({ message, intent })` shows a toast.

Card collapse, card focus and expandable charts are opt-in: import `src/collapse.js`, `src/focus.js` or `src/expand.js` once. Edit mode and widget zones are mounted by the page with `mountEditMode` from `src/edit.js` and `mountZone` from `src/zone.js`, with the product's widget catalogue passed in.

The app bar is mounted with `mountShell` from `src/shell.js`, with the product's brand, tabs, submenus and account passed in; it also loads collapse, focus and expand. Charts come from `src/charts.js` and the four tree views from `src/tree.js`. The templates in `pages/` show each of them on a full page.

In React, the wrappers in `react/` map props to the same classes. They are source files to copy next to your own components. See `react/README.md`.

For the dark theme, put `tb-dark` on `<html>`.

## Conventions

- Classes start with `tb-`. Modifiers use `--`, states use `is-`, behaviours use `data-tb-*`.
- Tokens only. No raw colours in components or pages.
- Numbers on screen go through the formatters in `src/format.js`.
- A pattern used on two pages moves into the system.
- The documentation changes with every component change.

## Folders

```
src/     the system: tokens, base styles, components, behaviours, formatters
docs/    the documentation site
pages/   template pages built on the system, with their shared data
react/   thin React wrappers, source only
```

## Credits

Icons from [Lucide](https://lucide.dev), ISC licence, inlined as SVG. Instrument Sans, SIL Open Font License.

## Licence

MIT. See `LICENSE`.
