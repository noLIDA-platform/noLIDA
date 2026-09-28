# Environment variables

`.env.example` is committed and lists every key. `.env.local` is git-ignored and holds the
real values. Copy the template, fill it in, restart the dev server.

```powershell
Copy-Item .env.example .env.local
```

## Required now (Phase 0)

| Key | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string used by `src/lib/db/client.ts`. |
| `SESSION_SECRET` | Signing key for server-side sessions (used from Phase 1). |
| `JWT_SECRET` | Signing key for access/refresh tokens (used from Phase 1). |
| `NEXT_PUBLIC_APP_URL` | Absolute base URL of the deployment. |
| `NEXT_PUBLIC_APP_NAME` | Public product name. |

### `DATABASE_URL` notes

Use the Supabase **connection pooler** host, not `db.<ref>.supabase.co`:

```
postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres
```

- Port `6543` is the transaction pooler (serverless-friendly). Port `5432` on the same
  pooler host is the session pooler.
- URL-encode any special characters in the password (`@` -> `%40`, `#` -> `%23`, etc.).
- If the password contains characters that are also URL delimiters, prefer rotating to an
  alphanumeric password rather than guessing the encoding.
- `src/lib/db/client.ts` already forces SSL with `rejectUnauthorized: false`, which the
  Supabase pooler requires.
- Connection limit is `max: 10` per instance. Keep it low on serverless.

## Secrets handling

- Never commit `.env.local`, `.env`, or any `.env*.local` file — `.gitignore` blocks them.
- Never expose `SESSION_SECRET`, `JWT_SECRET`, `DATABASE_URL`, or any provider secret key
  to the browser. Only keys prefixed `NEXT_PUBLIC_` reach client bundles.
- Import secrets only inside `src/lib/server/` or a Route Handler. Client components never
  read `process.env` secrets.
- Real values live in exactly two places: `.env.local` for local development and the
  Vercel project's Environment Variables for deployments. Production and Preview must not
  reuse development values.

## Later phases (names reserved in `.env.example`)

| Key | Phase | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | 1+ | Support contact / deep links. |
| `RESEND_API_KEY`, `EMAIL_FROM` | 1+ | Transactional email. |
| `TERMII_API_KEY`, `TERMII_SENDER_ID` | 1+ | SMS / OTP delivery. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | 6 | Google sign-in. |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` | 6 | Apple sign-in. |
| `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET` | later | Payments and webhook signature verification. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | later | Media uploads. |
| `SENTRY_DSN` | later | Error tracking. |
| `POSTHOG_KEY` | later | Product analytics. |

## Vercel

Add every production-required key under **Project -> Settings -> Environment Variables**
for the `Production` (and `Preview`) environments, then redeploy. Verify with
`<deployment-url>/api/health` — it must return `{ ok: true, ... }`. If it returns
`{ ok: false, error: { code: "DB_UNREACHABLE" } }`, the `DATABASE_URL` is missing, wrong,
or the password is not URL-encoded.
