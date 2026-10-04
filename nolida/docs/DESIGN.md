# NOlida — Phase 1 Design System & UI Primitives

This document specifies the design tokens, CSS architectural conventions, component primitives, and icon system for NOlida.

---

## 1. Design Token Architecture

The design token system is composed of two layers:
1. `styles/tokens.css` (**LOCKED**): Foundational brand colors, core light/dark theme surface neutrals, typography, spacing, border radii, shadows, and base transitions.
2. `styles/tokens-ui.css` (**Additive**): Motion tokens (`--duration-*`, `--ease-standard`), typography additions (`--leading-none`), contrast helpers (`--text-inverse`), and semantic tints (`--tint-*`) for status badges and notifications.

### Design Tokens
All values come directly from `styles/tokens.css` and `styles/tokens-ui.css`:
- **Primary Brand**: `--color-primary` (`#6366f1`)
- **Accent Cyan**: `--color-accent-cyan` (`#22d3ee`)
- **Accent Magenta**: `--color-accent-magenta` (`#d946ef`)
- **Brand Gradients**: `--color-gradient` and `--color-gradient-hero`
- **Semantic Status**: `--color-success` (`#16a34a`), `--color-warning` (`#f59e0b`), `--color-error` (`#dc2626`)
- **Surfaces**: `--color-bg`, `--color-bg-subtle`, `--color-border`
- **Text**: `--color-text`, `--color-text-muted`, `--text-inverse` (`#ffffff`)
- **Spacing**: `--space-1` (4px) through `--space-8` (64px)
- **Typography**: `--text-xs` (0.75rem) through `--text-5xl` (3rem)
- **Motion**: `--duration-fast` (120ms), `--duration-base` (200ms), `--duration-slow` (320ms), `--ease-standard`
- **Elevation**: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- **Radii**: `--radius-sm` (6px), `--radius-md` (10px), `--radius-lg` (16px), `--radius-full` (9999px)

---

## 2. Component Primitives

All primitives live under `src/components/ui/` with modular scoped CSS files following the `.ui-*` BEM-style namespace.

### UI Primitives Summary:
| Component | Directive | Variants / Sizes | Description |
|---|---|---|---|
| `Button` | `"use client"` | `primary`, `secondary`, `ghost`, `danger` / `sm`, `md`, `lg` | Accessible button with loading spinner, disabled state, fullWidth option |
| `Input` | `"use client"` | `text`, `email`, `password`, etc. | Controlled/uncontrolled input with label, hint, and error message |
| `Textarea` | `"use client"` | Multi-line text field | Form textarea with label, hint, and error message |
| `Card` | Server Component | `default`, `elevated` | Container card with semantic `as` prop (`div`, `article`, `section`) |
| `Badge` | Server Component | `default`, `brand`, `success`, `warning`, `error` | Pill badge with semantic tinted backgrounds |
| `Spinner` | Server Component | `sm`, `md`, `lg` | Animated CSS-only spinner with `role="status"` |
| `Link` | Server Component | `default`, `muted` | Accessible wrapper over `next/link` |
| `Container` | Server Component | `sm`, `md`, `lg`, `full` | Responsive content container with margin auto and tokenized paddings |
| `EmptyState`| Server Component | Title, description, icon, and action slot | Composite empty state presentation block |

---

## 3. Icon System

The icon system is Lucide-backed: one `Icon` primitive in `src/components/ui/Icon/`
renders a caller-supplied Lucide icon (`as`) at a single stroke weight (`1.75`)
and a single sizing convention (`size`, default 24):

```typescript
export interface IconProps {
  as: LucideIcon; // e.g. Search, ShoppingCart, CircleAlert
  size?: number; // default: 24
  strokeWidth?: number; // default: 1.75 — the design-system standard
  className?: string;
  ariaLabel?: string; // omit for decorative icons (aria-hidden="true")
}
```

The `/design` route showcases the 20 Lucide icons the system uses — `House`,
`Search`, `CirclePlus`, `MessageSquare`, `User`, `Bell`, `ShoppingCart`, `Heart`,
`Share2`, `MessageCircle`, `Bookmark`, `Settings`, `ChevronRight`, `ChevronDown`,
`Check`, `X`, `CircleAlert`, `Wallet`, `Store`, `LogOut` — all rendered through
`Icon`, so every icon in the app shares one stroke weight and one sizing rule.

---

## 4. Showcase & Verification

- **Internal Showcase Route**: `src/app/design/` (`/design`)
- **Interactive Demo**: Live click counters, 2-second simulated loading state, and reactive input/textarea typing.
- **Verification Rule**: `/design` is strictly dev-only and never exposed in main navigation.

| Component | Directive | Variants / Sizes | Description |
|---|---|---|---|
| `Button` | `"use client"` | `primary`, `secondary`, `ghost`, `danger` / `sm`, `md`, `lg` | Accessible button with loading spinner, disabled state, fullWidth option |
| `Input` | `"use client"` | `text`, `email`, `password`, etc. | Controlled/uncontrolled input with label, hint, and error message |
| `Textarea` | `"use client"` | Multi-line text field | Form textarea with label, hint, and error message |
| `Card` | Server Component | `default`, `elevated` | Container card with semantic `as` prop (`div`, `article`, `section`) |
| `Badge` | Server Component | `default`, `brand`, `success`, `warning`, `error` | Pill badge with semantic tinted backgrounds |
| `Spinner` | Server Component | `sm`, `md`, `lg` | Animated CSS-only spinner with `role="status"` |
| `Link` | Server Component | `default`, `muted` | Accessible wrapper over `next/link` |
| `Container` | Server Component | `sm`, `md`, `lg`, `full` | Responsive content container with margin auto and tokenized paddings |
| `EmptyState`| Server Component | Title, description, icon, and action slot | Composite empty state presentation block |

---

## 3. Icon System (duplicate — see above; kept for anchor stability)

Same as §3 above: the Lucide-backed `Icon` primitive (`src/components/ui/Icon/`)
is the only icon API. The `/design` route showcases the 20 Lucide icons the
system uses, all rendered through `Icon` at stroke-width 1.75.

---

## 4. Showcase & Verification

- **Internal Showcase Route**: `src/app/design/` (`/design`)
- **Interactive Demo**: Live click counters, 2-second simulated loading state, and reactive input/textarea typing.
- **Verification Rule**: `/design` is strictly dev-only and never exposed in main navigation.
