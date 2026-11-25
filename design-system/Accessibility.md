# Accessibility (v2)

Target: **WCAG 2.2 AA**, verified automatically via `npm test` (`scripts/verify.mjs`) in both Light and Dark themes.

## Contrast (automated verification)

### Text & Controls (≥ 4.5:1 text, ≥ 3.0:1 UI borders)

| Pair | Light | Dark | Requirement |
| --- | --- | --- | --- |
| `ink` on `surface` / `surface-raised` | 21.0:1 / 19.1:1 | 19.7:1 / 17.4:1 | ≥ 4.5:1 |
| `ink-muted` on `surface` / `surface-raised` | 7.36:1 / 6.70:1 | 10.0:1 / 8.85:1 | ≥ 4.5:1 |
| `accent` on `surface` / `surface-raised` | 6.46:1 / 5.88:1 | 6.57:1 / 5.81:1 | ≥ 4.5:1 |
| `on-accent` on `brand-red` / `brand-red-hover` | 6.46:1 / 7.36:1 | 6.46:1 / 7.36:1 | ≥ 4.5:1 |
| `on-band` / `on-band-muted` on `surface-band` | 21.0:1 / 11.9:1 | 12.1:1 / 7.91:1 | ≥ 4.5:1 |
| `node-root-ink` / `node-root-muted` on `node-root-bg` | 21.0:1 / 7.36:1 | 14.3:1 / 9.16:1 | ≥ 4.5:1 |
| `border-strong` on `surface` / `surface-raised` | 4.28:1 / 3.89:1 | 5.69:1 / 5.03:1 | ≥ 3.0:1 |
| `node-root-border` on `surface-raised` | 10.8:1 | 11.5:1 | ≥ 3.0:1 |

### Official Campus Palette (≥ 3.0:1 UI contrast on `surface`, `surface-raised`, and `node-root-bg`)

| Token | Campus | Light (`#FFF` / `#F4F4F4`) | Dark (`#0B0B0B` / `#1A1A1A` / `#2A2A2A`) |
| --- | --- | --- | --- |
| `--school-0` | Northern Illinois (NIU) | `#C8102E` (5.88 / 5.35) | `#F05469` (5.79 / 5.12 / 4.02) |
| `--school-1` | UIC | `#003DA5` (9.50 / 8.64) | `#5B9BFF` (7.10 / 6.28 / 4.95) |
| `--school-2` | Mizzou | `#B57E00` (3.44 / 3.13) | `#F1B82D` (10.90 / 9.64 / 7.60) |
| `--school-3` | UIUC | `#E04E18` (3.98 / 3.62) | `#FF7A3D` (7.59 / 6.72 / 5.29) |
| `--school-4` | Purdue | `#8E6F3E` (4.67 / 4.25) | `#CEB888` (10.16 / 8.98 / 7.08) |
| `--school-5` | Northwestern | `#4E2A84` (10.56 / 9.60) | `#A784E8` (6.66 / 5.89 / 4.64) |

## Checklist

- Every interactive element shows a 2px `focus-ring` with a 2px offset; never removed.
- Touch targets are `44px` or more (`--hit-min`); primary/secondary buttons and inputs are `48px` (`--control-height`).
- Inputs and selects use at least `16px` font size to prevent iOS Safari focus auto-zoom.
- Native elements first (`button`, `a`, `details`, `dialog`, `input`, `select`).
- Tables carry `th scope="col"`; stacked mobile rows (`<=700px`) carry `data-label`.
- Live-search comboboxes follow WAI-ARIA combobox + listbox (`aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-selected`, polite live status) and preserve query text on `Escape`.
- Skip link is first in tab order; single `<h1>` per page; current page has `aria-current="page"`.
- Mobile menu button exposes `aria-expanded` and `aria-controls`; `Escape` closes and returns focus.
- `prefers-reduced-motion: reduce` disables all animations, transitions, and smooth scrolling (`scroll-behavior: auto`).
- Zero `@keyframes` ambient animations; text resizes to 200% without loss; no text below `12px`.
