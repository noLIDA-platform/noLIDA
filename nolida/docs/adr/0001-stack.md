# ADR 0001: Foundational Architecture & Technology Stack

## Context
noLIDA is a global platform designed to combine social interactions, commerce, payments, services, and real-time business operations. Building for high throughput, strict financial correctness, and long-term maintainability requires a lean, resilient, and deterministic foundation.

## Decisions

### 1. Framework: Next.js 16 (App Router) & React 19
- **Decision**: Adopt Next.js 16 with Turbopack and React 19 Compiler enabled.
- **Rationale**: Automatic memoization via React Compiler eliminates manual optimization overhead (`useMemo`/`useCallback`). App Router provides first-class streaming and Server Components.

### 2. Styling: Pure CSS & CSS Variables
- **Decision**: Plain CSS files importing design tokens, base resets, and utility classes. Never install Tailwind or CSS-in-JS.
- **Rationale**: Zero runtime overhead, clean separation of design primitives, no compiler bottlenecks, and standard standards-compliant CSS across all modern browsers.

### 3. Database: Supabase PostgreSQL via Raw `pg`
- **Decision**: PostgreSQL accessed exclusively via raw `pg` driver using connection pooling and explicit transactions.
- **Rejected Alternatives**: ORMs (Prisma, Drizzle, TypeORM).
- **Rationale**: Financial ledgers and high-concurrency systems require absolute control over query plans, index utilization, locking semantics (`FOR UPDATE`), and connection management. ORM abstractions introduce unwanted schema churn and latency overhead.

### 4. Password Hashing: `bcryptjs`
- **Decision**: Use `bcryptjs` for all cryptographic password operations.
- **Rejected Alternatives**: `argon2`.
- **Rationale**: Native bindings in `argon2` consistently introduce compilation failures in Windows developer environments and Turbopack bundler pipelines. `bcryptjs` is pure, reliable, and battle-tested.

### 5. Validation: Zod
- **Decision**: Standardize on `zod` for all API request validation, schema verification, and domain object parsing.
- **Rationale**: Seamless type inference, rigorous runtime boundary safety, and composable schemas.
