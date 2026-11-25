# Design System Audit — `kpib-design-system` vs. `kpib-lineage`

**Source Package:** `kpib-design-system.zip` (Kappa Pi Beta Design System v1: `tokens.json`, `tokens.css`, `components/bundle.css`, `README.md`, `Accessibility.md`, `Patterns.md`, `Decisions.md`)  
**Target Repository:** `Techychris/kpib-lineage`  
**Audit Date:** 2026-11-24

---

## Part 1 — Audit of `kpib-design-system` Itself

Overall, the Kappa Pi Beta Design System v1 is unusually clear, disciplined, and accessibility-conscious: WCAG 2.2 AA contrast ratios are pre-verified in light and dark themes, semantic native HTML elements (`<dialog>`, `<details>`, `<th>`, `aria-current`) are prioritized, and open brand ambiguities are documented transparently in `Decisions.md`.

### Internal Gaps & Recommendations for `kpib-design-system`

| ID | Severity | Location | Finding & Recommendation |
| :--- | :---: | :--- | :--- |
| **SYS-01** | Medium | `components/bundle.css:150–151` vs `Patterns.md:33` | **Breakpoint mismatch:** `Patterns.md` specifies 3 cols desktop, 2 under `900px`, 1 under `600px`, while `bundle.css` uses `max-width: 700px` and `max-width: 480px`. Align `bundle.css` to `900px` and `600px` (mobile-first). |
| **SYS-02** | Medium | `tokens.css:2` | **Render-blocking `@import`:** `tokens.css` loads Google Fonts via CSS `@import` instead of HTML `<link rel="preconnect">` + `<link rel="stylesheet">`. Prefer `<link>` in page `<head>` for faster FCP. |
| **SYS-03** | Medium | `tokens.css:3,26,46–47` | **Missing `color-scheme` & dark shadow override:** `tokens.css` omits `color-scheme: light` / `color-scheme: dark` (needed for native scrollbars and `<select>` popups) and leaves `--shadow-card` active in dark mode despite `tokens.json` stating dark mode uses `border-hairline` instead. |
| **SYS-04** | Low | `components/bundle.css:60` vs `tokens.json:348` | **Footer logo plate radius contradiction:** `tokens.json` and `README.md` require `logo-plate` to stay square (`radius-sharp: 0px`), yet `bundle.css:60` sets `.kp-ftr .kp-plate { border-radius: var(--radius-md); }`. |
| **SYS-05** | Low | `components/bundle.css:95,233` vs `README.md:41` | **Color literals in bundle:** `#fff` and `#FFFFFF` appear in `.kp-pgrid figcaption` and `.kp-art` despite the *"Never write a color literal in a component"* rule (use `var(--on-band)`). |
| **SYS-06** | Low | `components/bundle.css:152,248` | **Reduced motion & `sr-only` polish:** `@media(prefers-reduced-motion:reduce)` turns off `transition` only—add `animation: none !important; scroll-behavior: auto !important;` (`Accessibility.md:29`). Replace `left: -9999px` on `.kp-t thead` with `clip-path: inset(50%)` to avoid horizontal scroll/focus quirks in RTL/screen readers. |
| **SYS-07** | Info | `tokens.json` | **Missing categorical data-viz tokens:** The system covers brand & neutral UI tokens cleanly, but has no categorical palette for multi-campus charts/diagrams. `kpib-lineage`'s `--school-0..5` tokens are a reasonable app-level extension and could be formally added as a data-viz group in v2. |

---

## Part 2 — Compliance Audit of `kpib-lineage` Against `kpib-design-system`

