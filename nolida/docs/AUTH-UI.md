# Auth UI — flows, fields, contract, security

The screens people sign up, sign in, and recover their account with. Layout,
orientation and accessibility live in `docs/PHASE-4B.md`; the Route Handlers and
tables live in `docs/AUTH.md`; what Phase 4 specifically changed and verified is
in `docs/PHASE-4.md`; the signed-in shell these flows now land in is
`docs/PHASE-5A.md`. This file is the reference for **what the screens do**.

## Screens

| Route | Renders | Query it reads |
| --- | --- | --- |
| `/` | `HeroBlock` + `LoginForm` (heading is `h2`, the hero owns the `h1`) | `?reset=1` → "password reset, sign in again" banner |
| `/signup` | `SignupForm`, two steps | — |
| `/verify` | `VerifyForm` | `identifier`, `purpose` |
| `/forgot-password` | `ForgotPasswordForm` | — |
| `/reset-password` | `ResetPasswordForm` | `identifier` |
| `/login` | nothing — permanent redirect to `/` | — |

Marketing CTAs still point at `/signup` and `/login`; `/login` exists only so
those links and old bookmarks keep working.

## Flows

### Sign up
1. `/signup` step 1 — email **or** phone (tabbed), validated client-side.
2. Step 2 — password (8–128) plus the terms checkbox, then
   `POST /api/auth/register` with `{ email | phone, password }`.
3. `201` → `/verify?identifier=…&purpose=REGISTER`.
4. `POST /api/auth/verify-otp` with `{ identifier, code, purpose }`. Success
   leaves a `nolida_session` cookie behind, and the form navigates to `/home`,
   which renders the signed-in app shell (Phase 5A).
   `EMAIL_TAKEN` / `PHONE_TAKEN` at step 2 surface as an inline alert.

### Sign in
`/` posts `{ email | phone, password }` (the form picks the key by looking for
`@`) and on success navigates to `redirectTo`, default `/home`. An account that
has not been OTP-verified is refused with the service's `ACCOUNT_NOT_VERIFIED`
message; the UI does not guess at it.

### Password reset
1. `/forgot-password` posts `{ identifier }`. The route always answers
   `{ ok: true }`, whether or not the account exists.
2. The screen goes straight to `/reset-password?identifier=…`.
3. That page collects the 6-digit code **and** the new password and posts
   `{ identifier, code, newPassword }`. On success every session for the account
   is revoked and the user lands on `/?reset=1`.

The code is entered exactly once, on one screen. `otp_records` rows are
single-use — `consumeOtp` marks the row and `resetPassword` verifies the code as
part of the change — so an intermediate "enter your code here" step would spend
the code before the password existed. `/verify` still accepts `purpose=RESET` in
a URL and hands the user to `/reset-password` with an explanation instead of
submitting anything.

Need another code? `/forgot-password` issues a fresh one (3 per hour per
identifier+IP) and links back to the reset page. There is no resend endpoint, so
no screen pretends there is one.

### Sign out
`POST /api/auth/logout` revokes the session and clears the cookie. The control
lives in the profile drawer, opened from the avatar in either top bar;
`signOut()` in `src/lib/client/auth.ts` calls the route and then takes a full
document load back to `/`. The client never touches the cookie itself.

## Field schema

Client-side rules are a courtesy — every one of them is re-enforced server-side.

| Field | Screen | Client rule | Server rule |
| --- | --- | --- | --- |
| Email | signup, login | signup: `^[^\s@]+@[^\s@]+\.[^\s@]+$`; login: 1–254 chars, format not checked | `z.email().max(320)` |
| Phone | signup, login | `/^(?:\+?234|0)[789]\d{9}$/` (local `0…` or `+234…`) | `z.string().min(4).max(32)` + service normalisation |
| Password (signup) | signup step 2 | 8–128 | `min(8).max(128)` → `WEAK_PASSWORD` |
| Password (login) | `/` | non-empty | `min(1).max(128)` |
| Password (reset) | `/reset-password` | 8–128, plus **confirm password** must match | `newPassword min(8).max(128)` |
| Confirm password | `/reset-password` only | must equal the password | not accepted by the API |
| OTP code | `/verify`, `/reset-password` | digits only, exactly 6; pasted spaces and dashes stripped | `/^\d{6}$/` |
| Terms | signup step 2 | must be checked | not accepted by the API |
| `fingerprint` | not sent | — | optional, `max(256)`, reserved for the device-risk signal |
| `redirectTo` | `LoginForm` prop | — | the client chooses the landing page; the server does not read it |

