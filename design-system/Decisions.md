# Decisions (v2)

Open and resolved brand decisions between the source brand guide and this system.

| Item | Current choice (v2) | Alternative / Notes |
| --- | --- | --- |
| Brand red | `#B22222` at the team's direction; Brand Guidelines V1 says `#DC172A` (RGB `#DC1F2D`) | Set `brand-red` and light `accent` to the guide value for print |
| Corners | Soft: `8px` controls, `12px` cards/nodes (team request); bands, header, footer, stripes stay `0px` | Set `radius-md` and `radius-lg` to `0px` for square print style |
| Dark theme | Extension: `#0B0B0B` surface, `#1A1A1A` raised, `#363636` band, `#E57373` accent | Remove `[data-theme="dark"]` if a print-only artifact needs light only |
| Logo on dark (v2) | Transparent `.kp-plate`: crest clipped intact (`0–22%`) + white masked wordmark (`--on-band`, `22–100%`) on dark-mode headers and dark footers in both themes — no white rectangle | Swap in a native white-wordmark PNG asset from Branding Guide when supplied |
| Campus colors (v2) | Official university colors (`--school-0`..`--school-5`: NIU, UIC, Mizzou, UIUC, Purdue, Northwestern) tuned for WCAG >= 3.0:1 UI contrast in both Light and Dark themes | Keep as data accents only; never theme full pages in campus colors |
| Light-mode diagram root (v2) | Elevated `#FFFFFF` card (`--node-root-bg`) with `2px` `#363636` border and soft drop shadow instead of pitch-black `--surface-band` | Dark mode uses soft charcoal `#2A2A2A` with `#D0D0D0` border |
| Live-search combobox (v2) | Render all matching results in a scrollable popover (`max-height: min(280px, 50vh)`) as the user types; no arbitrary truncation row | Add virtualization only if datasets exceed ~2,000 rows |
| Header alignment (v2) | Full-width `.kp-hdr .in` with safe-area padding so the logo aligns flush-left with app toolbars | Reading sections below remain constrained to `--container` (`1200px`) |
| Icons | Lucide 2px outline (`currentColor`), decorative only (`aria-hidden`), none in main nav or text CTAs | Swap SVG paths if a custom KPiB icon set is commissioned |
| Fonts | League Spartan from Google Fonts; Arial fallback | Self-host WOFF2 files in `fonts/` if strict offline rendering is needed |
| Forms | No backend by default; validate, copy, keep a draft | Connect a form service per chapter |

## Content to confirm before publishing a chapter site

Event dates, rush steps, role names and descriptions, advisor and Instagram handles, the "500+ Brothers" figure (a 2024 claim), named Rush Chairs on the Delta flyer, Beta's public status, Northwestern's charter criteria (written for semesters; the campus runs quarters), and Project Phoenix eligibility and voting body.
