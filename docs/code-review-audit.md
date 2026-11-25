# Code Review & Engineering Audit — `Techychris/kpib-lineage`

**Repository:** `https://github.com/Techychris/kpib-lineage`  
**Audit Date:** 2026-11-24  
**Scope:** All HTML, CSS, JavaScript, data files, assets, and architecture across the repository.

---

## Executive Summary

`kpib-lineage` is an admirably lean static site (~638 KB total, zero runtime build toolchain, zero backend, GitHub Pages-ready via `.nojekyll`). Data integrity across the current 618-member dataset is remarkably clean:
- `records.length === schoolIds.length === crossings.length === 618`
- **0 cycles**, **0 self-parents**, **0 out-of-bounds parent indices**, and **0 chronological anomalies** (no Big Brother or Class Dad crossed in the same or later semester than their little/kid) across both Big Brother (max depth 18) and Class Dad (max depth 12) graphs.
- **0 missing** or **unused** `classDadsBySchool` entries, and **0 unresolved** class dad names.
- All member strings—including line names with literal `<` and `>` characters (`<!TACTI.C>`, `METRO<{gNOMÉ}`, `Ch.Σ.RR;Y<+>{βΩ}MB!`)—are rendered safely via `.textContent` / D3 `.text()`, preventing XSS.

However, the code review identified **4 high-severity (P1) logic/data bugs**, **6 medium-severity (P2) architectural/performance/maintainability issues**, and **6 low-severity (P3) code hygiene and dead-code items**.

---

## P1 — High Severity Bugs

### CR-01: `depthLimit` Completely Broken in `OVERVIEW` and `UNRESOLVED` Tree Modes (`NaN` Depth Bug)
- **Location:** `tree.html:215–227`
- **Code:**
  ```js
  const depthOf = new Map([[rootId, 0]]);
  const hierarchy = d3.hierarchy(rootId, id => {
    if (id === OVERVIEW) return rootIds;
    if (id === UNRESOLVED) return floating;
    const depth = depthOf.get(id);
    if (depth >= depthLimit) { if (children[id].length) hidden.set(id, below(id)); return null; }
    for (const kid of children[id]) depthOf.set(kid, depth + 1);
    return children[id];
  });
  ```
- **Root Cause:** When `rootId === OVERVIEW` (`-1`) or `UNRESOLVED` (`-2`), the callback returns `rootIds` or `floating` **without populating `depthOf` for those child IDs**. On the next level, `depthOf.get(id)` returns `undefined`; `undefined >= depthLimit` evaluates to `false`; and `depth + 1` becomes `NaN`. Because `NaN >= depthLimit` is always `false`, **depth limiting is completely disabled** for the entire tree! All 618 nodes (~6,200+ SVG DOM elements) render simultaneously even when `Full depth` is unchecked.
- **Fix:**
  ```js
  if (id === OVERVIEW) { rootIds.forEach(r => depthOf.set(r, 1)); return rootIds; }
  if (id === UNRESOLVED) { floating.forEach(r => depthOf.set(r, 1)); return floating; }
  ```

### CR-02: Selected Member Silently Pruned When `full === true` and Member Depth Exceeds `depthLimit`
- **Location:** `tree.html:210–227`, `tree.html:422–432`, `tree.html:457`
- **Root Cause:** When viewing a deep member (e.g., depth 9 of 18) and unchecking "Show downstream" (`full = true`) while `fullDepth === false`, `draw()` roots at the founder and prunes at `depthLimit` (~5). The selected node is omitted from `nodesById`, causing `focusNode(selected)` to silently `return`.
- **Fix:** Preserve `ancestry` nodes past `depthLimit` (or compute `effectiveDepthLimit = full && selected !== null ? Math.max(depthLimit, path.length) : depthLimit`).

