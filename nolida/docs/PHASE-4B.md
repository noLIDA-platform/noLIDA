# Phase 4B — Auth UI (frontend only)

Phase 4B repurposes the noLIDA front door so that `/` **is** the sign-in screen,
and builds the auth user interface that Phase 4 was originally supposed to
provide. It was **frontend only**: no session, no database writes, no password
hashing. That wiring landed afterwards as Phase 4 — read `docs/PHASE-4.md` for
what changed since this file was written, and `docs/AUTH-UI.md` for the flows as
they behave today.

## What changed

| Before | After |
| --- | --- |
| `/` rendered the marketing landing page | `/` renders the sign-in screen |
| `/login` did not exist | `/login` permanently redirects to `/` |
| `/signup`, `/verify`, `/forgot-password`, `/reset-password` did not exist | all four render |
| Visual panel on the **right** | Visual panel on the **left**, form on the **right** (`form-right`) |

The marketing landing page that used to live at `/` was deleted. Its sections
still exist as their own pages (`/how-it-works`, `/for-business`, `/pricing`,
`/about`), and the file remains recoverable from git history.

## Orientation

`AuthSplitShell` takes an `orientation` prop:

- `form-right` — gradient panel left, form right. **Default, and the only value
  used in this phase.** This is the swapped orientation.
- `form-left` — the mirror image.

Orientation is implemented with `grid-template-areas`, not DOM order. The form
is always last in the DOM, so reading order and Tab order stay correct no matter
which side it is painted on.

## Components

All new files are TypeScript (`.tsx`), per `.clinerules`. The original spec said
`.js`, which would have contradicted the strict-TS requirement and matched
nothing else in the repo.

| Component | Type | File |
| --- | --- | --- |
| `AuthSplitShell` | Server | `src/components/layout/AuthSplitShell/` |
| `FannedStack` | Server | `src/components/layout/FannedStack/` |
| `SlimTopBar` | Server | `src/components/layout/SlimTopBar/` |
| `HeroBlock` | Server | `src/components/marketing/HeroBlock/` |
| `AuthPanel` | Server | `src/components/auth/AuthPanel/` |
| `LoginForm` | Client | `src/components/auth/LoginForm/` |
| `SignupForm` | Client | `src/components/auth/SignupForm/` |
| `VerifyForm` | Client | `src/components/auth/VerifyForm/` |
| `ForgotPasswordForm` | Client | `src/components/auth/ForgotPasswordForm/` |
| `ResetPasswordForm` | Client | `src/components/auth/ResetPasswordForm/` |
| `Alert` | Server | `src/components/ui/Alert/` (new UI primitive) |

`Hero` and `HeroCta` (the Phase 2 full-bleed hero) were **not** removed. `Hero`
is still used by seven marketing pages and `CtaSection` imports its `HeroCta`
type. `HeroBlock` is a separate, smaller, text-only component.

## FannedStack geometry

The fan is laid out entirely in CSS. Each card receives `--fan-index`,
`--fan-rotate`, `--fan-lift`, `--fan-z` and `--fan-delay` as inline custom
properties, and the stylesheet computes:

```
left = (100% - var(--fanned-card-w)) * var(--fan-index) / 3
```

So the whole fan re-flows from `--fanned-card-w` alone — one number controls the
layout. `size="compact"` shrinks the cards to 40% width and softens the
rotation. A `@media (max-height: 720px)` rule flattens the fan on short
landscape viewports so it can never push the form off screen, and
`prefers-reduced-motion: reduce` disables the entrance animation.

The stack is decorative and repeated elsewhere in the copy, so it is
`aria-hidden` with empty `alt` on every image.

## Chrome height

`--auth-chrome-h` (defined once in `src/app/(auth)/auth.css`) is the single
source of truth for the `SlimTopBar` height. `SlimTopBar` consumes it as its own
`height`, and `AuthSplitShell` subtracts it from `100dvh`. Change the number in
one place and both follow.

## Responsive behaviour

| Width | Behaviour |
| --- | --- |
| `<768px` | Visual panel is removed; form takes the full width. The bar's nav row collapses and only the logo and CTA remain. |
| `768–1023px` | Both panels stay, padding tightens and the fan scales down. |
| `>=1024px` | Full 50/50 split. |

## Tabs, keyboard and semantics

- Exactly one `h1` per page: the `HeroBlock` owns it on `/`, and `AuthPanel`
  renders `h2` there via `headingLevel="h2"`. Everywhere else `AuthPanel`'s
  title is the `h1`.
- `Alert` is a live region: `role="alert"` for errors, `role="status"` for
  notices.
- `Input` now forwards `autoComplete`, `inputMode`, `name` and `autoFocus`, so
  password managers offer the right account (`username` / `current-password` on
  sign-in, `new-password` on sign-up and reset).

## What was deferred, and where it went

- **No auth API — closed by Phase 4.** The forms were written against the
  documented `{ ok: true, data }` contract, and Phase 4 implemented the routes
  behind them (`docs/PHASE-4.md`). Note the names differ from the original
  sketch: the real routes are `/api/auth/register`, `/api/auth/verify-otp`,
  `/api/auth/forgot-password` and `/api/auth/reset-password`. There is **no**
  resend route, so no form offers a resend.
- **No session, no redirect protection.** Still true. `/home` is Phase 7 and 404s
  today, so a successful sign-in lands on a 404.
- **Social sign-in is inert.** Still true. Google and Apple buttons render
  disabled with an explanation. They need credentials and a provider decision
  that do not exist.
- **No password strength meter, no caps-lock warning, no "remember me".** Still
  true. Session lifetime is whatever the service decides.

## Validation rules (client-side)

These are a courtesy, not a security boundary — each route zod-validates again,
and the service validates a third time. As implemented (see `docs/AUTH-UI.md`
for the matching server rules):

- `LoginForm` — identifier is any non-empty string up to 254 characters (users
  sign in with either email **or** phone, so no email regex is applied);
  password must be non-empty. The form picks the `email` or `phone` request key
  by looking for `@`.
- `SignupForm` — step 1 takes the identifier: an email pattern while the Email tab
  is active, or a Nigerian phone pattern (`0[789]\d{9}` / `+234[789]\d{9}`) on the
  Phone tab. Step 2 takes a password of 8–128 characters plus a required terms
  checkbox. No name field and no confirm-password field; names arrive with the
  Phase 5 profile.
- `ForgotPasswordForm` — the same identifier rules as signup step 1.
- `VerifyForm` — exactly six digits; non-digits are stripped as you type, so a
  pasted `123 456` still works.
- `ResetPasswordForm` — the six-digit code, a password of 8–128 characters, and a
  confirmation that must match. A missing `?identifier=` renders a "Reset link
  needed" state instead of a form that could only fail.
