<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# noLIDA — AI Agent Guidelines & Architecture Rules

## 1. Stack — LOCKED
- **Framework**: Next.js 16 with App Router
- **Runtime / View**: React 19 with React Compiler enabled (`reactCompiler: true` in `next.config.ts`)
- **Language**: TypeScript in strict mode (`allowJs: false`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`). Plain JavaScript is prohibited. `any` is prohibited.
- **Styling**: Plain CSS with CSS variables. NEVER install Tailwind, styled-components, Emotion, or any CSS-in-JS library.
- **Database**: PostgreSQL hosted via Supabase.
- **Database Access**: Raw `pg` driver using the connection pooler. NEVER install an ORM (Prisma, Drizzle, TypeORM, etc.).
- **Password Hashing**: `bcryptjs` exclusively. NEVER install `argon2` (native compilation breaks Turbopack and Windows builds).
- **Validation**: `zod` for all request/schema validations.
- **Email**: `resend` for transactional communications.

---

## 2. Brand Design Tokens — LOCKED
- **Primary**: `#6366F1`
- **Accent Cyan**: `#22D3EE`
- **Accent Magenta**: `#D946EF`
- **Brand Gradient**: `linear-gradient(135deg, #22D3EE 0%, #6366F1 50%, #D946EF 100%)`
- **Hero Gradient**: `linear-gradient(135deg, #0E7490 0%, #4338CA 50%, #A21CAF 100%)`
- **Error / Sign Out**: `#DC2626`
- **Success**: `#16A34A`
- **Warning**: `#F59E0B`

---

## 3. Server Architecture & Layering Rules
1. **Layer Separation**:
   - `src/lib/server/repositories`: Pure SQL data access using `query` or passed client transactions.
   - `src/lib/server/services`: Business logic, domain rules, state transitions.
   - `src/lib/server/validators`: Zod schemas for ingress payloads and domain objects.
   - `src/lib/server/adapters`: External service integrations (Resend, payments, storage).
2. **Database Invariants**:
   - Connection pool is a singleton managed via `src/lib/db/client.ts`.
   - Environment variables (`DATABASE_URL`) must NOT be checked at import time; they must only be evaluated inside caller functions.
   - All multi-row updates, state mutations, and money-related transactions must execute inside `withTransaction((client) => ...)`.
3. **TypeScript Discipline**:
   - No `any`. Use generics and strict interfaces for database query results (`query<T>(...)`).
   - Treat database query outputs as unknown until asserted or validated.

---

## 4. Financial & Transaction Rules (Money Invariants)
- **Zero Balance Drifts**: Balances, wallet entries, and checkout operations must always occur within explicit atomic database transactions (`withTransaction`).
- **Precision**: Monetary units must always be stored in integer cents / smallest currency denominator. Floating point numbers for balances or prices are strictly prohibited.
- **Idempotency**: All ledger modifications, payments, and checkout operations must accept and verify idempotency keys.

---

## 5. Scope Constraints
- In Phase 0: Do NOT create business tables, user tables, or wallet tables.
- Do NOT build authentication routes or signup flows until authorized in Phase 3+.
- Do NOT fabricate environment secrets. Always read from validated environment configurations.

