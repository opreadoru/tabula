# Tabula, React

Thin JSX wrappers over Tabula's classes, as source files to copy next to your own
components. Nothing here is built or bundled, and there is no `package.json` in this folder.

Each wrapper maps props to `tb-*` classes and renders the plain markup the CSS expects.
None of them wire behaviour. Call `tb.init(root)` after mounting, in an effect, for
dropdowns, dialogs, tabs, tooltips and sortable tables to work.

See the Getting started section of the docs site, "Usage in React", for an example.
