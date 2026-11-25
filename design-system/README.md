# Kappa Pi Beta Design System v2

Kappa Pi Beta is a brotherhood brand: formal, disciplined, proud. Black, charcoal, and one red. League Spartan in caps. Soft 8px and 12px corners on controls and cards, square on bands, stripes, and the logo. Real photographs of real Brothers.

This v2 system has foundations (this page and `tokens.json`), **50 live previews** (45 UI/foundation components including v2 additions **Combobox**, **CampusPalette**, and **DiagramNode**, plus 5 brand templates for social, print, and email), page patterns for national, chapter, Project Phoenix, and lineage/data apps, an accessibility checklist, a zero-dependency build script (`npm run build`), and an automated WCAG + contract test suite (`npm test`).

## What's New in v2

- **Transparent dark & footer lockups:** Replaced the harsh white logo box on dark surfaces with a transparent `.kp-plate` rendering the crest intact (`0–22%`) and the wordmark masked in white (`--on-band`, `22–100%`) across dark-mode headers and dark footers in both themes.
- **Official 6-university campus palette (`--school-0`..`--school-5`):** NIU Cardinal Red, UIC Flames Blue, Mizzou Tiger Gold, UIUC Illini Orange, Purdue Old Gold, and Northwestern Purple — each verified ≥ 3.0:1 UI contrast in both Light and Dark themes across regular, raised, and root-node surfaces.
- **Elevated light-mode diagram root cards (`--node-root-*`):** Anchor/root diagram cards stay a crisp elevated `#FFFFFF` surface with `2px` charcoal border and subtle drop shadow in light mode (no harsh pitch-black block on a light canvas), and a soft `#2A2A2A` elevated card in dark mode.
- **Full non-truncated live-search Combobox:** Autocomplete lists render all matching options as you type inside a scrollable popover (`max-height: min(280px, 50vh)`) instead of capping results with `"N more. Press Search to see all."`.
- **Flush-left header & responsive mobile polish:** Full-width safe-area header alignment, `16px` input/select floor (prevents iOS Safari auto-zoom), `44px` minimum touch targets, and full `prefers-reduced-motion` suppression.
- **Single-source build & automated verification:** Run `npm run build` to regenerate `tokens.css` and `index.html` from `tokens.json`; run `npm test` to verify token parity, WCAG 2.2 AA contrast, and component integrity.

## Content fundamentals

- Name it in full first: **Kappa Pi Beta Fraternity, Inc.** After that, "Kappa Pi Beta" or "KPiB". Greek letters are **ΚΠΒ** (capital Kappa, Pi, Beta). Never "KPB" in running copy.
- Motto: "Unity is the Beginning of Brotherhood." Virtues: **Respect and Discipline**. Mascot: the Phoenix. Founded March 16, 2000 at Northern Illinois University.
- Six pillars, in this order when listed: Academic Excellence, Brotherhood, Cultural Awareness, Leadership, Professionalism, Service and Philanthropy.
- Describe the fraternity as an **Asian-interest** fraternity, never Asian-exclusive. Say "Brothers" (capital B) for members and "chapter" for a campus. Chapters are Alpha (NIU), Beta (UIC), Gamma (UIUC), Delta (Purdue); Mizzou and Northwestern are represented in the campus palette.
- Voice: first-person plural, formal and warm, brotherhood before recruitment. Keep sentences short; no slang, no emoji, no exclamation marks.
- Buttons are verbs of two to four words ("Join the brotherhood", "Find a chapter"). Errors say what happened and how to fix it.
- Dates: "March 16, 2000", never "3/16/00". Times: "7:00 PM". Counts and ranges: "8 to 10", not "8-10".

## Visual foundations

- **Color.** Three brand colors: `brand-red` `#B22222`, `brand-black` `#000000`, `brand-charcoal` `#363636`. Neutrals (`surface`, `surface-raised`, `surface-band`, `ink`, `ink-muted`, borders) structure UI; `--school-0`..`--school-5` carry campus identity in data views; `--node-root-*` elevates diagram anchor cards. Red is rare: one primary red CTA per view plus the 2px header/footer rules.
- **Themes.** Light is the default (`surface` `#FFFFFF`, `ink` `#000000`). Dark uses `surface` `#0B0B0B` with `accent` lifted to `#E57373`. Both themes set explicit `color-scheme`.
- **Type.** League Spartan (Light to Black); Arial fallback. Display and `heading-1` uppercase at 700–800; `heading-2` and `heading-3` title case; body 16px/24px at 400 (minimum `16px` on inputs/selects to prevent iOS auto-zoom); `12px` absolute typography floor. Use tabular numerals for figures, dates, and tables.
- **Logo.** Primary lockup (crest + KAPPA PI BETA + motto) on light surfaces (`--logo-plate`), and transparent with white masked wordmark (`--on-band`) on dark headers and dark footers in both themes. Never place a white rectangle behind the logo on a dark background.
- **Shape.** `radius-md` (8px) on buttons, inputs, popovers, icon tiles; `radius-lg` (12px) on cards, diagram nodes, photos, tables, pillars; `radius-sm` (4px) on badges; `radius-pill` (999px) on avatars, switches, campus dots, and count pills. Bands, header, footer, stripes, and logo plates stay square (`radius-sharp`).
- **Depth.** Borders over shadows: cards use `border-hairline`, controls `border-strong`. Menus/popovers take `shadow-popover`; diagram anchor/root nodes take `node-root-shadow`. No glows or colored gradients.
- **Iconography & Motion.** Lucide 2px outline icons (`20px` inline in `--accent`, `24px` in tiles), always `aria-hidden="true"` next to text, never in main nav links or primary text CTAs. Motion answers interaction only (`100ms`–`300ms` `ease-out` on named properties, zero `@keyframes` ambient motion, disabled completely under `prefers-reduced-motion`).

## Build & Verify

```bash
npm run build   # Generates tokens.css and index.html from tokens.json + components/
npm test        # Runs automated token parity, WCAG 2.2 AA contrast, and CSS contract checks
```
