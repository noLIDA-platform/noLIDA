# NOlida — Copilot Instructions

## Stack (never deviate)
- Next.js 16 (App Router)
- React 19 with React Compiler enabled
- TypeScript strict mode — never plain JavaScript
- Plain CSS with CSS variables — never Tailwind, never CSS-in-JS
- PostgreSQL via Supabase
- pg for database access
- bcryptjs for password hashing
- zod for validation
- Dev server runs on port 4001

## Architecture rules
- Server Components by default
- "use client" only on leaf components that need interactivity
- Route Handlers are thin: parse, validate, call service, return
- Business logic in src/lib/server/services/
- SQL only in src/lib/server/repositories/
- Third-party SDK imports only in src/lib/server/adapters/
- No component imports from src/lib/server/
- No secrets outside src/lib/server/ or .env.local
- Imports use @/ alias

## Brand (locked)
- Primary: #6366F1
- Accent cyan: #22D3EE
- Accent magenta: #D946EF
- Error: #DC2626
- Brand color is fixed. Users only toggle light/dark theme.

## Quality
- Every feature handles: loading, empty, error, success, disabled
- All API returns { ok: true, data } or { ok: false, error }
- No TypeScript any
- No invented colors outside the token set

## Phase status
- Phases 0-6 and 4C: complete
- Phase 4D: in progress