Signup deliberately does not collect a name: `profiles` names belong to the
Phase 5 profile step, and a field the register route ignores is worse than no
field. Confirm-password appears on the reset page (where a mistyped password
locks someone out of a freshly reset account) but not in the two-step signup,
where step 1 already forces a second look at the input.


## How errors reach the screen

`apiFetch` (`src/lib/client/api.ts`) is the only place the envelope is
understood. It returns `{ ok: true, data }` or `{ ok: false, error }`, and turns
a non-JSON body, a malformed envelope, and a dead network into
`UNKNOWN_ERROR` / `NETWORK_ERROR` with a friendly message — so no form has to
handle `fetch` throwing.

Each form then does two things:

- **field errors** — zod issues are mapped onto the matching `Input`'s `error`
  prop, so "Use at least 8 characters" appears under the password box.
- **form errors** — the server's `error.message` is shown in an `Alert`.
  `VerifyForm` is the one special case: `OTP_LOCKED` gets a sentence that
  explains what to do next, because the stored message is generic.

Every form also covers the boring states: submit button `loading` (and the
inputs `disabled`) while a request is in flight, an alert for empty or failed
submissions, and an explicit panel when required query parameters are missing
(`/verify` without `identifier`+`purpose`, `/reset-password` without
`identifier`) rather than firing a request that must fail.

## Security notes

- **Nothing from a URL is trusted.** `?identifier=` only prefills a form. The
  reset still needs the 6-digit code, so a guessed identifier achieves nothing,
  and `/forgot-password` answers identically for accounts that do not exist.
- **No tokens, no codes in storage.** No `localStorage`, no `sessionStorage`, no
  reset token in a URL. The session lives only in the `nolida_session` cookie:
  HttpOnly, SameSite=Lax, Secure in production, `path=/`, server-set expiry.
  `apiFetch` sends `credentials: "same-origin"`; JavaScript never reads it back.
- **Client validation is not the boundary.** Length and format checks exist to
  save a round trip. The routes zod-validate again, and the service validates a
  third time (`WEAK_PASSWORD` comes from the service, not the form).
- **A password reset revokes every session** for that account, so a stolen
  cookie dies with the reset.
- **Wrong-code attempts are bounded twice**: 10 verifies per 15 minutes per
  identifier+IP at the route, and the service's own attempt counter and lock on
  the `otp_records` row.
- **Rate limits are in-memory** — per instance. They must move to Redis before
  launch (tracked in `.clinerules`).
- **Dev OTPs appear in the server log** on purpose: with no `RESEND_API_KEY` the
  mailer adapter prints the code so local flows can be completed. That fallback
  is dev-only, and production never logs codes or passwords.

## Testing

```powershell
cd c:\dev\nolida
npm run test:auth                          # service level: direct function calls
npm run dev -- -p 3001 > dev-e2e.log 2>&1  # real server, log for OTP scraping
npm run test:auth:http                     # 22 checks over real HTTP
```

The HTTP run covers register → verify → login → session → logout → forgot →
reset → replay rejection → re-login, plus a render check on every screen and a
cleanup of its own test rows. `E2E_DEV_LOG` must point at the file the dev server
is writing to. It is a script, not CI: it needs a reachable database and a
running server.

Manual pass worth doing before each phase boundary:

1. `/signup` with a fresh email → a too-short password shows under the field.
2. Complete signup, read the code from the dev terminal, enter it wrong once
   (error appears, form stays usable), then right → the app shell loads at
   `/home`.
3. Log in with the same credentials → `GET /api/auth/session` in devtools shows
   the user.
4. `/forgot-password` → lands on `/reset-password?identifier=…`; submit a stale
   code → alert, no crash.
5. Open `/reset-password` with no query string → the "Reset link needed" panel.
6. Reset with a valid code → `/` shows the reset banner, and the **old** password
   is refused.
7. Tab through each screen: focus must reach every field and control in reading
   order, and the visual panel is never focusable.
8. Toggle dark mode and re-check each alert variant's contrast.

## Known gaps

- Phase 5A closed the `/home` gap: sign-in and verification land on the app
  shell, and Sign Out sits in the profile drawer. Every post-auth navigation
  carries an explicit `no-location-assign-relative-destination` exemption: after
  an auth transition the app deliberately takes a full document load so the
  shell re-renders on the server with the new cookie (`docs/PHASE-5A.md`).
- No resend for REGISTER codes — restart signup, which is what `/verify` links.
- Social sign-in buttons render disabled with an explanation; no provider
  credentials exist.
- "Remember me" is not implemented; session lifetime is whatever the service
  decides. `fingerprint` is accepted by the login route but no screen sends it.
- `/terms` and `/privacy` are placeholder pages (see `docs/MARKETING.md`) even
  though signup links to them.

