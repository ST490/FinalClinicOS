# vis_dark.md — Premium Dark Mode Redesign Plan

> Goal: make dark mode look **truly premium** — deep, dimensional, calm, and
> unmistakably *this product* — without touching a single page component. The
> current system is token-driven, so the entire redesign happens in
> `web/src/index.css` `.dark { … }` plus one small charts fix.

---

## 1. Why the current dark mode looks stale (diagnosis)

Everything below is real, from the current code.

### The palette is flat neutral gray
`web/src/index.css:79–91`
```
--color-surface:         #1e1e1e   /* main panel  */
--color-surface-card:    #262626   /* raised card */
--color-surface-sidebar: #1a1a1a   /* sidebar     */
--color-border:          #333333
--color-border-light:    #2b2b2b
```
- Three surfaces separated by only **8 points of lightness** (#1a→#1e→#26).
  On a real monitor these read as one muddy plane — no depth, no hierarchy.
- Pure **achromatic gray** (R=G=B). Premium dark UIs (Linear, Vercel, Stripe,
  Arc) never use neutral gray for surfaces — they use a slightly **cool,
  blue-desaturated** near-black so the screen feels engineered, not "off."
- Borders (`#333`) are a hard, visible line. Premium dark mode separates
  surfaces with *elevation + a hairline of light*, not a gray stroke.

### Text contrast is timid
`web/src/index.css:85–87`
```
--color-text-primary:   #ffffff   /* pure white — harsh, glares on dark  */
--color-text-secondary: #9a9a9a   /* ~4.6:1 — borderline                 */
--color-text-muted:     #6e6e6e   /* ~3.0:1 — FAILS WCAG AA for body     */
```
- Pure `#fff` body text on near-black causes halation (visual buzz). Premium
  dark uses a very light gray (`#EDEEF2`-ish) for primary text.
- `#6e6e6e` muted text is below 4.5:1 — labels, captions, table meta, chart
  axes (which read `--color-text-muted`) are hard to read.

### The accent is a generic stock blue
`web/src/index.css:72–76` → `#6fb3e0` (a desaturated sky blue).
- It's pleasant but anonymous — the same blue every Bootstrap-era admin uses.
- No glow, no saturation shift for dark. On dark backgrounds an accent needs
  to be *slightly more saturated and luminous* than its light-mode twin to
  feel alive; here it's the same flat blue.

### Elevation is faked with black shadows that do nothing on dark
`web/src/index.css:100–102`
```
--shadow-card: 0 1px 3px rgba(0,0,0,0.4) …
```
- Black shadows on a `#1e1e1e` surface are nearly invisible. On dark UIs,
  elevation must come from **lighter surface tint + a top inner highlight**,
  not drop shadow.

### Data-viz doesn't adapt
`web/src/components/charts/Charts.tsx:19–20`
```
const PRIMARY = '#6fb3e0';
const PALETTE = ['#6fb3e0','#8b93d9','#f59e0b',…];
```
- Series colors are hardcoded (axes/grid/tooltip correctly use tokens, series
  don't). The dark accent leaks into light mode and the palette is never
  luminance-tuned for dark surfaces.

### What is already good (do NOT touch)
- **Class-based `.dark` on `<html>`** via `ThemeContext.tsx` — 4 modes
  (light/dark/system/night), correct, robust. Keep as-is.
- **Semantic tokens consumed everywhere** — `bg-surface`, `bg-surface-card`,
  `text-text-*`, `border-border`, `bg-primary-*`. Verified in `StatCard.tsx`,
  `Sidebar.tsx`, `TopBar.tsx`, `Charts.tsx`. This means **fixing the tokens
  fixes the whole app.** No page edits required.
- Focus-visible ring, scrollbar theming, table-header contrast overrides
  already exist in `.dark` (`index.css:104–122`).

---

## 2. Design direction — "Operating Theatre at Night"

The subject is a **clinic operating system**. The premium reference isn't a
crypto dashboard — it's the calm, focused, low-glare environment of a clinic
after hours: instrument panels, monitor glow, deep teal-blacks. The signature
is **cool depth + a single confident cyan-teal accent that glows**, echoing the
existing brand teal (`primary` in light mode is teal `#14b8a6`).

This keeps brand continuity (teal → light, cyan-teal → dark) instead of the
current jarring switch to a random sky blue.

### Palette (the core change) — cool blue-black, layered

Named tokens, 4–6 values, each a deliberate step of elevation:

| Token | New value | Role | Was |
|-------|-----------|------|-----|
| `--color-surface`         | `#0E1116` | app background (deepest) | `#1e1e1e` |
| `--color-surface-sidebar` | `#0B0E12` | sidebar (below app)      | `#1a1a1a` |
| `--color-surface-card`    | `#161B22` | raised card              | `#262626` |
| `--color-surface-elevated`| `#1C232D` | popovers/modals (new)    | — |
| `--color-border`          | `#232A34` | hairline (cool, subtle)  | `#333333` |
| `--color-border-light`    | `#1A2027` | inner dividers           | `#2b2b2b` |

- All surfaces carry a faint **blue-cool cast** (B > R) — the "engineered"
  feel. Range now spans #0B→#1C = **17 points** of real, readable elevation
  (was 8, all neutral).
- Sidebar is *darker* than app, app is darker than cards → correct depth
  order (recessed nav, floating content).

### Text — soft, high-contrast, no glare

| Token | New value | Contrast on card | Was |
|-------|-----------|------------------|-----|
| `--color-text-primary`   | `#E8EBF0` | ~13:1 | `#ffffff` (harsh) |
| `--color-text-secondary` | `#A6AEBB` | ~7:1  | `#9a9a9a` |
| `--color-text-muted`     | `#7B8494` | ~4.6:1 (passes AA) | `#6e6e6e` (fails) |

Soft off-white kills halation; muted now clears WCAG AA.

### Accent — brand teal, tuned to glow on dark

Shift from anonymous `#6fb3e0` sky-blue to a **luminous cyan-teal** that ties
to the light-mode teal brand:

```
--color-primary-400: #2DD4BF  /* bright accent / active nav text  */
--color-primary-500: #22D3C7  /* the glow — brighter than light   */
--color-primary-600: #14B8A6  /* primary buttons (brand teal)     */
--color-primary-700: #0F9E8F  /* button hover                     */
/* tinted active-state backgrounds, cool + dark: */
--color-primary-50:  #0C2A2A
--color-primary-100: #103734
--color-primary-200: #14524B
--color-primary-300: #1C7A6E
```

### Signature element — the accent *glows*

The one memorable, on-brief detail: **active nav item + primary buttons get a
soft teal glow** (a colored, blurred box-shadow), like a lit instrument on a
dark panel. Everything else stays quiet. This is the single risk/flourish —
Chanel's "remove one accessory" rule applies to *everything but this*.

```
--glow-primary: 0 0 0 1px rgba(34,211,199,0.25), 0 2px 12px -2px rgba(34,211,199,0.35);
```
Applied only to `.sidebar-link.active` and primary buttons via the existing
class hooks — no component edits.

### Elevation — light, not shadow

Replace invisible black shadows with **surface-tint + top highlight**:
```
--shadow-card:       0 1px 0 0 rgba(255,255,255,0.04) inset, 0 2px 8px -2px rgba(0,0,0,0.5);
--shadow-card-hover: 0 1px 0 0 rgba(255,255,255,0.06) inset, 0 8px 24px -6px rgba(0,0,0,0.6);
--shadow-sidebar:    1px 0 0 0 rgba(255,255,255,0.03);
```
The `inset` top hairline of white is what makes cards read as *lifted glass*
on premium dark UIs.

### Status colors — keep, minor luminance bump
Current dark status colors (`#4ade80`, `#fbbf24`, `#f87171`) are fine; only
retune `--color-info` to the new teal so it stops clashing.

### Corroboration from full codebase sweep (added after first draft)
The deep exploration confirms the diagnosis and adds three concrete,
file-pinned issues the token swap alone resolves or should include:

- **Root cause named**: dark mode *replaces the brand teal with blue/purple*
  (`index.css:68–77`). This is the single biggest driver of "stale/generic."
  Restoring a **teal→cyan-teal** accent (§2) fixes it and also kills two
  secondary bugs for free:
  - **`border-primary-200/50` leak** — TopBar clinic chips (`TopBar.tsx:102,
    116`) use the light teal-200 border at 50% over a dark surface. Today a
    teal edge sits on blue content. With teal restored, the edge matches.
  - **Manual `dark:` overrides in `SettingsPage.tsx:186,191`** exist only
    because the primary hue shifts. Restoring teal lets them drop (optional
    cleanup, not required for the visual win).
- **Broken-in-dark UI (out of token scope, flag for later)**:
  - `DemoSwitcher.tsx:42,43,46,50,71,78,79` — white/slate panel that never
    inverts. Dev-only (`SHOW_DEMO_SWITCHER`), but illegible on dark. Add to a
    "phase 2" list, not this plan.
  - Hardcoded `shadow-2xl`/`shadow-xl` on modals (TopBar:164, DemoSwitcher) —
    light-only shadows; add one `.dark { .shadow-2xl { box-shadow: … } }`
    override (~2 lines) so modal lift reads on dark.
  - Scattered hardcoded status colors (`slate/emerald/indigo/amber` with
    partial `dark:` coverage) and mixed `black/40` vs `slate-900/60` overlays
    — cosmetic inconsistency, phase 2.

---

## 3. Scope of edits (surgical)

**One primary file.** Everything routes through tokens.

1. **`web/src/index.css` — `.dark { … }` block (lines 64–123)**
   - Replace all surface / text / border / primary / shadow values per §2.
   - Add `--color-surface-elevated` and `--glow-primary` (new tokens).
   - Add `--color-surface-elevated` to the light `@theme` too (safe default
     `#ffffff`) so it's defined in both themes.
   - Add glow to `.dark .sidebar-link.active` (extend existing rule).

2. **`web/src/index.css` — primary button glow (optional, 3 lines)**
   - Add a `.dark` rule targeting the shared button pattern OR add a small
     `.btn-primary` utility. *Decision needed — see §5.*

3. **`web/src/components/charts/Charts.tsx:19–20` — make series theme-aware**
   - Change `PRIMARY`/`PALETTE` to read a CSS var (`--chart-1..8`) defined per
     theme in `index.css`, so light mode uses teal and dark uses the luminous
     palette. ~10 lines, no API change to the chart components.

4. **(2 lines, optional but recommended) Modal lift on dark** — add to `.dark`:
   `.shadow-2xl { box-shadow: 0 24px 60px -12px rgba(0,0,0,0.7); }` so the
   `bg-surface-card` modals (TopBar leave modal, etc.) read as lifted.
   Without it, `shadow-2xl` is a near-invisible light shadow on dark.

**No page/component files change** for the core win. Verified token
consumption in StatCard, Sidebar, TopBar, DataTable, modals — all inherit
automatically. (DemoSwitcher + scattered hardcoded status colors are phase-2,
out of scope — see §2 "Corroboration".)

---

## 4. Verify checklist (goal-driven)

After edits, confirm in the browser with `.dark` active:
- [ ] Sidebar (`#0B0E12`) reads visibly *below* app (`#0E1116`) which reads
      below cards (`#161B22`) — three distinct planes.
- [ ] Body text no longer glares; muted labels/table meta are readable.
- [ ] Active nav item glows teal; hover states are visible (not flat).
- [ ] StatCards show inset top-highlight; hover lifts them.
- [ ] Charts: axes/grid legible (muted now AA), series use luminous teal
      palette; light mode charts use brand teal (not the old sky-blue).
- [ ] Modals/popovers use `surface-elevated` and sit above cards.
- [ ] `:focus-visible` ring still visible; contrast AA on primary + muted text.
- [ ] Toggle light ↔ dark ↔ system ↔ night — no flashes of wrong color,
      no hardcoded light-mode leftovers (spot-check DuesPage modal, TopBar).
- [ ] Reduced-motion: glow is static (box-shadow, not animated) — fine.

---

## 5. Open decisions (need your call before build)

1. **Accent identity in dark mode.**
   - (a) **Cyan-teal glow** (recommended, §2) — ties to light-mode brand teal,
     "operating theatre" direction.
   - (b) Keep the existing sky-blue `#6fb3e0` but layer the new surfaces/glow
     under it (less brand cohesion, smaller change).

2. **Primary-button glow mechanism.** Buttons currently repeat
   `bg-primary-600 hover:bg-primary-700 text-white` inline across pages
   (TopBar, DuesPage, AcceptInvite…). To add glow without editing every page:
   - (a) Add a `.dark [class*="bg-primary-600"]` shadow rule in CSS (works
     now, slightly hacky selector).
   - (b) Introduce a `.btn-primary` class and migrate buttons over time
     (cleaner, but touches pages — violates "surgical").
   - (c) Glow on active nav only, leave buttons flat (smallest scope).

3. **Depth of change.** Ship the **token swap only** first (biggest visual
   win, zero risk), then charts + glow as a follow-up? Or all at once?

Tell me your picks on the three above and I'll implement — the token rewrite
itself is ~30 lines in one file and reversible.
