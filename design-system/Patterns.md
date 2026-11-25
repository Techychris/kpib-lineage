# Patterns (v2)

How components assemble into complete pages across the KPiB site family.

## Site family

| Site | Pages | Audience |
| --- | --- | --- |
| National | Home, About, Membership, Philanthropy, Chapters, Contact | Prospects, parents, alumni, partners |
| Chapter (Alpha, Beta, Gamma, Delta, Northwestern colony) | Home, About, Rush, Calendar, Contact | Students on that campus |
| Project Phoenix | Home, Seats, Process, FAQ, Apply | Brothers and alumni |
| Lineage & Member Directory (v2) | Home (hero live search), Lineage Tree (SVG graph + Generations list), Member Table (searchable/sortable directory) | Brothers, alumni, and chapter historians |

Every site carries the same flush-left header and dark-band footer (both using the transparent white-wordmark lockup on dark backgrounds).

## Page recipes

**Home.** Header, Hero (5fr/6fr split above 900px, single primary red CTA), Stat band or Founder/Chapter grid, SectionHead + Pillars, MottoBand, Footer.

**Lineage & Data Apps (v2).**
- **Hero live search:** Full-width `Combobox` inside the hero dark band with non-truncated scrollable suggestions and polite live-region counts.
- **Interactive Tree:** Full-viewport `100dvh` app shell with flush-left Header, compact phone toolbar (`<=700px` or short landscape touchscreens `<=520px` height) expanding to inline desktop toolbar (`>=701px` desktop / iPad portrait & landscape), `--surface-raised` SVG canvas using `DiagramNode` (elevated light-mode root card) and `CampusPalette` bars/key, plus native `<dialog>` for Connections.
- **Member Table:** Sticky header, campus filter pills (`CampusPalette`), tabular numerals, 8 columns above `920px`, 5 compact columns `701–919px`, and stacked mobile cards with `data-label` under `700px` (with `16px` selects to prevent iOS Safari auto-zoom).

**About / Rush / Calendar / Contact.** PageHeader, 62–68ch prose, Timeline, IconRows, Steps, Accordion, EventRows, or Contact Form with one primary CTA.

## Layout & Responsive rules

- Two split grids at most per page, 5/6 or 7/5, stacked under `900px` (never let split-background widths leak into `700–899px` tablet portrait).
- Grids are 3 columns on desktop (`>=900px`), 2 on tablet (`600–899px`), 1 on phone (`<600px`).
- Text columns: 62 to 68 characters. Headlines left-aligned.
- Safe areas: pad full-bleed chrome with `env(safe-area-inset-left/right/bottom)` for notched iPhones and home indicators.
- On phones: stack in reading order, zero horizontal overflow, nothing under `12px`, inputs/selects at least `16px`, tap targets at least `44px`.
