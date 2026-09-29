# Phase 4B — Auth UI (frontend only)

Phase 4B repurposes the noLIDA front door so that `/` **is** the sign-in screen,
and builds the auth user interface that Phase 4 was originally supposed to
provide. It is **frontend only**: no session, no database writes, no password
hashing. Those arrive in Phase 4C.

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

## Not built (deliberately)

- **No auth API.** The forms post to `/api/auth/login`, `/api/auth/signup`,
  `/api/auth/verify`, `/api/auth/verify/resend`, `/api/auth/forgot-password` and
  `/api/auth/reset-password`. None of these exists yet, so every submission in
  the current build reports a failure. That is the expected behaviour, not a bug.
  They are written against the documented `{ ok: true, data }` contract so that
  Phase 4C only has to implement the routes.
- **No session, no redirect protection.** `/home` is Phase 7 and 404s today, so
  a real successful sign-in would land on a 404 until then.
- **Social sign-in is inert.** Google and Apple buttons render disabled with an
  explanation. They need credentials and a provider decision that do not exist.
- **No password strength meter, no caps-lock warning, no "remember me".**

## Validation rules (client-side)

These are a courtesy, not a security boundary — the server revalidates
everything in Phase 4C.

- `LoginForm` — identifier is any non-empty string up to 254 characters (users
  sign in with either email **or** phone, so no email regex is applied);
  password must be non-empty.
- `SignupForm` — name 2–120 characters; identifier must match an email pattern
  or a Nigerian phone pattern (`0[789]\d{9}` / `+234[789]\d{9}`); password
  8–128 characters and must match the confirmation; terms must be accepted.
- `VerifyForm` — exactly six digits.
- `ResetPasswordForm` — password 8–128 characters and must match the
  confirmation. A missing `?token=` renders an "invalid link" state instead.
