# Phase 2 — Brand Assets and Marketing Site

**Status:** complete
**Preceded by:** Phase 0 (foundation), Phase 1 (design system + UI primitives)

---

## What Phase 2 did

1. Re-derived every colour token from the NOlida app icon
   (`public/branding/logo-source.jpg`) instead of the Phase 0 estimates, and
   added `--color-navy` / `--color-navy-subtle` as the icon's own background.
2. Built a brand-asset generator (`scripts/generate-brand-assets.ts`, run via
   `npm run generate:brand`) that produces every favicon, PWA icon, and Apple
   touch icon from the source JPG, and a `<Logo />` brand lockup component.
3. Extended `ui/Button` with `as="link"` plus `inverse` and
   `outline-inverse` variants for use on gradient/navy surfaces.
4. Built the public marketing site: a shared `SiteHeader`/`SiteFooter` shell,
   eight section components, and eight pages under `src/app/(marketing)/`.
5. Extended `/design` with three new sections (logo, gradients, navy surfaces)
   and wrote `docs/BRAND.md` and `docs/MARKETING.md`.

## Key decisions and deviations

| Decision | Why |
|---|---|
| `tokens-ui.css` tints retuned to navy-derived values | The Phase 1 zinc-based dark tints read as grey smudges against the new navy surfaces. The file stays an additive layer — it never shadows a `tokens.css` token. |
| `Button` extended rather than duplicated | The spec called for `<Button as="link">`. A second button component would have split the design system. `as`, `href`, `inverse`, and `outline-inverse` are purely additive; the four original variants are byte-identical, so `/design` still renders as before. |
| `Logo` uses `next/image`, not a raw `<img>` | Fixed `width`/`height` (no layout shift) and no `no-img-element` lint warning. Same visual DOM. |
| `Logo` root is a `<span>`, not a `<div>` | The component is used inside links and headings; phrasing content is valid in every one of those contexts, a `div` is not. |
| Asset script is `tsx`, `sharp` declared in `devDependencies` | Keeps the toolchain at one transpiler and makes the sharp dependency explicit rather than relying on Next's transitive copy. |
| Favicons are alpha-masked, PWA/Apple icons stay opaque | iOS composites transparency onto black and re-masks; maskable PWA icons are expected to bleed to the edge. |
| ICO encoded by hand (~40 lines) | `sharp` cannot write `.ico`, and this avoids adding a `to-ico` dependency. |
| `SectionHeading` added as a shared component | Seven section components all need the same title/subtitle block; duplicating it seven times guarantees drift. |
| `pages.css` (`.pg-*`) shared across seven pages | Keeps supporting pages consistent; landing-only blocks live in `page.css`. |
| Support link uses `buildWhatsAppHref()` | The env var may hold a full URL or a bare number. Unset → disabled button plus an explanation, never a broken anchor. |
| `metadataBase` added to the root layout | The build warned that relative OG/Twitter image paths resolved against `localhost:3000`. Now resolves against `NEXT_PUBLIC_APP_URL`, falling back to the local dev port. |
| Legal pages left as explicit placeholders | No invented legal text. Both carry a "not legal text" notice and a list of sections to come. |
| `sharp` install also regenerated `package-lock.json` | Verified afterwards: 456 entries, **0 missing versions**, and `@next/swc-linux-x64-gnu` / `@img/sharp-linux-x64` present **with** `resolved` URLs. This matters — the missing versions were what broke Vercel's `npm install` with `Invalid Version:` (commit `01c2fb3`). |

## Files

- Tokens: `styles/tokens.css` (rewritten), `styles/tokens-ui.css` (tints retuned)
- Brand: `scripts/generate-brand-assets.ts`, `src/components/brand/Logo/Logo.tsx|.css`, six generated files in `public/branding/`, `src/app/favicon.ico`
- Shell: `src/components/layout/SiteHeader/`, `src/components/layout/SiteFooter/`
- Sections: `src/components/marketing/{Section,SectionHeading,Hero,FeatureGrid,StepsSection,CtaSection,Accordion,StatsRow}/`
- Pages: `src/app/(marketing)/` — `layout.tsx`, `page.tsx`, `page.css`, `pages.css`, plus `about/`, `how-it-works/`, `for-business/`, `pricing/`, `terms/`, `privacy/`, `help/`
- Support helper: `src/lib/support/whatsapp.ts`
- Docs: `docs/BRAND.md`, `docs/MARKETING.md`, `docs/ENV.md` (WhatsApp row), `.clinerules`

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint .` | exit 0 |
| `npm run build` | exit 0 — 11 routes, no `metadataBase` warning |
| `npm run generate:brand` | 7 files written, exit 0 |
| `next start -p 3001` | all 9 public + design routes returned **200** |
| Brand assets over HTTP | all 7 returned 200 with correct content types (PNG/ICO) |
| Header / footer logo | 3 `logo__wordmark` renders on `/` (header, footer, + drawer) |
| Whitespace + encoding | UTF-8 em dashes and `©` correct, one `h1` per page |
| Accordion a11y | `aria-expanded` and `aria-controls` on every trigger, `role="region"` panels |
| WhatsApp fallback | disabled button + explanation on `/help` and `/for-business` |
| Hardcoded colours | **0** hex literals in any component or page CSS |

## Known limitations

- No manual light/dark toggle yet — `prefers-color-scheme` only. The toggle
  ships with the header/app-shell phase.
- `/signup` and `/login` are linked but do not exist yet (Phase 4), so they 404.
  This is expected and recorded in `.clinerules`.
- The marketing pages are English-only. Localisation and the second business
  flow (Phase 3+) are not started.
- `logo-source.jpg` is committed (79 kB) so `npm run generate:brand` is
  reproducible from a clean clone. Replace it and re-run the script to rebrand.