### CR-03: Co-Class-Dad Inconsistency Between `children[]` and `kidsByMember[]`
- **Location:** `relationships.js:10–19`, `tree.html:78–88`, `tree.html:368`, `tree.html:414`
- **Root Cause:** `relationships.js` builds both `classDadIdsByMember` (all dads) and `classDadByMember` (first dad only, since D3 `d3.hierarchy` is a single-parent tree). In `tree.html`, `renderGenerations()` uses `kidsOf(id)` (`kidsByMember[id]`), whereas `draw()`, `memberMeta` (`line 368`), and `openConnections()` (`line 414`) use `children[id]` (single-parent `classDadByMember`). Consequently, co-class-dad **Alexis Soule** (ID `131`, co-dad of NIU Spring 2019 ALPHA GAMMA GUARDS CLASS) shows `0 kids` in tree/metadata/connections and `8 kids` in Generations and `table.html`.
- **Minor Comment Inaccuracy:** `relationships.js:11` states `(eight classes have two dads)` — in fact, **one class with eight members** (IDs 147–154) has two dads.
- **Fix:** Use `kidsOf(id)` in `memberMeta` and `openConnections()`, and when `focused && lineageMode === 'dad'`, use `kidsByMember[selected]` for the direct children of `selected` (with a visited guard to avoid duplicate nodes in D3 hierarchy).

### CR-04: Silent Data Loss Hazard for Duplicate Member Names in `relationships.js`
- **Location:** `relationships.js:5–9`, `relationships.js:14`
- **Root Cause:** `memberIdsByName` joins `classDadsBySchool` to `records` by normalized display name (`record[3]`). If two members share a name, `memberIdsByName.set(name, null)` discards **both** IDs. There is already one duplicate name in the dataset: **`Richard Chang`** (ID `178`, UIC Fall 2008 *Protoman*; and ID `498`, Purdue Fall 2021 *Arcane*). If either Richard Chang (or any future same-name brother) is ever listed as a class dad, their entire class will silently fail to resolve (`classDadByMember[id] === null`) and fall into `floating` ("Binder-only branches") with zero console warning.
- **Fix:** Key `classDadsBySchool` by stable member IDs (or `[schoolId, normalizedName]` disambiguation + explicit validation error if a class dad fails to resolve).

---

## P2 — Medium Severity Engineering & Performance Issues

### CR-05: Fragile Positional-Index Relational Schema
- **Location:** `lineage-data.js:1–12`, `index.html:79–84`, `table.html:63`
- **Issue:**
  - Member entities are split across 3 parallel arrays (`records[id]`, `schoolIds[id]`, `crossings[id]`) linked solely by array index `0..617`.
  - `records[i][1]` (Big Brother pointer) and deep links (`tree.html?member=0`) depend on raw array indices. Inserting a member anywhere except the end corrupts every downstream reference and external bookmark.
  - `table.html:63` hardcodes `schoolLabels = ['NIU','UIC','Mizzou','UIUC','Purdue','Northwestern']` separately from `campuses` in `lineage-data.js`, and `index.html:79–84` hardcodes founder names and IDs `0..5`.
- **Recommendation:** Consolidate into a single normalized schema (or generate the compact runtime bundle from a validated JSON source-of-truth with immutable member IDs and campus `{ id, name, shortLabel }` objects).

### CR-06: Unhandled Promise Rejection & Permanent Cache Poisoning in Hero Search Lazy Loader
- **Location:** `index.html:131–132`, `index.html:151–152`
- **Code:**
  ```js
  function load(){
    if(loading) return loading;
    loading = new Promise(function(ok,no){
      var s=document.createElement('script');
      s.src='lineage-data.js?v=fa26c';
      s.onload=ok; s.onerror=no;
      document.head.appendChild(s);
    });
    return loading;
  }
  inp.addEventListener('focus', load);
  inp.addEventListener('input', function(){ load().then(render); });
  ```
- **Issue:** If the network drops transiently on focus/input:
  1. `load()` rejects without a `.catch()` handler, throwing unhandled promise rejections on every keystroke.
  2. Because `loading` is never cleared on `onerror`, recovery is impossible without a full page reload.
  3. On `focus`, `load` is passed directly as an event listener (ignoring its returned rejected promise).
- **Fix:** Reset `loading = null` in `onerror`, remove the failed `<script>`, and attach `.catch(...)` to display a friendly fallback state.

