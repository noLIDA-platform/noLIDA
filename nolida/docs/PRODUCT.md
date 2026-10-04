# Product brief

What NOlida is, what the words in this repo mean, and what gets built next.
Read this before naming anything: a variable, a table, a route, a marketing
sentence.

## The name

NOlida — lowercase `no`, uppercase `LIDA`, always one word. It stands for
**no** **L**imitless **I**ntelligent **D**igital **A**ssistant: the product is
deliberately *not* an open-ended assistant. It is a bounded service with a
specific job, and the name is the reminder. Never write "Nolida", "NO LIDA",
"noLida" or "no-lida". The wordmark's typography is locked in `docs/BRAND.md`.

## What the business does

- NOlida is a **digital service business**. It sells **plans** — subscription
  tiers with a price and a term. Nothing physical ships.
- When a subscription is paid for, NOlida issues a **virtual card** to the user.
  That card is the deliverable.
- Money moves in one direction only: a user funds their **wallet** through
  **fintail**, the payment processor, and subscribing **debits that wallet**.
  There is no card-on-file charge at subscribe time.
- **Eligibility rule (product law):** a user may subscribe only when their
  wallet balance covers the plan price in full. This is decided server-side,
  inside the transaction that moves the money. A client that claims otherwise is
  wrong, not merely untrusted.
- A **business** uses the dashboard to run plans, cards and earnings — and the
  dashboard opens only once its email is verified. Verification is OTP-based and
  already exists (`docs/AUTH.md`, `docs/AUTH-UI.md`), so the remaining work is
  the dashboard itself, not the gate.

## Two sides of the ledger

A person's **wallet** and a business's **earnings** are different money and live
in different tables. They are never added together, never share a column, and
there is no `users.wallet_balance`. Every balance mutation runs inside a
Postgres transaction with row locks, and every financial `POST`/`PUT`/`PATCH`
requires an `Idempotency-Key`. These are locked rules, not preferences
(`.clinerules`).

## Vocabulary

| Say | Never say | Means |
| --- | --- | --- |
| user | customer, member, account holder | a verified person; identity is one email and/or one phone |
| identifier | username, login | the email or phone a user signs in with |
| plan | product, package, tier | a priced subscription definition |
| subscription | order, membership | the user↔plan link, with status and current period |
| wallet | balance, account | a person's money, funded through fintail |
| earnings | revenue, profit | the business side of the ledger; separate tables |
| virtual card | gift card, voucher, code | the digital deliverable issued when a subscription is paid for |
| fintail | gateway, provider, processor | the payment processor that funds wallets (Phase 6) |
| session | token, JWT | the server-side cookie session, `nolida_session` |
| verification | KYC, activation | OTP proof that the user controls that email or phone |
| eligibility | affordability | wallet balance ≥ plan price, decided server-side |

## Where the build stands

| Phase | Scope | Status | Record |
| --- | --- | --- | --- |
| 0 | scaffold, env, `/api/health` | done | `docs/PHASE-0.md` |
| 1 | design tokens, UI primitives, `/design` | done | `docs/PHASE-1.md`, `docs/DESIGN.md` |
| 2 | brand assets, logo, marketing site | done | `docs/PHASE-2.md`, `docs/BRAND.md`, `docs/MARKETING.md` |
| 3 | auth backend: migrations, OTP, sessions | done | `docs/AUTH.md`, `docs/DATABASE.md` |
| 4 | auth screens + API wiring + HTTP end-to-end | **done** | `docs/PHASE-4B.md` (screens), `docs/PHASE-4.md` (wiring), `docs/AUTH-UI.md` |
| 5 | first session-gated screens: app shell, `/home`, `/profile`, settings index | **5A done**; 5B is the feed; 5C is profile editing | `docs/PHASE-5A.md`, `docs/FEED.md` |
| 6 | fintail adapter, wallet funding, balance reads | not started | — |
| 7 | publishing, posts and the activity that fills `/home` | **5B in progress** — posts, comments, follows; ranking stays chronological | `docs/FEED.md` |
| 8 | plans, subscriptions, the eligibility rule, Termii OTP delivery | not started | — |
| 9 | business dashboard and virtual-card issuance | not started | — |
| 10 | hardening: Redis rate limits, observability, launch checks | not started | — |

Phase 4 was carried out in two steps because the screens were built before the
routes existed: the slice that shipped the frontend was tracked as **4B**, and
the slice that wired it to the backend closed it. Both records stay, and each
says honestly what it did and did not prove.

Phase 5 is sliced the same way. **5A** built the frame and every destination —
the session gate, `/home`, `/profile` and the settings index — so the slices
that follow drop real content into screens that already exist and already have
a home in the navigation. **5B** then spent itself on the feed, because a shell
with nothing in it cannot be judged; profile editing was pushed to **5C**.

## Not decided yet

- How virtual cards are actually produced — no card partner is chosen, so Phase
  9 designs the adapter boundary and stops there.
- Whether "business" is a `users.role` value or a separate account type. The
  schema already carries a role column; nothing reads it yet.
- Prices, terms and quotas for the plans themselves.
- Whether fintail can push webhooks that we trust for wallet funding, or whether
  we must poll. Phase 6 answers this before any balance is written.

Work one phase at a time, run `npm run build`, then commit and push from `C:\dev`
— the repository root, not `nolida/`.