| ID | Severity | Design System Rule | Violation in `kpib-lineage` | Remediation Implemented |
| :--- | :---: | :--- | :--- | :--- |
| **DS-01** | **P1 — High** | `README.md:21`, `Decisions.md:13`, `tokens.json:49–55`: Dark-surface lockup uses white wordmark (or white `logo-plate` fallback if no white lockup asset exists). | Needed clean dark-mode lockup without a jarring white box across dark headers. | Restored transparent dark-mode `.kp-plate` (keeping crest full-color and rendering the wordmark in `var(--ink)` with `-webkit-mask` + `mask` for Safari/Chromium) and flush-left header alignment; swap in the official white lockup PNG from Branding Guide when available (`Decisions.md:13`). |
| **DS-02** | **P1 — High** | `README.md:35`, `Accessibility.md:29`: Hover, focus, accordion, and menu transitions only (`150ms ease-out` on named properties). **No scroll animation, no load animation, no parallax.** | `index.html` ran entrance keyframes, `IntersectionObserver` scroll reveals, scroll-driven parallax (`--py`), infinite SVG hero animations, and card/button `transform` lifts. | Removed load/scroll/parallax/ambient SVG animations and transform lifts; kept `150ms ease-out` color/border/background transitions only; added `animation: none` and `scroll-behavior: auto` under `prefers-reduced-motion`. |
| **DS-03** | **P1 — High** | `README.md:31`, `Header/README.md:5`, `Icon/README.md:1–3`: **Buttons and main nav carry no icons.** Content icons are `20px` (`--icon-md`) in `accent`. | Main nav, mobile nav, footer nav, and CTA `.kp-btn` buttons all carried `16px` icons; content heading icons used `currentColor` instead of `accent`. | Removed decorative icons from main/mobile/footer nav links and text `.kp-btn` buttons; styled content icons at `var(--icon-md)` (`20px`) in `var(--accent)`; kept icons strictly for icon-only/compact utility controls; pruned unused icons from `icons.js`. |
| **DS-04** | **P1 — High** | `README.md:18`, `Patterns.md:17`: **One red primary button per page (in the hero).** Red is rare; no extra decorative red borders. | `index.html` hero stacked two `.kp-btn.p` red buttons (`Search` + `Explore the tree`) plus an extra red `.kp-hero` bottom border. | Kept **Search** as the sole red primary button (`.kp-btn.p`); changed **Explore the tree** to secondary outline (`.kp-btn.s`); removed extra hero bottom border. |
| **DS-05** | **P1 — High** | `README.md:25,41`, `Accessibility.md:20`: Borders over shadows (**only menus/popovers/dialogs take `shadow-popover`**); no glows; never write color literals; never remove focus outlines. | `#homeSearch` input & button had heavy drop shadows, focus glow (`outline: none`), and hardcoded `#fff/#111/#555/#eee/#0a0a0a` literals; `.kp-card:hover` added popover shadow. | Removed non-menu shadows/glows; restored `2px solid var(--focus-ring)` focus ring on `#homeSearch`; replaced all component color literals with semantic design tokens; synced all missing `tokens.css` variables. |
| **DS-06** | **P1 — High** | `Accessibility.md:23`, `Table/README.md`, `bundle.css:247–252`: Tables stack vertically on phones (`<=700px`) with `data-label` on each `<td>`. | `table.html` forced 4 cramped columns (`74–81px` each) on 375px iPhones with duplicate `.crossing-note` / `.lineage-note` / `.relationship-notes` DOM nodes and no `data-label`. | Added `data-label` to every `<td>` in `table.html`, adopted stacked card-row mobile table layout (`<=700px`), and removed redundant compact-note DOM elements. |
| **DS-07** | **P2 — Medium** | `Accessibility.md:28`, `MobileMenu/README.md`: Mobile menu trigger exposes `aria-expanded` and `aria-controls`; Escape closes it and restores focus. | `.kp-menu > summary` omitted `aria-expanded` and `aria-controls`. | Added `id="mobileNav"` on `.kp-menu-list` and `aria-expanded` / `aria-controls="mobileNav"` on `<summary>`, synced by `menuMachine` in `kpib.js`. |
| **DS-08** | **P2 — Medium** | `README.md:7–12`, `tokens.css:79`: Capitalize *"Unity is the Beginning of Brotherhood."* and *"Brothers"* in fraternity copy; `.kp-d2` tracking `-0.005em`. | Lockup alt text used lowercase motto; `.kp-d2` omitted `-0.005em` letter-spacing. | Updated lockup alt text, running copy capitalization, and `.kp-d2` letter-spacing to match `tokens.css`. |