### CR-07: Full 618-Row DOM Rebuild Per Keystroke in `table.html`
- **Location:** `table.html:183–237`
- **Issue:** `query.addEventListener('input', drawMembers)` synchronously reconstructs up to **618 `<tr>` elements**—each containing **two separate `<details>`/`<ul>` kid lists** (one inside Big Brother cell for mobile, one inside Kids cell for desktop)—totalling ~12,000+ DOM nodes recreated on every keystroke, plus calling `normalizeMemberQuery` redundantly inside `matchesMember` for every member on every input event.
- **Fix:**
  1. Precompute normalized search strings once at startup (`searchHaystack[id]`).
  2. Debounce `input` (~80–120ms) or toggle row `hidden` / cache `<tr>` nodes instead of recreating all 618 rows on every keystroke.
  3. Lazy-populate `<details>` kids `<ul>` on the `toggle` event rather than eagerly creating hundreds of nested `<li><a>` nodes that most users never open.

### CR-08: Unmodularized Inline Page Scripts & Global Namespace Pollution
- **Location:** `index.html:104–165`, `table.html:54–246`, `tree.html:66–508`
- **Issue:** ~700 lines of application logic sit directly inside inline `<script>` tags across three HTML files, sharing 15+ implicit top-level globals (`records`, `campuses`, `schoolIds`, `crossings`, `classDadsBySchool`, `classDadAliases`, `kidsByMember`, `dadsByMember`, `classDadIdsByMember`, `classDadByMember`, `normalizeMemberQuery`, `matchesMember`, `kpibIcon`, `d3`). This prevents clean ES module imports, unit testing, static linting, and code reuse (e.g., duplicating search/ranking logic between `index.html` and `tree.html`).
- **Recommendation:** Move page scripts into external ES modules (`src/home.js`, `src/table.js`, `src/tree.js`, `src/search.js`, `src/data.js`).

### CR-09: Append-Only CSS Patch Layering & Specificity Collisions
- **Location:** `kpib.css:536–584`
- **Issue:** `kpib.css` (45.2 KB, 584 lines) has accumulated chronological override patches at the bottom of the file, creating unintended regressions:
  - `.kp-t td a` is defined at lines `240` (`44px`), `332` (`28px` desktop), and `549` (`32px` global—clobbering both earlier rules!).
  - `.tools` padding is set at `153` (`4px 8px`), `295` (`12px 24px` desktop), and `551` (`8px` global—clobbering desktop padding!).
  - `.kp-herosearch` is spread across 6 separate blocks (`442`, `447`, `488`, `559`, `565`, `578`).
  - `.kp-hero` toggles `overflow: hidden` (`484`, `493`) and then `overflow: visible !important` (`582`).
  - `#homeSuggest` sets `max-height: 60vh` at line `570` and immediately overrides it to `min(280px, 50vh)` at line `579`.
- **Recommendation:** Consolidate duplicate selectors into a single canonical definition per component, eliminate `!important` hacks, and remove dead rules.

### CR-10: Oversized Third-Party Bundle (`d3.min.js`) & Manual Cache-Busting Drift
- **Location:** `d3.min.js` (279.7 KB), `index.html:13,132,166,167`, `table.html:13,51–53,247–248`, `tree.html:13,61–65,509`
- **Issue:**
  - `d3.min.js` ships the entire D3 v7 umbrella (~280 KB, 44% of total repo weight) even though `tree.html` only uses 9 APIs (`select`, `zoom`, `zoomIdentity`, `zoomTransform`, `hierarchy`, `tree`, `min`, `max`, `linkVertical`, `linkHorizontal`). A custom tree-shaken Rollup/esbuild micro-bundle of just those modules is ~35 KB (~87% smaller).
  - Manual cache-busting query strings (`?v=59`, `?v=fa26c`, `?v=fa26b`, `?v=5`, `?v=1`) are repeated across 3 HTML files—git history (`7e266c2`) confirms this already caused stale CSS in production.

---

## P3 — Low Severity Code Hygiene & Dead Code

### CR-11: Dead Variable Computed on Every Tree Render (`nextOnPath`)
- **Location:** `tree.html:212`
- **Code:** `const nextOnPath = new Map(path.slice(0, -1).map((id, i) => [id, path[i + 1]]));`
- **Issue:** Allocated on every `draw()` call and never referenced anywhere. Remove it.

