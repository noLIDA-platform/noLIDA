# NOlida Brand Guide

Phase 2. Every colour, gradient, and logo rule below is derived from the
NOlida app icon at `public/branding/logo-source.jpg`. Nothing in the product
may introduce a colour that is not in `styles/tokens.css`.

---

## Brand story

The NOlida icon is a deep navy rounded square holding a stylised "N" built
from rounded bars, lit by a gradient that runs from bright cyan in the
top-left, through indigo in the centre, to bright magenta in the bottom-right,
with a small violet figure tucked inside it. The icon is the product in one
image: Nigerian street commerce, warmth, and momentum, compressed into a shape
that stays legible at 16 pixels. Every screen we ship should feel like a
lighter room built from the same four colours.

---

## Colour tokens

### Brand

| Token | Value | Where it comes from | Where it is used |
|---|---|---|---|
| `--color-primary` | `#6366f1` | Indigo at the centre of the "N" gradient | Buttons, links, active nav, focus rings, icons. The single most-used brand colour. |
| `--color-accent-cyan` | `#22d3ee` | Bright cyan, top-left of the "N" | Gradient start, bullet markers on navy, decorative accents |
| `--color-accent-violet` | `#8b5cf6` | Violet midpoint of the gradient | Gradient stop, secondary brand moments |
| `--color-accent-magenta` | `#d946ef` | Bright magenta, bottom-right of the "N" | Gradient end, corner glows, decorative accents |

### Icon background navy

| Token | Value | Where it comes from | Where it is used |
|---|---|---|---|
| `--color-navy` | `#0a0e27` | The icon's square background | Dark-mode `--color-bg`, the business split section, the CTA band, the drawer scrim |
| `--color-navy-subtle` | `#0f1535` | The icon background, lightened | Dark-mode `--color-bg-subtle` (cards, footer) |

### Surfaces and text

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--color-text` | `#0a0e27` | `#fafafa` | Deep navy in light mode — reads softer than pure black and ties back to the icon |
| `--color-text-muted` | `#6b7280` | `#9ca3af` | Secondary copy, labels, footers |
| `--color-bg` | `#ffffff` | `#0a0e27` | Page background; dark mode reuses the icon navy |
| `--color-bg-subtle` | `#f9fafb` | `#0f1535` | Alternating bands, cards on subtle backgrounds |
| `--color-border` | `#e5e7eb` | `#1e2a52` | Hairlines, card borders, inputs. The dark value is navy-tinted, not grey. |

### Status

| Token | Value | Usage |
|---|---|---|
| `--color-success` | `#16a34a` | Success badges, confirmations |
| `--color-warning` | `#f59e0b` | Warning badges, the placeholder notice callout |
| `--color-error` | `#dc2626` | Danger buttons, errors, sign out |

### Extended tokens (`styles/tokens-ui.css`)

`--text-inverse` (`#ffffff`) is the text colour for anything on a gradient or
navy surface. `--tint-brand-bg`, `--tint-success-bg`, `--tint-warning-bg`, and
`tint-error-bg` are the 10%-opacity fills behind badges and icons (20% in dark
mode). Motion lives in `--duration-fast/base/slow` and `--ease-standard`.

---

## Logo usage

**Component:** `src/components/brand/Logo/Logo.tsx`. Wrap it in a `Link` when
it needs to navigate — the component renders no anchor of its own.

```tsx
<Logo size="md" />                                  {/* icon + wordmark */}
<Link href="/"><Logo size="md" /></Link>            {/* as a home link */}
<Logo size="lg" variant="mono-light" />            {/* on navy or gradient */}
<Logo size="sm" showWordmark={false} />            {/* icon only, tight spaces */}
```

| Size | Icon | Wordmark | Use for |
|---|---|---|---|
| `sm` | 24px | `--text-base` | Footer, mobile drawer, inline mentions |
| `md` | 32px | `--text-xl` | Site header (default) |
| `lg` | 48px | `--text-3xl` | Hero or split-section brand moments |

| Variant | Wordmark colour | Use on |
|---|---|---|
| `default` | `--color-text` | Light surfaces, header, footer |
| `mono-light` | `--text-inverse` | Navy sections, the CTA band, hero |
| `mono-dark` | `--color-navy` | On light brand-coloured backgrounds |

The wordmark is **NOlida** — capital N, capital O, lowercase "lida" — set in the
sans stack at `--weight-extrabold` with `-0.03em` tracking. The icon gets
`--radius-md` on its container so the corner softening matches the app tile.

**Never:** stretch the lockup, re-colour the icon, add a drop shadow to the
wordmark, or substitute a different typeface for the wordmark.

---

## Gradient rules

Two gradients exist:

- `--color-gradient` — the full brand flow
  (cyan → indigo → violet → magenta). Used on the step numerals in
  `StepsSection` and the `StatsRow` values.
- `--color-gradient-hero` — the darkened flow
  (`#0e7490` → `#3730a3` → `#6d28d9` → `#a21caf`). Used only as the
  full-bleed background of `Hero`.

**Allowed:** the logo mark, hero backgrounds, step numerals, stat values, and
low-opacity corner glows in the CTA band.

**Never:** buttons, inputs, cards, borders, table headers, or any daily UI
surfaces. Those use the solid `--color-primary`. A gradient button is a bug,
not a variation.

---

## Favicon and PWA icon specs

All of these are generated from the source JPG by
`npm run generate:brand` (`scripts/generate-brand-assets.ts`). Never hand-edit
them.

| File | Size | Corner treatment | Used by |
|---|---|---|---|
| `favicon-16.png` | 16×16 | Rounded, transparent | `<link rel="icon" sizes="16x16">` |
| `favicon-32.png` | 32×32 | Rounded, transparent | `<link rel="icon" sizes="32x32">` |
| `favicon.ico` | 16, 32, 48 | Rounded, transparent | `src/app/favicon.ico` → served at `/favicon.ico` |
| `logo-app-icon-192.png` | 192×192 | **Opaque square** | PWA manifest, alternative logo source |
| `logo-app-icon-512.png` | 512×512 | **Opaque square** | PWA manifest, `next/image` source, OG image |
| `apple-touch-icon.png` | 180×180 | **Opaque square** | iOS home screen |

Favicons get a 22%-radius alpha mask so the source's dark square corners
disappear against light and dark browser chrome. PWA and Apple icons stay
opaque because iOS composites transparency onto black and re-masks the image,
and maskable PWA icons are expected to bleed to the edge.

Regenerate with:

```bash
npm run generate:brand
```

The script exits with a clear message (and no stack trace) if
`public/branding/logo-source.jpg` is missing, and logs the size of every file
it writes.

---

## Rules that do not change

1. **The brand colour is fixed at `#6366F1`.** Users choose light or dark. They
   never choose an accent.
2. **Colour comes from tokens.** No hex value in a component, page, or inline
   style.
3. **Gradients are brand moments only** — logo, hero, step numerals, stat
   values, corner glows.
4. **Dark mode is navy**, not grey-black, because the icon's background is navy.
5. **`/design` is dev-only** and must never be linked from the application.


