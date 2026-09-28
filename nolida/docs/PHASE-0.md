# Phase 0 — Foundation

Status: code complete and build-verified locally; pushed to `main` (`cc6f8e8`). Pending: real
credentials in `.env.local` / Vercel, and the Vercel deployment check.

## Goal

Stand up the noLIDA foundation: a Next.js 16 App Router project with TypeScript
strict mode, React Compiler enabled, plain-CSS design tokens, a `pg` database
client, and a live database health check — with no product features, no auth,
and no database tables.

## What was created

### Application scaffold
- Next.js 16.3.6 (App Router) scaffolded directly into `C:\dev\nolida` (no nested folder)
- React 19.2.8 with React Compiler enabled (`reactCompiler: true` in `next.config.ts`,
  `babel-plugin-react-compiler` installed as a dev dependency)
- TypeScript strict mode, `allowJs: false`, target ES2022
- `jsx: react-jsx` — Next.js rewrites the template's `preserve` during `next build`
- Import alias `@/*` -> `./src/*` (used by all new code)
- Turbopack is the default bundler in Next.js 16

### Configuration
- `next.config.ts` — `reactCompiler: true`, `serverExternalPackages: ["pg", "bcryptjs"]`
  (native/node-only packages are kept out of the bundler)
- `tsconfig.json` — strict, no `any` tolerance in new code
- `.npmrc` — pins the registry to `https://registry.npmjs.org/`

### Database layer
- `src/lib/db/client.ts` — lazily created `pg` `Pool` (`getPool()`, cached on `globalThis` so
  dev HMR never leaks pools and `next build` never fails on a missing `DATABASE_URL`), plus a
  `query<T>()` helper and `withTransaction()`, which wraps work in
  BEGIN / COMMIT / ROLLBACK with guaranteed client release
- SSL enabled with `rejectUnauthorized: false` (required by Supabase poolers)
- Pool limits: `max: 10`, `idleTimeoutMillis: 30s`, `connectionTimeoutMillis: 10s`

### Health check
- `src/app/api/health/route.ts` — `runtime = "nodejs"`, `dynamic = "force-dynamic"`
- Returns `{ ok: true, data: { status, database, serverTime, postgresVersion, environment } }`
- On failure returns HTTP 500 with `{ ok: false, error: { code: "DB_UNREACHABLE", ... } }`
  and only exposes the raw driver message outside production

### Design system (plain CSS, no Tailwind, no CSS-in-JS)
- `styles/tokens.css` — brand colors, gradients, spacing, typography, radii, shadows,
  transitions, plus a `prefers-color-scheme: dark` override block
- `styles/base.css` — reset and element defaults
- `styles/utilities.css` — `.container`, `.stack`, `.row`, `.sr-only`, `.text-muted`, `.text-center`
- `src/app/globals.css` imports the three files; nothing else

Locked brand values: primary `#6366F1`, accent cyan `#22D3EE`, accent magenta `#D946EF`,
gradient `135deg cyan -> primary -> magenta`, hero gradient `#0E7490 -> #4338CA -> #A21CAF`,
error/sign-out `#DC2626`, success `#16A34A`, warning `#F59E0B`.

### Layout and home
- `src/app/layout.tsx` — metadata (`noLIDA`, `%s · noLIDA` template), viewport/theme color
  `#6366F1`, plain `<body>` (no font loaders, no utility classes)
- `src/app/page.tsx` — inline-styled placeholder pointing at `/api/health`

### Folder skeleton
Every future phase has a home. Empty folders carry `.gitkeep` so git tracks them:

- `src/app/` route groups: `(auth)`, `(marketing)`, `(main)`, `(business)`, `(admin)`, `api/health`
- `src/components/` — `ui`, `layout`, `marketing`, `feed`, `business`, `wallet`, `messaging`,
  `booking`, `checkout`, `admin`
- `src/lib/` — `auth`, `db`, `payments`, `wallet`, `security`, `notifications`, `search`,
  `business`, `booking`, `orders`, `client`, and `server/{services,repositories,validators,adapters}`
- `src/hooks/`, `src/types/`, `src/utils/`
- root: `migrations/`, `scripts/`, `docs/{adr,audit}/`, `public/{branding,images,icons}/`, `styles/`

### Environment files
- `.env.example` — committed, contains every key name with empty values (see `docs/ENV.md`)
- `.env.local` — git-ignored, holds real values
- `.gitignore` — ignores `.env`, `.env.local`, `.env*.local`, `.env*`, `node_modules`,
  `.next`, `next-env.d.ts`, `*.tsbuildinfo`; with an explicit `!.env.example` exception
  so the template stays committed

### Agent rules
- `.clinerules` — locked stack, architecture layering, brand values, money rules,
  quality rules, workflow, phase status

## Deviations from the original Phase 0 prompt (approved)

1. **npm registry.** The machine was configured to `registry.npmmirror.com`, which made
   every registry call hang. A project-level `.npmrc` pins `registry.npmjs.org`.
2. **Dev server port.** Port 3000 is held by a local `postgres` process, so local
   verification runs on port **3001** (`next dev -p 3001`).
3. **Scaffold command.** `create-next-app@16` no longer accepts `--turbopack` (Turbopack is
   the default bundler) or `--no-tailwind` (`--tailwind` is default-on and cannot be negated
   by a flag). The corrected command was:
   `npx create-next-app@latest . --typescript --eslint --src-dir --app --react-compiler --import-alias "@/*" --use-npm --disable-git --yes`,
   followed by removing Tailwind: `postcss.config.mjs` deleted and
   `npm uninstall tailwindcss @tailwindcss/postcss`. No Tailwind dependency remains.
4. **`@types/bcryptjs`.** Install per spec, but it is a deprecated stub — `bcryptjs@3`
   ships its own type definitions.
5. **`.gitignore`.** Added `!.env.example`, because the template's `.env*` glob would
   otherwise exclude the committed template.
6. **Build order.** `.env.local` is written with empty values first, and the production
   build runs only after real credentials exist. The Postgres pool is created lazily by
   `getPool()` in `src/lib/db/client.ts`, so a missing `DATABASE_URL` never breaks
   `next build` — `/api/health` reports it instead as
   `{ ok: false, error: { code: "DB_UNREACHABLE" } }`.

## Verification

- `npm run build` — passes: Next.js 16.3.6 (Turbopack), TypeScript OK, routes `/`,
  `/_not-found`, `/api/health` (dynamic)
- `npx tsc --noEmit` and `npm run lint` — both exit 0
- `npm run dev -- -p 3001` + `curl http://localhost:3001/api/health` — must return `{ ok: true }`.
  With an empty `DATABASE_URL` it currently returns HTTP 500 and the handled payload
  `{ ok: false, error: { code: "DB_UNREACHABLE" } }`, which is the expected pre-credential result.
- `git push` to `https://github.com/noLIDA-platform/noLIDA.git` (`main`) — done (`cc6f8e8`)
- Vercel production deploy — `<vercel-url>/api/health` must return `{ ok: true }`

## Vercel project settings

The git repository root is `C:\dev` and the app lives in the `nolida/` subfolder, so:

- **Root Directory** must be set to `nolida`; otherwise the build fails because there is no
  `package.json` at the repository root.
- Framework preset: Next.js. Leave the build/output commands at their defaults.
- Add `DATABASE_URL`, `SESSION_SECRET`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL` and
  `NEXT_PUBLIC_APP_NAME` to Production (and Preview), then redeploy and request `/api/health`.

## Out of scope (by instruction)

No auth, no signup/login, no feed, no business pages, no bookings, no checkout,
no messaging, no payments, no wallet, and no database tables yet.
