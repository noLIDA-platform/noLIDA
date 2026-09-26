# Phase 0: Foundation & Core Scaffold

## Objective
Establish the immutable foundational baseline for noLIDA:
- Next.js 16 App Router runtime with React 19 Compiler.
- Strict TypeScript configurations with root wildcard `*` aliases.
- Plain CSS variable architecture matching the official brand guidelines.
- Clean database connectivity via raw `pg` driver using Supabase connection pooler with zero ORM overhead.
- Operational health check probe (`/api/health`).

## Architecture & Directory Layout
- `src/app`: Domain route groups `(auth)`, `(marketing)`, `(main)`, `(business)`, `(admin)`, and `api/health`.
- `src/components`: UI primitives and modular domain component holders (`ui`, `layout`, `marketing`, `feed`, `business`, `wallet`, `messaging`, `booking`, `checkout`, `admin`).
- `src/lib`: Core infrastructure and layered domain logic (`auth`, `db`, `payments`, `wallet`, `security`, `notifications`, `search`, `business`, `booking`, `orders`, `server/{services,repositories,validators,adapters}`, `client`).
- `styles`: System tokens, base resets, and utility classes.

## Verification Gates
1. TypeScript strict-mode compilation check with zero errors.
2. Next.js production build (`npm run build`) with React Compiler active.
3. Supabase connectivity verification via `/api/health`.
