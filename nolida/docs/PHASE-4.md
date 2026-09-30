# Phase 4 — Auth wired end to end

Phase 4B shipped the auth screens with nothing behind them: every submission
reported a failure because `/api/auth/*` did not exist. Phase 4 closes that gap.
The five forms now talk to the Phase 3 service through real Route Handlers, and
the whole surface is exercised over HTTP against a running server.

`docs/PHASE-4B.md` covers the layout, orientation, fan geometry and a11y of
these screens. This file covers the wiring, the two bugs the HTTP run found, and
what was verified.

## What shipped

| Deliverable | Where |
| --- | --- |
| Sign-in, sign-up, verify, forgot-password, reset screens | `src/app/(auth)/` |
| Forms that post to the API and render per-code errors | `src/components/auth/*` |
| Client-side envelope helper | `src/lib/client/api.ts` |
| Seven auth Route Handlers | `src/app/api/auth/*` |
| Service + repositories (Phase 3, unchanged logic) | `src/lib/server/services/auth.service.ts` |
| HTTP end-to-end check | `scripts/test-auth-http.ts` (`npm run test:auth:http`) |
| Product brief and vocabulary | `docs/PRODUCT.md` |
| Screen flows, field schema, security notes | `docs/AUTH-UI.md` |

## Routes as they behave today

All routes set `runtime = "nodejs"` and return `{ ok: true, data }` or
`{ ok: false, error: { code, message } }`. Rate limits are in-memory.

| Route | Request | Success | Limits / status |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `{ email \| phone, password }` | 201 `{ userId, identifier, identifierType }` | 5 / 15 min per IP; `EMAIL_TAKEN`/`PHONE_TAKEN` → 409 |
| `POST /api/auth/verify-otp` | `{ identifier, code, purpose }` | 200 `{ verified, userId }` | 10 / 15 min per IP+identifier; all `OTP_*` → 400 |
| `POST /api/auth/login` | `{ email \| phone, password, fingerprint? }` | 200 `{ userId, expiresAt }` + `nolida_session` cookie | 10 / 15 min per IP; `ACCOUNT_SUSPENDED` → 403, else 401 |
| `POST /api/auth/logout` | — | 200 `{}` + cleared cookie | — |
| `GET /api/auth/session` | — | 200 `{ user }` or `{ user: null }` | — |
| `POST /api/auth/forgot-password` | `{ identifier }` | 200 `{}` — always, unknown account included | 3 / hour per IP+identifier |
| `POST /api/auth/reset-password` | `{ identifier, code, newPassword }` | 200 `{}` | AuthError → 400, unexpected → 500 |

`GET /api/auth/session` answers `{ ok: true, data: { user: null } }` when there
is no session — an anonymous visitor is a successful answer to "who am I?", not
an error. An invalid or expired cookie clears the cookie on the way out so the
browser stops resending it.

## Two bugs the HTTP run found

### 1. A password-reset code was consumed before it could be used

`ResetPasswordForm` requires the 6-digit code on submit, and
`resetPassword()` verifies that code as part of the change. But the flow used to
route the user through `/verify?purpose=RESET` first, and `VerifyForm` submitted
that code to `/api/auth/verify-otp`, which marks the row consumed
(`consumed_at = now()`). The one code the user had was spent on the intermediate
screen, so the reset page could only ever answer `OTP_NOT_FOUND` — and pressing
its "Request a new code" link looped back through `/forgot-password` → `/verify`
forever.

Fix: `/forgot-password` now navigates straight to
`/reset-password?identifier=…`. `/verify` still recognises `purpose=RESET` (old
links exist) but never submits it — it explains that the code belongs on the
reset page and hands the user onward. There is exactly one place a reset code is
entered, and it is the place that consumes it.

### 2. The end-to-end session check could not fail

`test-auth-http.ts` asserted `GET /api/auth/session` was `ok`, which is true for
an anonymous caller too — a login that set no cookie would have passed. It also
asserted that a session is gone after logout by expecting `ok: false`, which the
route never returns. Both now inspect `data.user`.

## Deliberate deviations

- **No `purpose=RESET` step.** See above — the plan listed `/verify` as a reset
  step; the code's single-use nature rules it out.
- **`SignupForm` collects contact → password + terms**, not name/phone-opt-in/
  confirm-password. The server is the source of truth for the register contract
  (`{ email | phone, password }`), and inventing client-only fields would have
  meant dead payload. Names belong to the profile, which is Phase 5.
- **No standalone resend endpoint** exists in Phase 3, so no form pretends there
  is one. RESET codes are re-issued from `/forgot-password` (linked from
  `/reset-password` and from the `/verify` hand-off); a REGISTER code that never
  arrived means restarting signup, which is what `/verify` links to.
- **Successful sign-in lands on `/home`, which 404s until Phase 7**, so the
  forms navigate with `window.location.assign` rather than `router.push`. ESLint
  flags four `no-location-assign-relative-destination` warnings for exactly this;
  they are accepted and must be revisited when `/home` exists.
- **The HTTP check is a script, not CI.** It needs a live server and a reachable
  database; the repo has no vitest or Playwright and adding a runner is not part
  of this phase.

## Running the check yourself

```powershell
cd c:\dev\nolida
npm run migrate                          # 001-004, idempotent
npm run dev -- -p 3001 > dev-e2e.log 2>&1   # port 3000 belongs to Postgres
npm run test:auth:http                   # in a second shell
```

`test-auth-http.ts` drives real HTTP against the dev server, so it also compiles
each route on first use — allow ~30 seconds of warm-up before the first check.
With no `RESEND_API_KEY` the mailer writes the code to the dev log instead of
sending it, and the script scrapes `to=… purpose=… code=…` from that log, which
is why `E2E_DEV_LOG` must point at the file the server is writing to:

```powershell
$env:E2E_DEV_LOG = "c:\dev\nolida\dev-e2e.log"
```

It registers `e2e-<timestamp>@nolida.test`, walks the whole flow, and deletes
that user plus its `otp_records`, `sessions` and `security_events` rows at the
end. A mid-run failure leaves the row behind and says so. Override with
`E2E_BASE_URL` / `E2E_PASSWORD` when needed.

## What was verified

| Check | Result |
| --- | --- |
| `npm run migrate` | 001-004 applied against the Supabase pooler |
| `npm run test:auth` (service level, direct function calls) | all checks passed |
| `npm run test:auth:http` (22 HTTP checks) | all passed |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint src scripts` | 0 errors, 5 warnings (4 accepted `location.assign`, 1 pre-existing `_passwordHash`) |
| `npm run build` | exit 0 — 22 routes, 7 of them under `/api/auth/*` |
| `GET` on `/`, `/signup`, `/verify`, `/forgot-password`, `/reset-password` | 200 with no `UnhandledRuntimeError` in the log (part of the HTTP run) |
| Register → verify → login → session → logout → forgot → reset → re-login | green over HTTP, cookie included |
| `reset-password` replay with the same code | rejected |
| Login with the old password after reset | rejected; new password accepted |

Not done, and worth doing before Phase 5: a click-through in a real browser.
The HTTP run proves the routes, the cookie and the rendered HTML; it cannot see
focus order, the fanned-stack animation, or dark-mode contrast.
