# noLIDA Marketing Site

Phase 2. The public, pre-launch site: eight pages, one layout, and a set of
section components that future pages should compose rather than reinvent.

---

## Layout structure

Every public page lives in the `(marketing)` route group and inherits
`src/app/(marketing)/layout.tsx`:

```tsx
<>
  <SiteHeader />
  <main>{children}</main>
  <SiteFooter />
</>
```

- **`SiteHeader`** (`src/components/layout/SiteHeader/`) — Client Component.
  Sticky, 64px tall, `var(--color-bg)` with a bottom hairline. The logo links
  home. Four nav links centre on desktop (≥1024px) with **Log in** and **Get
  started** on the right. Below 1024px a hamburger opens a right-hand drawer
  that traps focus, closes on Escape or scrim click, locks body scroll, and
  restores focus to the toggle on close.
- **`SiteFooter`** — Server Component. Four columns on desktop (brand +
  Product + Company + Legal), stacked on mobile, on `var(--color-bg-subtle)`.

Both use the marketing components below; neither reaches into `src/lib/server`.

---

## Pages

| Route | Purpose | Key blocks |
|---|---|---|
| `/` | Landing page. The single page that has to sell the product in 20 seconds. | Hero, FeatureGrid, StepsSection, navy business split, StatsRow, trust cards, CtaSection |
| `/about` | What noLIDA is and what we believe. | Hero, 5-paragraph prose, 3 belief cards, CtaSection |
| `/how-it-works` | Two journeys: for customers, and for businesses getting listed. | Hero, StepsSection ×2 (4 steps, 5 steps), navy recap, CtaSection to `/help` |
| `/for-business` | The pitch for business owners, plus fees and how to get listed. | Hero, 3 "why" cards, 5-step listing flow, two fee cards, navy contact block |
| `/pricing` | Transparent fee explanation with a worked example. | Hero, customer/business cards, ₦100,000 worked example, 5-question Accordion, CtaSection |
| `/terms` | Placeholder. **No legal text.** | Hero, last-updated date, warning notice, list of sections to come |
| `/privacy` | Placeholder. **No legal text.** | Hero, last-updated date, warning notice, list of sections to come |
| `/help` | Grouped FAQ and a direct line to support. | Hero, 3 Accordion groups (2 questions each), navy contact block with `id="contact"` |

`/design` is **dev-only** and deliberately lives outside the marketing group.
It is never linked from any page or from the header or footer.

### Placeholder policy

`/terms` and `/privacy` carry an explicit "Placeholder — not legal text"
notice. Do not write plausible-sounding legal copy to fill them. Real content
goes in only after a lawyer has reviewed it.

### Support contact

`/for-business` and `/help` read `NEXT_PUBLIC_SUPPORT_WHATSAPP` through
`buildWhatsAppHref()` in `src/lib/support/whatsapp.ts`, which accepts either a
full URL or a bare phone number. When the variable is unset the helper returns
`null` and the page renders a **disabled** button plus an explanation — never
a broken or empty link.

---

## Section components

All in `src/components/marketing/`, all Server Components unless noted, all
CSS-namespaced `.mk-*`, all values from tokens.

### `Section`
Full-width band. `variant`: `default` (transparent) | `subtle`
(`--color-bg-subtle`) | `navy` (`--color-navy`, inverse text).
`padding`: `sm` | `md` | `lg`. Wraps children in the shared `Container` —
pass `container="full"` to opt out.

### `Hero`
`eyebrow?`, `title`, `subtitle?`, `primaryCta?`, `secondaryCta?`. Full-bleed
`--color-gradient-hero` with a radial navy vignette, inverse text, an uppercase
pill eyebrow, and a `clamp(2rem, 6vw, 3.5rem)` extrabold title. CTAs use
`variant="inverse"` and `variant="outline-inverse"` so they stay legible on
the gradient.

### `SectionHeading`
Shared `title` + `subtitle`. `align`: `left` | `center` (default `center`).
`level`: `2` (default) | `3`.

### `FeatureGrid`
`title`, `subtitle?`, `features: { icon, title, description }[]`. Each feature
is a `Card` with a tinted icon. One column on mobile, two at ≥768px, three at
≥1024px.

### `StepsSection`
`title`, `subtitle?`, `steps: { number, title, description }[]`. Vertical on
mobile, auto-fit columns on desktop. Numerals use the brand gradient — one of
the four sanctioned gradient moments. Step order is announced to screen
readers via an `sr-only` "Step N:" prefix.

### `CtaSection`
`title`, `subtitle?`, `primaryCta?`, `secondaryCta?`. Navy band with two
low-opacity corner glows. Centred. This is the page's closing moment, so it
takes CTAs directly rather than being wrapped in a `Section`.

### `Accordion` (Client)
`items: { question, answer }[]`, optional `allowMultiple`. Real `<button>`
triggers with `aria-expanded` + `aria-controls` pointing at a labelled
`region`, so Enter and Space work without extra key handling. The chevron
rotates; the animation is disabled under `prefers-reduced-motion`.

### `StatsRow`
`stats: { value, label }[]`. Values use gradient-clipped text with a solid
`--color-primary` fallback behind `@supports (background-clip: text)`.
Rendered as a `<dl>`.

### `Button` additions (Phase 2)
`ui/Button` gained `as?: "button" | "link"` (with `href`), plus two variants for
use on gradient/navy surfaces only: `inverse` (white surface, indigo text) and
`outline-inverse` (transparent, translucent white border). The four original
variants are unchanged, so `/design` renders exactly as before.

---

## Page styles

- `src/app/(marketing)/page.css` — landing-only blocks (business split, trust
  cards). Imported by `page.tsx` only.
- `src/app/(marketing)/pages.css` — shared `.pg-*` primitives used by the seven
  supporting pages (prose, card grids, bullet lists, worked-example rows,
  notice callout, FAQ groups, contact block).

---

## Copywriting tone

- **Plain and direct.** Short sentences. Say what something does, then stop.
- **Nigeria-first.** Naira for prices, "noLIDA" never mis-spelled, no
  import-from-abroad phrasing.
- **Concrete over aspirational.** "Get paid on time" beats "unlock your
  potential". We have no users yet, so there are no invented testimonials,
  counts, or ratings.
- **No overclaiming.** No "guaranteed", no "instant", no "risk-free". Payments
  are described as processed through a licensed provider, and the 5% platform
  fee plus 10% commission are stated plainly with a worked example.
- **Honest placeholders.** `/terms` and `/privacy` say they are placeholders.
- **Accessible copy.** Descriptive link text, sentence case for buttons
  ("Get started", not "GET STARTED"), and real headings in order — one `h1`
  per page, supplied by `Hero`.

