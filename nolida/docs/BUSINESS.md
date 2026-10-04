# Business Authorization and Submissions

## Overview

The business flow is intentionally gated: a user must redeem a valid authorization code before they can create a business listing. Listings are created as drafts, then submitted for admin review before they can be published.

## Status lifecycle

- DRAFT: the business exists but is still being assembled.
- PENDING_REVIEW: a submission is queued for admin review.
- CHANGES_REQUESTED: the admin asked the owner to revise details.
- APPROVED: the listing is valid and can be used in the app shell.
- REJECTED: the submission was declined.
- SUSPENDED / UNPUBLISHED: operational states reserved for later lifecycle management.

## Authorization codes

Authorization codes are generated in `src/lib/server/auth/code-generator.ts` and recorded in `migrations/007_businesses_auth.sql`.

Rules:
- Format: `NLDA-XXXX-XXXX`
- One-time use by default
- Status must be `ACTIVE` and not expired
- Uses are tracked in `authorization_code_usage`
- Admins are the only users allowed to generate codes

## Business flow

There are now **two** ways to obtain an authorization code. Both end at the
same place: a `DRAFT` business owned by the user.

**Self-service (Phase 7E, the default path).** The user fills in a short form
at `/list-your-business`. `POST /api/businesses/request` generates a code,
auto-redeems it, creates the DRAFT business and writes an audit row — all in
one transaction. Nobody types a code. See `docs/BUSINESS-REQUEST.md`.

1. The user submits the request form at `/list-your-business`.
2. The server generates a code, marks it already-spent, and creates the
   `DRAFT` business with its owner row in one transaction.
3. The code is displayed on screen; Continue goes to `/my-business/submit`.

**Admin-issued codes (unchanged, still supported).**

1. An admin creates an authorization code.
2. A signed-in user redeems the code via `POST /api/businesses/redeem-code`.
3. The app creates a `DRAFT` business record and records the owner relationship.

Both then converge:

4. The user fills in details through `/my-business/submit`.
5. Submitting the form creates a `business_submissions` row and flips the business to `PENDING_REVIEW`.
6. An admin reviews the listing via `POST /api/admin/businesses/[id]/review`.
7. Approvals update the business and the latest submission record.

## Key server files

- `src/lib/server/services/businessRequest.service.ts` — the Phase 7E request flow
- `src/lib/server/services/authorization.service.ts` — admin code generation and redemption
- `src/lib/server/services/business.service.ts`
- `src/lib/server/repositories/authorizationCodes.repo.ts`
- `src/lib/server/repositories/businesses.repo.ts`
- `src/lib/server/repositories/businessSubmissions.repo.ts`
- `src/app/api/businesses/*`
- `src/app/api/admin/businesses/[id]/review/route.ts`

## Seeded admin

The admin account can be created with:

```bash
npm run seed:admin
```

Default values:
- email: `admin@nolida.local`
- password: `AdminPass123!`

These can be overridden with `NOLIDA_ADMIN_EMAIL` and `NOLIDA_ADMIN_PASSWORD`.
