# Responsive & Device Screen-Size Audit — `Techychris/kpib-lineage`

**Repository:** `https://github.com/Techychris/kpib-lineage`  
**Audit Date:** 2026-11-24  
**Scope:** Complete Apple iPhone matrix (Portrait & Landscape, Safari chrome + safe areas), common Tablets (iPad mini / Air / Pro, Portrait, Landscape, Split View), and Desktop/Laptop viewports (MacBook Air/Pro, 1080p, QHD/Ultrawide, half-screen snap).

---

## Breakpoint Map (Current Implementation)

| Breakpoint / Query | File & Line | Behavior |
| :--- | :--- | :--- |
| `<= 700px` | `kpib.css:418, 430` | Table collapses filters behind `#filterToggle`, shrinks school chips/sort/toggle to `36px`, sets `#mobileSort` to `14px` |
| `min-width: 600px` | `kpib.css:258` | Home founder & reading-guide grids become 2 columns |
| `min-width: 641px` | `kpib.css:328` | Table cell padding widens; font becomes `16px`; link `min-height: 28px` (overridden by `:549`) |
| `min-width: 700px` | `kpib.css:261, 526` | Larger display type (`kp-d1: 64px`), taller header (`72px`), **BUG:** `.kp-herobg` shrinks to `5/11` width (`45.45%`) |
| `min-width: 701px` | `kpib.css:320, 364, 398, 537, 539` | Table filters permanently expanded; theme button shows text; `#depthNote` forced visible in `.diagram-open` |
| `min-width: 900px` | `kpib.css:276, 565` | Home hero becomes 2-column `5fr 6fr` grid; grids become 3 columns |
| `min-width: 980px` | `kpib.css:282` | Desktop inline nav replaces hamburger `.kp-menu` |
| `min-width: 1000px` | `kpib.css:367` | Member table switches from 4 columns to all 8 columns; hides `#mobileSort` |
| `max-height: 520px` & `min-width: 560px` | `kpib.css:401` | Short-landscape 2-column `#viewControls` popover |
| `max-height: 470px` | `kpib.css:334` | `.page-table` unlocks body scrolling (`min-height: 176px; max-height: 60dvh`) |
| `desktopQuery` (`tree.html:96`, `kpib.css:291`) | `(min-width:701px) and (min-height:521px) and (pointer:fine), (min-width:701px) and (min-height:821px)` | Switches Tree page between **Phone/Compact** and **Desktop** layouts |

---

## 1. Apple Mobile Devices (iPhone Portrait & Landscape)

> **Note on Safari Viewport Heights:** `100dvh` in iOS Safari reflects visible height minus status bar / Dynamic Island + Safari toolbar (~114–193px in portrait, ~50px in landscape).

### 1.1 iPhone Portrait Matrix

| Device | CSS Viewport (`W×H`) | Est. Safari `100dvh` | Tree Mode | Table Layout | Key Findings |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **iPhone SE (2nd/3rd gen) / 8** | `375 × 667` | `~553px` | Phone | 4 cols, drawer | **Tightest width:** Header has only ~3px spare (`192 + 44 + 88 + 48 = 372px`); hero search input squeezed to ~199px; 4-col table cells only `74–81px` wide (severe mid-word wrapping); `14px` `#mobileSort` triggers iOS Safari auto-zoom; `32px/36px` touch targets |
| **iPhone 12 mini / 13 mini** | `375 × 812` | `~635px` | Phone | 4 cols, drawer | Same `375px` crowding + missing `env(safe-area-inset-bottom)` on `#connections` (`12px`) and `#connectionsPanel` (`8px`) above Home Indicator |
| **iPhone 12 / 13 / 14 / 16e** | `390 × 844` | `~664px` | Phone | 4 cols, drawer | Header comfortable (`~18px` slack); 4-col table cells still narrow (`~78–85px`); iOS auto-zoom on `#mobileSort` (`14px`); `32px/36px` touch targets; missing bottom safe-area inset |
| **iPhone 14 Pro / 15 / 15 Pro / 16** | `393 × 852` | `~659px` | Phone | 4 cols, drawer | Same as `390px` class; Dynamic Island increases top chrome slightly (`~59px` top safe area) |
| **iPhone 16 Pro / 17** | `402 × 874` | `~681px` | Phone | 4 cols, drawer | Better hero search width (`~226px`), still affected by `14px` select zoom, `32px/36px` targets, cramped 4-col table, and missing bottom safe-area inset |
| **iPhone 12/13/14 Pro Max / 14 Plus** | `428 × 926` | `~746px` | Phone | 4 cols, drawer | Roomier hero & tree canvas (`defaultDepth()` ~4–5); still hits `14px` select auto-zoom, `32px/36px` targets, and missing bottom safe-area inset |
| **iPhone 14/15 Pro Max / 15/16 Plus** | `430 × 932` | `~739px` | Phone | 4 cols, drawer | Same as `428px` class |
| **iPhone 16 Pro Max / 17 Pro Max** | `440 × 956` | `~763px` | Phone | 4 cols, drawer | Best portrait phone experience; still affected by `14px` `#mobileSort` iOS auto-zoom, `32px/36px` targets, hidden `#depthNote`, and missing bottom safe-area inset |

