# Templates

## User and problem

The user is a designer or front-end developer deciding whether to use Tabula. They need to see the system on realistic screens full of data and charts, and to lift a page as the starting point for their own product.

So the pages are agnostic. They show layouts and behaviour on generic business figures, and they do not pretend to be a product.

## The pages

| Page | File | What it shows |
| --- | --- | --- |
| Dashboard | `dashboard.html` | Key figures with sparklines, revenue over time against a comparison period, revenue by region and by product, a country table. Every chart filters the others. The layout can be edited. |
| Analytics | `analytics.html` | Charts only: stacked area, funnel, stacked bars, heatmap, scatter with a brush, histogram, and the revenue hierarchy in the four tree views. |
| Data table | `table.html` | A fitted page of 480 accounts: filter rail, sorting, row selection, sparklines in cells, a detail pane, J and K, Add data with live progress on rows. |
| Detail | `detail.html` | One account in full: key figures, a timeline, related accounts and charts about that account. |
| Report | `report.html` | A long document with an outline, versions with a lifecycle and a comparison, history per section, inline comments and an export dialog. |
| Layout editor | `editor.html` | A free page built with edit mode and the widget catalogue, opening on a choice between a template and an empty page. |

## How a page is built

Every page is `<name>.html` with `<name>.css` and `<name>.js` beside it. Page classes carry a prefix: `db-` dashboard, `an-` analytics, `dt-` data table, `de-` detail, `rp-` report, `le-` layout editor, and `pg-` for the few pieces shared in `shared/pages.css`.

**Head.** Copy the theme and dock line from any page into `<head>` before the stylesheets (it is `HEAD_SNIPPET` in `src/shell.js`), then link `../src/tabula.css`, `./shared/pages.css` and the page CSS.

**Shell.** `mountPage(id, options)` from `shared/nav.js` mounts the system shell (`src/shell.js`) with the templates' brand, tabs, submenus and account. Call it first, before anything measures the layout. A page the user shapes passes `layout: 'free'` and marks its cards with `data-tb-section`.

**Data.** `shared/data.js` is the only source of figures: two years of daily revenue, orders, visits, signups and active users per country, the product mix, 480 accounts with their monthly revenue and timelines, the funnel, orders by weekday and hour, and the revenue hierarchy. It is seeded, so every load and every machine sees the same numbers. Pages ask it with `sum`, `daily`, `split`, `monthly`, `hourly` and `funnel`, and format every answer through `src/format.js`. No figure is typed into a page.

**System first.** Charts come from `src/charts.js`, the tree views from `src/tree.js`, the timeline from `tb-timeline`. Page CSS is only for the page grid and what only that page draws. A pattern used on two pages moves into the system and into the docs.

**Screenshot flags.** Every page takes `#light`, `#dark`, `#nav-left` and `#nav-collapsed` on the hash, joined with `+`. Each page lists its own at the top of its script.
