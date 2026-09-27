# noLIDA — Phase 1 Design System & UI Primitives

This document specifies the design tokens, CSS architectural conventions, component primitives, and icon system for noLIDA.

---

## 1. Design Token Architecture

The design token system is composed of two layers:
1. `styles/tokens.css` (**LOCKED**): Foundational brand colors, core dark-theme surface neutrals, border radii, breakpoints, and container max-widths.
2. `styles/tokens-ui.css` (**Additive**): Spacing scale, typography scale, spec aliases, motion tokens, semantic tints, and `@media (prefers-color-scheme: light)` theme overrides.

### Token Aliases (Single-Sourced)
- `--color-primary` → `var(--brand-primary)` (`#6366f1`)
- `--color-bg` → `var(--bg-primary)` (`#0f172a`)
- `--color-bg-subtle` → `var(--bg-secondary)` (`#1e293b`)
- `--color-border` → `var(--border-subtle)` (`#334155`)
- `--color-text` → `var(--text-primary)` (`#f8fafc`)
- `--color-text-muted` → `var(--text-muted)` (`#94a3b8`)
- `--text-inverse` → `#ffffff`

### Spacing Scale
- `--space-1`: `0.25rem` (4px)
- `--space-2`: `0.5rem` (8px)
- `--space-3`: `0.75rem` (12px)
- `--space-4`: `1rem` (16px)
- `--space-5`: `1.25rem` (20px)
- `--space-6`: `1.5rem` (24px)
- `--space-7`: `1.75rem` (28px)
- `--space-8`: `2rem` (32px)

### Typography Scale
- `--text-xs`: `0.75rem` (12px)
- `--text-sm`: `0.875rem` (14px)
- `--text-base`: `1rem` (16px)
- `--text-lg`: `1.125rem` (18px)
- `--text-xl`: `1.25rem` (20px)
- `--text-2xl`: `1.5rem` (24px)
- `--text-3xl`: `1.875rem` (30px)
- `--text-4xl`: `2.25rem` (36px)
- `--text-5xl`: `3rem` (48px)

### Elevation & Shadows
- `--shadow-sm`: subtle card elevation
- `--shadow-md`: dropdown and elevated card elevation
- `--shadow-lg`: modals and floating overlays

### Motion
- `--duration-fast`: `120ms`
- `--duration-base`: `200ms`
- `--duration-slow`: `320ms`
- `--ease-standard`: `cubic-bezier(0.2, 0, 1, 1)`

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

20 inline SVG stroke icons located in `src/components/ui/Icons/`:
- `HomeIcon`, `SearchIcon`, `PlusCircleIcon`, `MessageIcon`, `UserIcon`
- `BellIcon`, `CartIcon`, `HeartIcon`, `ShareIcon`, `CommentIcon`
- `BookmarkIcon`, `SettingsIcon`, `ChevronRightIcon`, `ChevronDownIcon`, `CheckIcon`
- `XIcon`, `AlertIcon`, `WalletIcon`, `StoreIcon`, `LogoutIcon`

Each icon conforms to the `IconProps` contract:
```typescript
export interface IconProps {
  size?: number; // default: 24
  className?: string;
  "aria-hidden"?: boolean; // default: true
}
```
All icons inherit `stroke="currentColor"` and utilize stroke-width 2 with rounded caps and joins.

---

## 4. Showcase & Verification

- **Internal Showcase Route**: `src/app/design/` (`/design`)
- **Interactive Demo**: Live click counters, 2-second simulated loading state, and reactive input/textarea typing.
- **Verification Rule**: `/design` is strictly dev-only and never exposed in main navigation.
