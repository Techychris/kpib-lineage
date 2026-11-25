# Kappa Pi Beta Lineage (`kpib-lineage`)

Interactive static web app for exploring the Big Brother and Class Dad lineage of **Kappa Pi Beta Fraternity, Inc.** (founded March 16, 2000 at Northern Illinois University) across 618 brothers, 6 campuses, and 6 founder branches.

## Pages & Architecture

- [`index.html`](index.html) — Landing page with animated hero, live keyboard-accessible member search combobox, founder cards, and reading guide.
- [`tree.html`](tree.html) — Interactive D3 pan/zoom lineage tree, Generations list view, and Connections `<dialog>`, supporting both Big Brother and Class Dad modes.
- [`table.html`](table.html) — Searchable, school-filterable, 8-column sortable member table with `sessionStorage` state persistence.
- [`state-machines.js`](state-machines.js) — Pure, explicit finite state machines governing all UI state transitions across the site.
- [`lineage-data.js`](lineage-data.js), [`class-dads.js`](class-dads.js), [`relationships.js`](relationships.js) — Static Master Binder roster dataset, crossing classes, aliases, and derived relationship graphs.
- [`kpib.css`](kpib.css), [`kpib.js`](kpib.js), [`icons.js`](icons.js) — Shared design system tokens, light/dark themes, responsive rules, and SVG icon registry.

## Documentation

- [Product & Technical Spec](docs/spec.md)
- [UX & Accessibility Audit](docs/ux-audit.md)
- [Code Review & Engineering Audit](docs/code-review-audit.md)
- [Apple Mobile, Tablet & Desktop Screen Audit](docs/device-screen-audit.md)

## Testing & 100% Code Coverage

Requires Node.js (zero external npm dependencies):

```bash
npm test
npm run test:coverage
```

`npm run test:coverage` enforces **100% line, branch, and function coverage** across all first-party JS files and all inline HTML `<script>` blocks, plus full dataset integrity checks (acyclic forests, chronological ordering, campus/class dad resolution, and alias normalization).
