# CareMe — Brand Asset Package

Rebrand of ClinicOS. Built from your two source files (wordmark + icon).

## Colors
- **Navy** `#0E1733` — rgb(14, 23, 51)
- **Teal** `#278289` — rgb(39, 130, 137)

## Typeface
Poppins Bold (700) — free on Google Fonts. Used for the "CareMe" wordmark,
"Care" in Navy, "Me" in Teal.

## Folder guide

**/icon** — App icon, rounded-square, on solid background. Use for app
stores, home screen, dashboards.
- `app-icon-1024.png` — primary, navy background (master file, resize down as needed)
- `app-icon-512/256/180/128.png` — pre-sized for iOS/Android/PWA manifests
- `app-icon-teal-1024.png` — teal background, secondary/dark-mode variant
- `app-icon-white-1024.png` — white background, light-UI variant

**/wordmark** — "CareMe" text only, transparent background.
- `wordmark-standard.png` — Navy "Care" + Teal "Me" (default)
- `wordmark-allwhite.png` — for dark backgrounds
- `wordmark-allnavy.png` — single-color print / faxes

**/lockup** — Icon + wordmark combined.
- `lockup-horizontal-*` — for nav bars, letterheads, email signatures
- `lockup-stacked-*` — for splash screens, social profile images, printed covers

**/mark** — The spark/cross symbol alone, no container, transparent background.
- `mark-transparent.png` — full color, for large use on white
- `mark-navy-outlined.png` / `mark-white-outlined.png` / `mark-teal-outlined.png`
  — single-color versions with the pinwheel detail preserved as a thin outline,
  for watermarks, favicons, or 1-color print

**/favicon** — Circular versions sized for browser tabs.
- `favicon.ico` — multi-resolution (16/32/48/64px), drop into site root
- `favicon-16/32/64.png`, `favicon-circle-512.png`

## Usage rules
- Minimum icon size: 16px (favicon). Below 40px, only the icon/mark — never
  the full wordmark or lockup.
- Clear space: leave padding around the mark at least equal to the width of
  one cross-arm.
- Don't recolor outside navy/teal/white. Don't stretch or rotate.
- On photos or busy/mid-tone backgrounds, always use the white mark or white
  lockup, never navy-on-navy or navy-on-photo.

## Open item
Confirm whether "CareMe" or "CareMe™" should appear in legal/footer contexts
once trademark search is done — not addressed by this asset pack.