### CR-12: Unused Image Asset, Unused Icon, and Dead CSS Classes
- **Locations:**
  - `assets/motto-bg.jpg` (75,165 bytes) — orphaned after commit `9af04ac` removed the motto band.
  - `kpib.css:96–101, 118–119, 269–270, 272, 381, 439, 472, 532–534, 554` — dead `.kp-motto-band`, `.kp-stats`, `.kp-stat`, `.kp-statband`, `.kp-h1`, `.kp-h2`, `.kp-small`, `.kp-grid.g2` rules.
  - `icons.js:26` — `school` icon path is never used via `data-icon="school"` or `kpibIcon('school')`.

### CR-13: Temporal Dead Zone (TDZ) Ordering Fragility in `tree.html`
- **Location:** `tree.html:134` vs. `tree.html:163`
- **Issue:** `defaultDepth()` (line 130) references `NODE_WIDTH` and `orientation`, which are declared later with `const` at lines `163` and `169`. Works today only because `draw()` isn't called until line `500`, but calling `defaultDepth()` earlier would throw `ReferenceError`. Move constants and DOM references to the top of the script.

### CR-14: Numeric Sort Passed Through `Intl.Collator` in `table.html`
- **Location:** `table.html:99`, `table.html:109`
- **Issue:** `sortValues.kids` returns a `number`, which `compareMembers()` passes into `collator.compare(a, b)` (implicitly stringifying numbers and relying on `{ numeric: true }`). Direct numeric comparison (`a - b`) is clearer, faster, and type-safe. Also guard `semesterKey()` (`table.html:91–94`) against missing/unrecognized semester prefixes.

### CR-15: Unchecked `scrollIntoView` & ResizeObserver Missing `branch === UNRESOLVED` / Cleanup
- **Location:** `tree.html:504–507`, `index.html:120–122`
- **Issue:**
  - `ResizeObserver` refits on `branch === OVERVIEW`, but does not refit when `branch === UNRESOLVED` or when `fullDepth === true` and window size changes.
  - `index.html` registers scroll/resize listeners and runs continuous SVG animations off-screen; pausing `.kp-herobg` animations via `IntersectionObserver` when scrolled past the hero reduces GPU/battery usage.

### CR-16: Empty `README.md` & Missing Governance/Validation Tooling
- **Location:** `README.md` (14 bytes: `# kpib-lineage`)
- **Issue:** Zero documentation for contributors on updating the Master Binder data, adding a new campus or crossing class, running verification tests, or deploying. Also `tree.html:8` `<meta name="description">` still describes the page as class-dad-only.

---

## Security Review Summary

| Check | Status | Notes |
| :--- | :---: | :--- |
| **DOM XSS (`textContent` vs `innerHTML`)** | **Pass (Low Risk)** | All untrusted/data-driven strings (`records`, `crossings`, `campuses`, `dadsByMember`, query strings) use `.textContent` or D3 `.text()`. Only `kpibIcon()` uses `innerHTML`/`insertAdjacentHTML`, backed by a static SVG path map (`icons.js`). Recommend migrating `kpibIcon` to DOM element creation or sanitizing if extended. |
| **URL Parameter Injection** | **Pass** | `?member=` is validated with `/^\d+$/` and bounds-checked (`< records.length`). `?q=` is assigned to `input.value` only. |
| **Storage Resilience** | **Pass** | All `localStorage` and `sessionStorage` calls are wrapped in `try/catch`, handling private browsing / quota errors cleanly, and restored values (`activeSchool`, `column`, `direction`, `scroll`) are validated before use. |
| **External Resources / SRI** | **Advisory** | Google Fonts stylesheet is loaded from `fonts.googleapis.com`; `d3.min.js` is self-hosted locally (good!). `<meta name="robots" content="noindex, nofollow, nosnippet">` protects member privacy from search indexing. |
| **Client-Side PII Exposure** | **Note** | All 618 members' full legal names, line names, schools, and crossing dates are shipped publicly in `lineage-data.js` and `class-dads.js`. Since the repo is public on GitHub with `noindex`, confirm that public exposure of the roster is intentional. |
