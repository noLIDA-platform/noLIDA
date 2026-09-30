# Database (Phase 3)

PostgreSQL via Supabase, accessed with raw `pg`. Migrations live in
`migrations/` and run via `npm run migrate` (`scripts/migrate.ts`).
Each `.sql` file runs alphabetically inside its own transaction and is
recorded in `_migrations(id, applied_at)`.

Connection: Supabase **transaction pooler** (`:6543`, PgBouncer). Plain
DDL works, but never use session-scoped constructs: `CREATE INDEX
CONCURRENTLY`, bare `SET`, temp tables, advisory locks.

Every table below has `ENABLE ROW LEVEL SECURITY` + `FORCE` with no
policies, so PostgREST exposes zero rows to `anon`/`authenticated`; only
the `postgres` owner (our server) reads/writes.

## users

| column | type | notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| email | TEXT UNIQUE NULL | partial index when not null |
| phone | TEXT UNIQUE NULL | partial index when not null |
| email_verified_at | TIMESTAMPTZ NULL | set on REGISTER/VERIFY_CONTACT verify |
| phone_verified_at | TIMESTAMPTZ NULL | set on REGISTER/VERIFY_CONTACT verify |
| password_hash | TEXT NULL | bcryptjs, rounds=12 |
| status | TEXT | `ACTIVE`/`SUSPENDED`/`DELETED`, default `ACTIVE` |
| role | TEXT | `USER` + 7 admin roles, default `USER` |
| created_at / updated_at | TIMESTAMPTZ | `set_updated_at()` trigger |

Constraints: `users_contact_required` (email OR phone), `users_role_valid`,
`users_status_valid`.

## profiles

1:1 with `users` (`user_id UNIQUE REFERENCES users ON DELETE CASCADE`).
`username UNIQUE`, names, bio, `avatar_url`, `date_of_birth`, country/city,
`language` (`en`), `timezone` (`Africa/Lagos`), `currency` (`NGN`),
timestamps + `set_updated_at()` trigger. Partial index on username.

## devices

`(user_id REFERENCES users CASCADE, fingerprint)` with
`UNIQUE(user_id, fingerprint)` for upsert. `user_agent`, `ip_address`,
`last_seen_at`, `created_at`. Index on `user_id`.

## sessions

`user_id REFERENCES users CASCADE`, `device_id REFERENCES devices SET NULL`,
`token_hash TEXT UNIQUE NOT NULL` (unique index covers lookups),
`risk_level` (`LOW`/`MEDIUM`/`HIGH`, default `LOW`), `expires_at`,
`revoked_at`, timestamps. Indexes on `user_id`, `expires_at`.

## otp_records

`identifier`, `identifier_type` (`EMAIL`/`PHONE`), `code_hash` (SHA-256),
`purpose` (`REGISTER`/`LOGIN`/`RESET`/`VERIFY_CONTACT`), `attempts` /
`max_attempts` (default 5), `expires_at`, `consumed_at`, `created_at`.
Partial index on `(identifier, purpose)` where unconsumed.

## security_events

`user_id REFERENCES users SET NULL`, `event_type`, `ip_address`,
`user_agent`, `metadata JSONB`, `created_at`. Indexes on
`(user_id, created_at DESC)` and `(event_type, created_at DESC)`.
Append-only; never updated.

## Migration workflow

1. Add `migrations/NNN_description.sql` (next number, alphabetical order).
2. Keep statements pooler-safe (no `CONCURRENTLY`, no session state).
3. Add RLS `ENABLE` + `FORCE` for any new table holding user data.
4. Run `npm run migrate` locally; confirm `Applied: <file>`.
5. Commit the migration with the code that uses it.