### 1.2 iPhone Landscape Matrix

| Device | CSS Viewport (`W×H`) | Est. Safari `100dvh` | Tree Mode | Home Hero | Table Filters | Key Findings |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **iPhone SE (Landscape)** | `667 × 375` | `~325px` | Phone (2-col `#viewControls`) | 1-col (OK) | Collapsed drawer | Works well with `shortLandscape` (`<=520px`) and `max-height: 470px` table scroll, though `14px` `#mobileSort` auto-zooms |
| **iPhone 12/13 mini (Landscape)** | `812 × 375` | `~325px` | Phone (2-col `#viewControls`) | **1-col + BG SEAM BUG** | **Always Expanded!** | **Triple breakpoint collision:** (1) `.kp-herobg` clips at `45.45%` (`700–899px` bug); (2) `table.html` expands all school filter chips at `>=701px`, consuming >50% of the `325px` screen; (3) `#depthNote` forced visible at `>=701px` despite phone `.diagram-open`; (4) no `viewport-fit=cover` / left-right safe-area insets for notch |
| **iPhone 12/13/14/15/16 (Landscape)** | `844–852 × 390–393` | `~340px` | Phone (2-col `#viewControls`) | **1-col + BG SEAM BUG** | **Always Expanded!** | Same 4 landscape issues as mini; Dynamic Island on left/right side lacks safe-area padding |
| **iPhone 16 Pro (Landscape)** | `874 × 402` | `~352px` | Phone (2-col `#viewControls`) | **1-col + BG SEAM BUG** | **Always Expanded!** | Same 4 landscape issues |
| **iPhone 14/15/16 Pro Max (Landscape)** | `926–956 × 428–440` | `~375–390px` | Phone (2-col `#viewControls`) | 2-col (`64px` H1 + `96px` pad) | **Always Expanded!** | Avoids hero BG seam (`>=900px`), but `96px` top/bottom hero padding (`--space-9`) overflows the `390px` screen; table filters stay expanded; `#depthNote` breakpoint mismatch |

### 1.3 Critical Apple / iOS Safari-Specific Findings
1. **iOS Safari Auto-Zoom Bug on `#mobileSort` (`kpib.css:425`) [P1]:**
   - Every `<input>` and `<select>` uses `16px+` EXCEPT `.page-table .mobile-sort select`, which sets `font-size: 14px`. On iOS Safari, tapping a `<select>` below `16px` triggers automatic page zoom-in and leaves the user zoomed in afterward.
   - **Fix:** Change `font-size: 14px` to `font-size: 16px` on `.page-table .mobile-sort select`.
2. **Missing Safe-Area Insets (`env(safe-area-inset-*)`) on Face ID iPhones [P2]:**
   - Only `.diagram-key` (`kpib.css:203`) uses `env(safe-area-inset-bottom)`.
   - `#connections` (`bottom: 12px; right: 12px`), `#connectionsPanel` (`margin-bottom: 8px`), `#generations` bottom padding, `.kp-ftr`, and `.tools` (in landscape) do not account for `safe-area-inset-bottom`, `safe-area-inset-left`, or `safe-area-inset-right`.
   - **Fix:** Add `viewport-fit=cover` to `<meta name="viewport">` and apply `max(var(--space-3), env(safe-area-inset-*))` to edge-pinned controls, modals, and toolbars.
