# UX & Accessibility Audit — `Techychris/kpib-lineage`

**Repository:** `https://github.com/Techychris/kpib-lineage`  
**Audit Date:** 2026-11-24  
**Scope:** Home landing page (`index.html`), Lineage Tree explorer (`tree.html`), Member Table (`table.html`), shared design system & responsive styles (`kpib.css`), theme/navigation controls (`kpib.js`, `icons.js`), and WCAG 2.1 AA compliance.

---

## Executive Summary

`kpib-lineage` delivers a fast, zero-framework, static web experience for exploring 618 Kappa Pi Beta members across 6 campuses (NIU, UIC, Mizzou, UIUC, Purdue, Northwestern) and 6 founding branches. It already gets several UX fundamentals right: semantic HTML landmarks, skip links, light/dark theme persistence without FOUC, `prefers-reduced-motion` guards, keyboard-accessible SVG cards, and clean print-grade typography.

However, the audit uncovered **3 high-severity (P1) UX defects**—including **invisible white-on-white badge text on card hover in Dark Mode**, **selected members silently disappearing when toggling off "Show downstream"**, and **a broken split-hero background seam on 700–899px tablet screens**—alongside **multiple P2/P3 usability, accessibility, and mobile touch-target regressions**.

| Severity | Count | Summary |
| :--- | :---: | :--- |
| **P1 — High** | 5 | Dark mode invisible `+N` hover badge (1.0:1 contrast); selected deep member vanishes when unchecking "Show downstream"; tablet 700–899px hero background seam; co-class-dad kids count mismatch (0 vs 8); broken `#branch` dropdown on viewport resize across 701px |
| **P2 — Medium** | 8 | Mobile touch-target regression (32px/36px < 44px); wrong caption in Big Brother Generations view; `#depthNote` hidden on mobile when `+N` pills are visible; desktop focus auto-scroll jump on Hero Search; no URL/history sync on `tree.html`; live search missing on `tree.html`; confusing placement of Kids inside Big Brother cell on `<1000px` table; modal dialog backdrop click doesn't close |
| **P3 — Low** | 5 | Hardcoded `559` member count flashes before JS updates to `618`; `#filterCount` badge misses table-header sorts; combobox keyboard `scrollIntoView` & Escape-then-ArrowDown behavior; phone header hidden in tree diagram reduces Home/Theme discoverability; `data-state="empty"` never updated on table status |

---

## P1 — High Severity Findings

