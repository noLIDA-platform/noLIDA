# ADR 0001 — Stack selection

Date: Phase 0
Status: Accepted (locked)

## Context

noLIDA is a global platform combining social content, businesses, services, products,
requests, bookings, commerce, messaging, payments, and transactions. That means the
foundation must support: server-rendered content at scale, heavy interactive UI,
multi-tenant data isolation, and — most importantly — **money movement that must never
be double-spent, double-refunded, or corrupted by a race condition**.

Phase 0 fixes the stack so later phases don't relitigate it.

## Decisions

### 1. Next.js 16 (App Router) + React 19 + React Compiler

- App Router gives server components by default, so data-heavy pages (feeds, listings,
  dashboards) ship less JavaScript.
- Route Handlers give us one deployable unit for web pages *and* the API surface that
  mobile clients and payment webhooks will call. A separate API service would double
  deploy, auth, and CORS work for no Phase-0 benefit.
- React Compiler is enabled (`reactCompiler: true`) so components get automatic
  memoization instead of hand-written `useMemo`/`useCallback`, which removes a whole
  class of stale-dependency bugs in the feed, chat, and checkout UIs.
- **Rejected:** Remix/React Router (smaller ecosystem for the payment-provider SDKs we
  need), SvelteKit/Nuxt (would force a second language/framework skill set for a
  multi-year platform), Pages Router (legacy path with no migration upside).

### 2. TypeScript strict mode, never plain JavaScript

- Money, permissions, and webhook payloads are exactly where untyped code fails
  silently. `strict: true` + `allowJs: false` means the compiler is a required gate.
- **Rejected:** JSDoc-typed JS (weaker inference, no compile-time gate).

### 3. PostgreSQL via Supabase, accessed with `pg` — no ORM

- Supabase provides a managed, TLS-only Postgres with backups, connection pooling
  (Supavisor), and a free tier, so there is no database to operate.
- The `pg` driver is used raw, in `src/lib/db/client.ts`. Payments and wallets need
  explicit control that ORMs obscure:
  - `BEGIN` / `COMMIT` / `ROLLBACK` are written by hand in `withTransaction()`.
  - Row locks (`SELECT ... FOR UPDATE`) and isolation levels must be visible in the code,
    not hidden behind a query builder.
  - Financial writes must be idempotent (unique keys on idempotency tokens) — that is a
    schema + SQL concern, not an ORM concern.
- SQL lives only in `src/lib/server/repositories/`, so the database contract stays in one
  reviewable place, and raw SQL keeps query plans tunable as the platform grows.
- **Rejected:** Prisma (generated client, migration engine and pooling layer all add
  latency and hide transaction semantics on the critical money path), Drizzle (nicer than
  Prisma, but still an abstraction we'd fight for `FOR UPDATE`/advisory locks),
  Supabase's PostgREST client (cannot express multi-statement transactions or row locks;
  also couples business logic to RLS policies instead of code).

### 4. bcryptjs for password hashing — never argon2

- `bcryptjs` is pure JavaScript: no native build step, no node-gyp, identical behaviour on
  Windows dev machines and Vercel's Linux runtime, and it does not break Turbopack.
- `argon2` (and `bcrypt`) require native compilation, which fails on Windows without build
  tools and complicates serverless bundling.
- bcrypt at a modern cost factor remains an accepted password hashing choice.
- **Rejected:** argon2/native bcrypt, hand-rolled scrypt, plain SHA-anything.

### 5. zod for validation

- One schema library for API bodies, form input, query params, and webhook payloads.
- Boundary validation is mandatory: route handlers must treat all input as hostile —
  including amounts, fees, discounts, and payment status, which must never be trusted from
  the client.
- **Rejected:** hand-written guard functions (inconsistent, untestable), class-validator
  (decorator-heavy, weaker runtime inference).

### 6. resend for email

- Transactional email is needed for verification, receipts, booking confirmations, and
  dispute notices. Resend offers a clean HTTP API, no SMTP infrastructure to run, and
  works from serverless functions.
- **Rejected:** raw SMTP/Nodemailer (connection lifecycle is a poor fit for serverless),
  Postmark/SendGrid (equivalent capability, no reason to prefer).

### 7. Plain CSS with CSS variables — never Tailwind, never CSS-in-JS

- The brand identity is locked (primary `#6366F1`, cyan `#22D3EE`, magenta `#D946EF`, plus
  fixed gradients and semantic colors). One `styles/tokens.css` file is the single source
  of truth, and a future light/dark toggle becomes a variable swap, not a dependency change.
- Plain CSS keeps the styling layer free of build-time coupling, so design changes never
  require a bundler/plugin upgrade in the middle of a payment release.
- CSS-in-JS adds runtime cost and serialization overhead to server components, while
  utility classes would scatter brand values through markup instead of tokens.
- **Rejected:** Tailwind (brand values in class strings; the Phase 0 scaffold was stripped
  of it and `postcss.config.mjs` deleted), styled-components/emotion (runtime + RSC
  friction), CSS modules (extra indirection over tokens).

### 8. Architecture layering (enforced in `.clinerules`)

- Route Handlers are thin: parse → validate → call service → return.
- Business logic lives in `src/lib/server/services/`.
- SQL lives only in `src/lib/server/repositories/`.
- Third-party SDK imports live only in `src/lib/server/adapters/`, so swapping Flutterwave,
  Cloudinary, Termii, or Resend later touches one adapter instead of every call site.
- Client code never imports from `src/lib/server/`.

## Consequences

- The money path is explicit, reviewable, and testable against real Postgres transactions.
- More SQL is written by hand than with an ORM; that is the accepted trade for control.
- Every API response follows `{ ok: true, data }` / `{ ok: false, error }`, so clients have
  exactly one response shape to handle.
- No database tables exist yet — Phase 1 owns schema and migrations.