3. **375px Width Tightness (iPhone SE / 12 mini / 13 mini) [P2]:**
   - Header fits with only **~3px** spare (`192px` lockup + `44px` theme + `88px` menu + `48px` padding/gaps = `372px`). Reducing `.kp-plate img` to `30px` height (`140px` wide) under `<= 400px` adds `28px` of breathing room and prevents overflow when Dynamic Type / text zoom is active.
   - Table 4-column layout (`26% / 26% / 24% / 24%`) gives each cell only `74–81px` of text width, shredding names like `"Illinois Urbana-Champaign"` and `"Christopher Rattanasamay"` across 4–5 wrapped lines. Consider a **3-column or stacked card-row layout** below `600px` (e.g., Member + School/Crossing subtitle, Big Brother, Class Dad).
4. **iPhone Landscape Table Filters Uncollapsed (`min-width: 701px` vs `max-height: 470px`) [P2]:**
   - Modern iPhones in landscape are `812–956px` wide, which crosses `min-width: 701px` and permanently expands all table filters over half of a `325–390px` tall viewport.
   - **Fix:** Keep the collapsible `#filterToggle` drawer active on `@media (max-width: 700px), (max-height: 520px) and (pointer: coarse)`.

---

## 2. Common Tablets (iPad & Android/Surface)

| Device | CSS Viewport (`W×H`) | Est. Safari `100dvh` | Tree Mode | Home Hero | Header Nav | Table Layout | Key Findings |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **iPad mini (6th/7th) Portrait** | `744 × 1133` | `~1033px` | Desktop | **1-col + BG SEAM BUG** | Hamburger | 4 cols, open filters | **Hero BG cuts off at 45.45%**; empty header bar (hamburger until `980px`); 4-col table wastes width |
| **iPad (9th gen) Portrait** | `768 × 1024` | `~924px` | Desktop | **1-col + BG SEAM BUG** | Hamburger | 4 cols, open filters | Same as iPad mini Portrait |
| **iPad (10th/11th) / Air 11" Portrait** | `820 × 1180` | `~1080px` | Desktop | **1-col + BG SEAM BUG** | Hamburger | 4 cols, open filters | Same as iPad mini Portrait |
| **iPad Pro 11" (M4) Portrait** | `834 × 1210` | `~1110px` | Desktop | **1-col + BG SEAM BUG** | Hamburger | 4 cols, open filters | Same as iPad mini Portrait |
| **iPad Pro 12.9" / 13" Portrait** | `1024 × 1366` | `~1266px` | Desktop | 2-col | Inline Nav | 8 cols | Cleanest tablet portrait experience |
| **iPad mini Landscape** | `1133 × 744` | `~644px` | **Phone/Compact (BUG!)** | 2-col | Inline Nav | 8 cols | **`desktopQuery` forces Phone Tree mode on an 1133px screen** because `pointer: coarse` requires `min-height: 821px`! Rotating Portrait → Landscape *downgrades* the Tree UI and breaks `#branch` (`UX-05`) |
| **iPad 10th / Air 11" Landscape** | `1180 × 820` | `~720px` | **Phone/Compact (BUG!)** | 2-col | Inline Nav | 8 cols | **Same `desktopQuery` inversion** (`720px < 821px`): full 1180px iPad gets Phone Tree mode in landscape, Desktop Tree mode in portrait! |
| **iPad Pro 11" (M4) Landscape** | `1210 × 834` | `~734px` | **Phone/Compact (BUG!)** | 2-col | Inline Nav | 8 cols | **Same `desktopQuery` inversion** (`734px < 821px`) unless paired with Magic Keyboard (`pointer: fine`) |
| **iPad Pro 12.9" / 13" Landscape** | `1366 × 1024` | `~924px` | Desktop | 2-col | Inline Nav | 8 cols | Cleanest tablet landscape experience (`924px >= 821px`) |
| **iPad 50/50 Split View** | `~585 × 820` | `~720px` | Phone | 1-col | Hamburger | 4 cols, drawer | Inherits mobile `32px/36px` touch targets and `14px` select zoom |

### Tablet Summary Commentary
- **Biggest Tablet Defect (`desktopQuery` Height Threshold Too High for Landscape iPads) [P1]:** Requiring `min-height: 821px` for coarse-pointer devices (`tree.html:96`, `kpib.css:291`) was intended to keep landscape phones (`~325–400px` tall) in compact mode, **but it accidentally catches every 8.3"–11" iPad in landscape (`644–734px` Safari height)**. Lowering the coarse-pointer height threshold from `821px` to **`580px`** (e.g., `(min-width: 701px) and (min-height: 521px) and (pointer: fine), (min-width: 740px) and (min-height: 580px)`) keeps all iPhones in Phone mode (portrait and landscape) while giving **every iPad in both portrait and landscape** the full Desktop Tree experience!
- **Portrait Tablet Gaps (744–834px) [P1/P2]:** Fixing `.kp-herobg`'s `700px` → `900px` breakpoint immediately eliminates the split-background seam across all standard iPads in portrait. Lowering the inline nav breakpoint from `980px` to `~780px` (there are only 3–4 short links) avoids an unnecessary hamburger menu on iPad Air/Pro 11" portrait.

