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

### Diagnosing a bad `DATABASE_URL`

`/api/health` collapses every connection problem into `DB_UNREACHABLE`, so read the driver
error code before touching application code:

| Error code | What it means | What to do |
| --- | --- | --- |
| `28P01` `password authentication failed for user "postgres"` | Host, port, project ref and the network path are all correct — only the password is wrong (typo, stale after a rotation, or unencoded special characters). | Rotate/confirm the database password in Supabase (**Project Settings → Database**), then update `.env.local` *and* the Vercel env vars. |
| `ENOTFOUND` / `getaddrinfo` | Pooler host or region does not match the project. | Copy the string from the dashboard's **Connect** panel instead of typing it. |
| `ETIMEDOUT` / `ECONNREFUSED` | Outbound network blocked, or the project is paused. | Allow outbound `6543`/`5432`, unpause the project, or fall back to the session pooler on `5432`. |

A quick local probe that prints the real driver error instead of the generic health code:

```powershell
cd C:\dev\nolida
node -e "const{Client}=require('pg');const u=new URL(process.env.DATABASE_URL);console.log(u.hostname,u.port,u.username);new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000}).query('select 1').then(()=>console.log('CONNECT_OK')).catch(e=>console.log('FAIL',e.code,e.message))"
```

Run it from a shell where `DATABASE_URL` is exported (or paste the pooler string in place of
`process.env.DATABASE_URL`).

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

Note: the git repository root is `C:\dev` and the app lives in the `nolida/` subfolder, so the
Vercel project's **Root Directory** must be set to `nolida` — the repository root has no
`package.json`.

## Editor setup (`tsconfig.json`)

`tsconfig.json` sets `"$schema": "./.vscode/tsconfig.schema.json"`. VS Code resolves a
relative `$schema` against the document itself, so validation works without network access -
this machine cannot reach `json.schemastore.org`, which otherwise adds an *"Unable to load
schema"* entry to the Problems panel. `.vscode/tsconfig.schema.json` is a hand-written subset
of the schemastore schema, and `.vscode/settings.json` disables schema downloads and pins the
editor to the workspace TypeScript (`node_modules/typescript/lib`) so that editor diagnostics
match `npx tsc`.

Do not re-add `"baseUrl"` to `tsconfig.json`: it is deprecated in TypeScript 6/7 (newer editor
versions report it as an error) and `paths` already resolve relative to the tsconfig file.

`npx tsc --noEmit` is the source of truth for type errors.
