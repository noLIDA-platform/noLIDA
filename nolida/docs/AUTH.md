# Authentication (Phase 3)

## Architecture

Thin Route Handlers parse and zod-validate, then call `auth.service.ts`.
All business logic lives in the service; all SQL lives in
`src/lib/server/repositories/` and is parameterized. OTP codes are
SHA-256 hashed (never stored plain). Passwords use bcryptjs (rounds=12)
and are never logged. Sessions are `crypto.randomBytes(32)` tokens with
only the SHA-256 hash stored. The `nolida_session` cookie is HttpOnly,
SameSite=Lax, Secure in production. Every auth action writes a row to
`security_events`. Rate limiting is in-memory — move to Redis before launch.

## Tables

- `users` — identity (email and/or phone, one required), password hash,
  verification timestamps, status (`ACTIVE`/`SUSPENDED`/`DELETED`), role.
- `profiles` — 1:1 with users, username, names, bio, avatar, locale
  defaults (`en`, `Africa/Lagos`, `NGN`).
- `devices` — `(user_id, fingerprint)` pairs for risk signals.
- `sessions` — hashed session tokens, device link, risk level
  (`LOW`/`MEDIUM`/`HIGH`), expiry, revocation.
- `otp_records` — hashed 6-digit codes with purpose (`REGISTER`,
  `LOGIN`, `RESET`, `VERIFY_CONTACT`), attempt counters, expiry,
  consumption timestamp.
- `security_events` — append-only audit log of auth actions.
- `_migrations` — ledger of applied migration files.

All six auth tables have RLS enabled with no policies, so Supabase
PostgREST exposes zero rows to `anon`/`authenticated`; only the
`postgres` owner (our `pg` client) touches them.

## Endpoints

All routes run on the Node.js runtime and return
`{ ok: true, data }` or `{ ok: false, error: { code, message } }`.

### POST /api/auth/register (201)
Request: `{ "email": "a@b.com", "password": "secret123" }`
(or `phone` instead of `email`).
Success: `{ "ok": true, "data": { "userId": "…", "identifier": "a@b.com", "identifierType": "EMAIL" } }`
Errors: `EMAIL_TAKEN`/`PHONE_TAKEN` (409), `WEAK_PASSWORD`/`INVALID_CONTACT` (400).

### POST /api/auth/verify-otp
Request: `{ "identifier": "a@b.com", "code": "123456", "purpose": "REGISTER" }`
Success: `{ "ok": true, "data": { "userId": "…" } }`
Errors: `OTP_NOT_FOUND`, `OTP_EXPIRED`, `OTP_LOCKED`, `OTP_INVALID`, `OTP_ALREADY_USED` (400).

### POST /api/auth/login
Request: `{ "email": "a@b.com", "password": "secret123" }`
Sets the `nolida_session` cookie.
Success: `{ "ok": true, "data": { "userId": "…", "expiresAt": "…" } }`
Errors: `INVALID_CREDENTIALS` (401), `ACCOUNT_SUSPENDED` (403).

### POST /api/auth/logout
Reads and revokes the session cookie, then clears it.
Success: `{ "ok": true, "data": {} }`

### GET /api/auth/session
Success: `{ "ok": true, "data": { "user": { … } } }` or `{ "user": null }`.
The user object never contains `password_hash`.

### POST /api/auth/forgot-password
Request: `{ "identifier": "a@b.com" }`
Always `{ "ok": true, "data": {} }` — never reveals account existence.

### POST /api/auth/reset-password
Request: `{ "identifier": "a@b.com", "code": "123456", "newPassword": "…" }`
Revokes all sessions for the user.
Success: `{ "ok": true, "data": {} }`

## Migrations

```powershell
cd c:\dev\nolida
npm run migrate        # applies pending files in migrations/ in order
```

Files run alphabetically inside one transaction each and are recorded in
`_migrations`. Uses the transaction pooler on :6543 — never use
session-scoped constructs (`CREATE INDEX CONCURRENTLY`, bare `SET`,
temp tables, advisory locks).

## Test script

```powershell
cd c:\dev\nolida
npm run test:auth
```

Registers `test@nolida.dev`, reads the OTP from the dev console output,
verifies, logs in, checks the session, logs out, checks the session is
null, then deletes the test user. Requires `RESEND_API_KEY` to be empty
(dev fallback) unless you adapt the OTP capture.

## Rules

- OTP codes are hashed with SHA-256. Never stored plain, never logged in production.
- Passwords hashed with bcryptjs (rounds=12). Never logged.
- Sessions use random tokens; only the SHA-256 hash is stored.
- Session cookies: HttpOnly, SameSite=Lax, Secure in production. Name: `nolida_session`.
- Every auth action writes a row to `security_events`.
- Rate limiting is in-memory — must move to Redis before launch.
- Never reveal whether an email/phone exists in password-reset flows.