---

## 3. Common Desktop & Laptop Viewports

| Device / Window | CSS Viewport (`W×H`) | Tree Mode | Home Hero | Header Nav | Table Layout | Commentary |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Half-Screen Snap (1080p / 2)** | `960 × 1040` | Desktop | 2-col | **Hamburger** (`<980px`) | **4 cols** (`<1000px`) | Awkward mismatch: full Desktop Tree + 2-col Hero, yet collapsed Hamburger menu and mobile 4-col table |
| **Half-Screen Snap (1440px / 2)** | `720 × 900` | Desktop | **1-col + BG SEAM BUG** | Hamburger | 4 cols | Hits `.kp-herobg` 45.45% vertical seam bug (`700–899px`) |
| **MacBook Air 13" (default)** | `1280 × 800` (`~700px` inner) | Desktop | 2-col | Inline Nav | 8 cols | Very clean overall; `.tools` toolbar padding (`8px` via `:551`) misaligned vs `24px` header/caption inset; hero focus auto-scroll jumps page (`index.html:163`) |
| **MacBook Air/Pro (`1440×900`)** | `1440 × 900` (`~800px` inner) | Desktop | 2-col | Inline Nav | 8 cols | Sweet spot for the current design system; tree `defaultDepth()` = 5–6 |
| **MacBook Pro 14" (native)** | `1512 × 982` (`~882px` inner) | Desktop | 2-col | Inline Nav | 8 cols | Crisp typography and generous table column proportions |
| **MacBook Pro 16" (native)** | `1728 × 1117` (`~1017px` inner) | Desktop | 2-col | Inline Nav | 8 cols | Strong layout; `.kp-hero` starts stretching wide without a max-width container |
| **Desktop 1080p (Full HD)** | `1920 × 1080` (`~960px` inner) | Desktop | 2-col (full-bleed) | Inline Nav | 8 cols (full-bleed) | `.kp-hdr .in` has no `max-width` (brand & nav drift to opposite edges); `table.html` stretches 1920px wide; `tree.html` OVERVIEW hits `CR-01` (`NaN` depth renders all 618 nodes) |
| **Desktop QHD / Ultrawide** | `2560 × 1440` (`~1320px` inner) | Desktop | 2-col (over-stretched) | Inline Nav | 8 cols (over-stretched) | Missing `max-width` cap on `.kp-hero` inner content, `.kp-hdr .in`, and `table.html` creates excessive eye-travel distances across `2560px`; `defaultDepth()` hard-caps at `7` |
| **Docked DevTools / Short Window** | `1440 × 500` (`<=520px`) | **Phone/Compact** | 2-col | Inline Nav | 8 cols | Dropping height below `521px` flips `tree.html` into Phone Tree mode, hiding `.kp-hdr` and blanking `#branch` (`UX-05`) |

### Desktop Summary Commentary
- **Strengths:** Between `1280px` and `1600px`, typography, spacing, dark/light contrast (except the dark-mode `+N` hover badge), and the 8-column sticky-header table look crisp and cohesive.
- **Top 4 Desktop Improvements:**
  1. **Remove line `kpib.css:551` global `.tools { padding: var(--space-2) }` override** (or move it above line `295`) so desktop tree toolbars keep their `12px 24px` inset aligned with `.app-title` and `#caption`.
  2. **Constrain ultrawide readability (`>=1600px`):** Cap `.kp-hdr .in`, `.kp-hero` inner grid content, and `table.html` container (`max-width: 1440px` or `1600px`, centered) while keeping full-bleed band backgrounds.
  3. **Fix half-screen desktop snap (`960px`):** Lower inline nav breakpoint to `~840px` and 8-column table breakpoint to `~920px` (or hide only 1–2 lower-priority columns between `760–960px`) so side-by-side desktop windows don't degrade to phone layouts.
  4. **Guard `index.html:163` focus auto-scroll** with `matchMedia('(pointer: coarse)').matches` so clicking the hero search input on desktop never jumps the scroll position.