### UX-01: Dark Mode `+N` Depth Badge Fails Contrast at Rest (2.99:1) and Becomes Completely Invisible on Hover (1.00:1)
- **Location:** `kpib.css:22`, `kpib.css:189–191`
- **Issue:**
  - In dark mode, `--accent` is `#E57373` and `--ink` is `#FFFFFF`.
  - `.node .more-pill` uses `fill: var(--accent)` with `.node .more { fill: #fff }`, yielding a **2.99:1** contrast ratio (below WCAG 2.1 AA's 3.0:1 threshold even for large bold text).
  - On hover, `.node:hover .more-pill` changes fill to `var(--ink)` (`#FFFFFF`) while `.node .more` remains `#fff` (`#FFFFFF`), producing **1.00:1 contrast (white text on white background)**—the `+N` count vanishes completely.
- **Recommendation:** Set `.node .more { fill: var(--on-accent); }` and on hover use `.node:hover .more-pill { fill: var(--ink); }` paired with `.node:hover .more { fill: var(--surface); }`. In dark mode, either darken `.more-pill` to `var(--brand-red)` (`#B22222`, **6.68:1** with `#FFF`) or switch dark-mode `.more` text to `#0B0B0B` (**7.01:1** on `#E57373`).

### UX-02: Selected Deep Member Vanishes When Unchecking "Show downstream"
- **Location:** `tree.html:214–227`, `tree.html:422–432`, `tree.html:457`
- **Issue:** The Big Brother tree reaches depth **18** (Class Dad reaches depth **12**), while `defaultDepth()` defaults to `3–7` (typically `5`). When a user selects a member at depth > `depthLimit` (e.g., depth 9) and unchecks **"Show downstream"** (`full = true`) to see their full branch back to the founder, `draw()` re-roots at the founder (`depth = 0`) and truncates at `depthLimit` (`5`). The selected member is pruned from the rendered SVG, `nodesById.get(selected)` returns `undefined`, and `frame(selected)` silently exits—leaving the user staring at the founder with their selected member nowhere on screen.
- **Recommendation:** Either:
  1. Keep every node along `ancestry` (`founderPath(selected)`) exempt from `depthLimit` pruning so the selected member and their highlighted path to the founder are always visible, **or**
  2. Automatically expand `depthLimit` to at least `path.length` when `full === true` and `selected !== null`.

### UX-03: Hero Animated Background Cuts Off Vertically at 45.45% Width on Tablet Viewports (700–899px)
- **Location:** `kpib.css:276–277` vs. `kpib.css:526`
- **Issue:** `.kp-hero` remains a single-column stacked layout until `@media (min-width: 900px)`, where it switches to `grid-template-columns: 5fr 6fr`. However, line 526 constrains `.kp-herobg` to `width: calc(100% * 5 / 11)` starting at `@media (min-width: 700px)`. Between `700px` and `899px` (e.g., iPad portrait at 768px/820px), the animated circuit background stops abruptly at 45.45% across the full-width hero text block, creating a stark vertical seam behind the headline and search bar.
- **Recommendation:** Change line 526's media query from `@media (min-width: 700px)` to `@media (min-width: 900px)` so it aligns with `.kp-hero`'s `5fr 6fr` split.

### UX-04: Co-Class-Dad Shows Contradictory Kid Counts Across Views (0 vs. 8)
- **Location:** `tree.html:88`, `tree.html:220–226`, `tree.html:368`, `tree.html:414`
- **Issue:** NIU's Spring 2019 *ALPHA GAMMA GUARDS CLASS* (8 members, IDs 147–154) has two co-class dads: Rayne Yap (132) and Alexis Soule (131). When viewing **Alexis Soule** in **Class dad** mode on `tree.html`:
  - The member header (`memberMeta`) shows **`0 kids`**.
  - The SVG tree diagram shows **no children**.
  - The **Connections** modal shows **`Kids: None recorded.`**
  - Switching to the **Generations** tab on the exact same page immediately shows **`8 descendants`** (because `renderGenerations()` uses `kidsByMember` while the rest of `tree.html` uses `children`, which only links the first class dad).
  - `table.html` also shows **`8 kids`**.
- **Recommendation:** In `dad` mode, use `kidsByMember[id]` consistently for `memberMeta`, `openConnections()`, and focused downstream tree rendering (`rootId === selected`), and display a co-dad note in the card/panel so tree structure and member counts match across all views.

### UX-05: Branch Dropdown Becomes Blank After Resizing or Rotating Across the 701px Breakpoint
- **Location:** `tree.html:148–162`, `tree.html:435`, `tree.html:476`
- **Issue:** `#branch` only adds `Choose a founder` (`-3`) if `phone.matches` at initial page load, or `Full organization` (`-1`) if `!phone.matches`. If a user resizes a desktop window below 701px or rotates a tablet between portrait/landscape and clicks the overview button (`#overview`), `show(phone.matches ? FOUNDERS : OVERVIEW)` sets `select.value` to a value that does not exist in `<select id="branch">`, leaving the dropdown blank/unselected.
- **Recommendation:** Rebuild or toggle the `FOUNDERS`/`OVERVIEW` `<option>` inside `syncView()` whenever `phone.matches` changes, and re-sync `select.value`.

---

## P2 — Medium Severity Findings

### UX-06: Mobile Touch-Target Size Regressions (32px / 36px < 44px Minimum)
- **Location:** `kpib.css:240`, `kpib.css:332`, `kpib.css:423–433`, `kpib.css:549`
- **Issue:** The design system defines `--hit-min: 44px` (`kpib.css:16`) for WCAG 2.1 AAA / Apple HIG touch compliance. However:
  1. Line 549 (`/* spacing pass 2 */ .kp-t td a { min-height: 32px }`) appears at the end of the stylesheet and **unconditionally overrides** both mobile's `44px` (`line 240`) and desktop's `28px` (`line 332`).
  2. Lines 423, 425, and 433 explicitly shrink `.school-filters button`, `.mobile-sort select`, and `.filter-toggle` to `36px` on phones (`<=700px`).
- **Recommendation:** Keep `min-height: 44px` on touch/coarse-pointer viewports (`@media (pointer: coarse)` or `<641px`), and scope the compact `32px` table link height to fine-pointer desktop viewports.

### UX-07: Generations View Caption Hardcodes Class Dad Copy in Big Brother Mode
- **Location:** `tree.html:375`
- **Issue:** Switching to the **Generations** view in **Big Brother** mode displays:
  > *"A class dad's class is his kids, and their classes are the next generation. Tap a member to see their kids."*
  This contradicts the active Big Brother lineage mode, where groups are labeled *Littles / Grand-littles / Great-grand-littles*.
- **Recommendation:** Branch the caption on `lineageMode`: show Big Brother / Littles copy when `lineageMode === 'big'` and Class dad / Kids copy when `lineageMode === 'dad'`.

### UX-08: `#depthNote` Hidden on Phones Even When `+N` Badges Appear
- **Location:** `kpib.css:538–539`, `tree.html:281–282`
- **Issue:** On phones with an open diagram (`.diagram-open`), `#depthNote` is hidden (`display: none`), yet truncated cards still show bold red `+N` badges. Mobile users receive no explanation of what `+N` represents or that a **Full depth** toggle exists inside the collapsed **View** drawer. Furthermore, line 539 uses `@media (min-width: 701px)` instead of the exact `desktopQuery` media query, creating a mismatch on short landscape touchscreens.
- **Recommendation:** Display a compact, dismissible depth banner or surface the depth notice inside `#viewControls` on phone viewports, and align line 539's media query with `desktopQuery`.

### UX-09: Focusing Home Hero Search Unexpectedly Scrolls Desktop Viewport
- **Location:** `index.html:163`
- **Issue:** `inp.addEventListener('focus', () => setTimeout(() => inp.scrollIntoView({block:'start', behavior:'smooth'}), 250))` was intended to keep the combobox visible above a mobile virtual keyboard, but it triggers unconditionally on desktop too—causing a jarring jump whenever a desktop user clicks or tabs into the hero search input.
- **Recommendation:** Guard the auto-scroll behind `matchMedia('(pointer: coarse)').matches` (or small viewport heights).

### UX-10: No URL / Browser History Sync During Tree Exploration
- **Location:** `tree.html:433–446`
- **Issue:** `tree.html` reads `?member=` and `?q=` on load, but clicking nodes, switching branches, or switching Big Brother / Class dad mode never calls `history.replaceState` / `history.pushState`. As a result:
  - Copying the browser URL does not share the currently viewed member.
  - Refreshing the page resets back to Overview/Founders (or the original `?member=`).
  - Pressing the browser Back button leaves the page instead of returning to the previous member.
- **Recommendation:** Sync `?member=<id>` (and optionally `&mode=dad`) via `history.pushState` / `popstate` when selecting members.

### UX-11: Inconsistent Search Experience Between Home and Tree Pages
- **Location:** `index.html:135–159` vs. `tree.html:477–497`
- **Issue:** The Home page offers live typeahead autocomplete with prefix-first ranking (`rank: 0` vs `1`), keyboard arrow navigation, and instant jump on selection. In contrast, `tree.html` requires clicking Search / pressing Enter, does not rank prefix matches first, caps results at 16 with no scroll/pagination, and clears matches on `input`.
- **Recommendation:** Extract the shared ranked typeahead combobox into a reusable module used by both `index.html` and `tree.html`.

### UX-12: Confusing Placement of Member's Kids Inside the "Big Brother" Column on `<1000px`
- **Location:** `table.html:211–221`, `kpib.css:248–251`
- **Issue:** Below `1000px`, the dedicated `Kids` column is hidden and `addKids(compact, id)` is injected inside the **Big Brother** `<td>`. Because there is no label clarifying that the expandable `"N kids"` disclosure belongs to the *row's member* rather than the *Big Brother* shown right above it, users misread it as the Big Brother's kids.
- **Recommendation:** Move `.relationship-notes` into the `Member` column (alongside `crossing-note` and `lineage-note`) or prefix it explicitly with `"Class kids: "`.

### UX-13: Connections `<dialog>` Cannot Be Dismissed by Backdrop Click
- **Location:** `tree.html:54–58`, `tree.html:378–421`
- **Issue:** `#connectionsPanel` uses the native `<dialog>` element (`showModal()`), which supports Escape and the Close button, but clicking outside the dialog on the dimmed backdrop (`::backdrop`) does nothing—violating common modal expectations on both desktop and mobile.
- **Recommendation:** Add a click listener on `connectionsPanel` that closes the modal when `event.target === connectionsPanel` (or outside `getBoundingClientRect()`).

---

## P3 — Low Severity & Polish Findings

### UX-14: Hardcoded Stale Member Count (`559` vs. `618`)
- **Location:** `tree.html:24`
- **Issue:** `<b id="statMembers">559</b> members` is hardcoded in HTML and overwritten by JS to `618`, causing a flash of inaccurate content on slow loads or when JS is disabled.
- **Recommendation:** Update the static fallback to `618` (or keep it synced via a data/build check).

### UX-15: Mobile Filter Badge Count Ignores Table-Header Sorting
- **Location:** `table.html:242–245`
- **Issue:** The `#filterCount` badge listener is attached only to `.filters`, so changing sort order by clicking a column header `<th>` button on mobile (which updates `#mobileSort`) does not increment/clear `#filterCount`.
- **Recommendation:** Update `#filterCount` inside `applySort()` or dispatch a `change` event on `mobileSort`.

### UX-16: Hero Combobox Minor Keyboard & Screen-Reader Gaps
- **Location:** `index.html:133–164`
- **Issue:**
  1. `ArrowDown`/`ArrowUp` updates `aria-selected`, but never calls `list.children[idx].scrollIntoView({ block: 'nearest' })`, so highlighted items can scroll out of view on short screens (`max-height: min(280px, 50vh)`).
  2. After pressing `Escape` to close the listbox, pressing `ArrowDown` does not reopen suggestions (`if (list.hidden) return;`).
  3. No `aria-live` polite announcement informs screen-reader users of `"No member matches"` or result counts.
- **Recommendation:** Add `scrollIntoView({ block: 'nearest' })`, reopen on `ArrowDown` when `inp.value.trim()` is non-empty, and add a visually hidden `aria-live="polite"` status node.

### UX-17: Phone Full-Screen Tree Hides Site Header & Theme Toggle
- **Location:** `kpib.css:219`
- **Issue:** `.diagram-open .kp-hdr { display: none }` maximizes canvas space on phones (great intent), but hides both the Theme toggle and Home navigation without placing a Theme toggle inside `#viewControls`.
- **Recommendation:** Include a Theme toggle control inside `#viewControls` on phone viewports alongside `.mobile-home`.

### UX-18: Static `data-state="empty"` Attribute Never Updated on Table Status
- **Location:** `table.html:27`, `table.html:235`
- **Issue:** `<p id="status" data-state="empty" data-state-for="roster">` stays `"empty"` even when all 618 members are rendered.
- **Recommendation:** Toggle `status.dataset.state = filtered.length ? 'ready' : 'empty'` inside `drawMembers()`.

---

## Verified WCAG 2.1 Color Contrast Matrix

| Theme & Token Pair | Contrast Ratio | WCAG AA Normal (4.5:1) | WCAG AA Large / UI (3.0:1) |
| :--- | :---: | :---: | :---: |
| Light: `--ink` (`#000`) on `--surface` (`#FFF`) | **21.00:1** | Pass | Pass |
| Light: `--ink-muted` (`#565656`) on `--surface` (`#FFF`) | **7.34:1** | Pass | Pass |
| Light: `--ink-muted` (`#565656`) on `--surface-raised` (`#F4F4F4`) | **6.67:1** | Pass | Pass |
| Light: `--on-accent` (`#FFF`) on `--brand-red` (`#B22222`) | **6.68:1** | Pass | Pass |
| Light: `--accent` (`#B22222`) on `--surface-raised` (`#F4F4F4`) | **6.07:1** | Pass | Pass |
| Light: `--border-strong` (`#7A7A7A`) on `--surface` (`#FFF`) | **4.29:1** | N/A (UI) | Pass |
| Dark: `--ink` (`#FFF`) on `--surface` (`#0B0B0B`) | **19.68:1** | Pass | Pass |
| Dark: `--ink-muted` (`#B8B8B8`) on `--surface-raised` (`#1A1A1A`) | **8.77:1** | Pass | Pass |
| Dark: `--accent` (`#E57373`) on `--surface-raised` (`#1A1A1A`) | **5.83:1** | Pass | Pass |
| Dark: `--on-band-muted` (`#D0D0D0`) on `--surface-band` (`#363636`) | **7.83:1** | Pass | Pass |
| **Dark: `.more` (`#FFF`) on `.more-pill` (`#E57373`)** | **2.99:1** | **FAIL** | **FAIL** |
| **Dark: `.more` (`#FFF`) on hovered `.more-pill` (`#FFF`)** | **1.00:1** | **FAIL** | **FAIL** |
