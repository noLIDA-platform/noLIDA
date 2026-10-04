# Business Request Flow (Phase 7E)

Phase 7 asked business owners to leave the app: message NOlida on WhatsApp,
wait for a human, receive a code, come back, type the code in. This phase puts
the whole thing in-app. The user fills in a short form, the server does the
work, and a code is on screen before they have put their phone down.

## The flow

```
/list-your-business
   │
   ├─ form      "List your business on NOlida"
   │              name · category · contact email · description
   │
   ├─ loading   spinner + "Generating your code…"  (≥ 3 seconds)
   │
   ├─ success   the code, large and monospaced, with Copy
   │              "Continue to business details" → /my-business/submit
   │
   └─ error     the message, and Try again
```

Four states, one Client Component (`BusinessRequestFlow`), no navigation in the
middle. The code is shown **on this screen** rather than on a confirmation
page: navigating away and back to display it would mean storing it somewhere
(URL, router state, a refetch) for no benefit.

## Why the 3-second minimum

The API returns in well under a second. Without a floor, the code would flash
up almost instantly and the step would be invisible — the user has just typed
their business name and sees, effectively, nothing happen.

`MIN_DELAY_MS = 3000` in `BusinessRequestFlow.tsx` is enforced like this:

```ts
const startedAt = Date.now();
const result = await apiFetch("/api/businesses/request", { … });
await wait(Math.max(0, MIN_DELAY_MS - (Date.now() - startedAt)));
```

Two things worth being explicit about:

1. **It is a floor, not a pause.** A slow response simply extends the wait. The
   timer can never *shorten* it, so the code is never shown early.
2. **Nothing is faked.** The server does not sleep and no work is deferred.
   The code genuinely exists in the database before this timer starts — the
   delay is presentation, and the progress bar is a CSS animation over a fixed
   duration, `aria-hidden`, not real progress.

The progress bar's `animation-duration` in `BusinessRequestFlow.css` duplicates
`MIN_DELAY_MS`. CSS cannot read the constant, so the two must be changed
together. Nothing gates on the bar; the JS timer is what holds the stage.

## What the server does

`POST /api/businesses/request` → `businessRequest.service.requestBusinessAccess`.

Everything is one `withTransaction`. Six writes:

| # | Write | Table |
|---|---|---|
| 1 | The authorization code | `authorization_codes` |
| 2 | Its use count and `status = 'USED'` | `authorization_codes` |
| 3 | The usage record | `authorization_code_usage` |
| 4 | The DRAFT business | `businesses` |
| 5 | The ownership row | `business_owners` |
| 6 | The request record + security event | `business_requests`, `security_events` |

Split across connections, a failure halfway leaves a user with a code that
leads nowhere, or a DRAFT business with no code behind it — and neither is
recoverable from the UI. Inside one transaction the flow is all-or-nothing.

**The audit writes take the transaction client.** `authorizationCodes.repo.logUsage`
and `securityEvents.repo.log` gained an optional `db` parameter for exactly this:
on the pool they run on a different connection, so they would survive a rollback
and leave a usage record for a code that no longer exists. Both are additive
optional parameters; every existing caller is unchanged.

### The code is created already spent

`max_uses = 1`, `uses_count = 1`, `status = 'USED'`.

The code is a **receipt, not a credential**. It proves this user was granted a
listing, and it is already attached to the business it created. Had it been left
`ACTIVE` it would be a second, transferable authorization — anyone who glimpsed
it on a shared screen could redeem it for their own business.

`authorizationCodes.repo.create` cannot set `status` or `uses_count`, so those
are written immediately afterwards, inside the same transaction, leaving no
window in which the code is redeemable.

### Idempotency

A user who already has a `DRAFT` or `CHANGES_REQUESTED` business has used this
flow before. The service returns the existing business rather than creating a
second one — `businesses` has no unique constraint on owner, so a duplicate is
possible, and `findByOwner` would then return whichever row sorted first, which
is not necessarily the one just written.

A fresh code is still issued in that case, because the caller asked for one and
the UI has to show something. It points at the existing business.

`APPROVED` or `PENDING_REVIEW` throws `USER_ALREADY_HAS_BUSINESS` → HTTP 409.
409 rather than 400: the request was well-formed and understood, it conflicts
with existing state. A 400 would blame the user's input for something they did
not do wrong.

### Validation is three layers deep

1. **zod** in `businessRequestSchema` (route).
2. **`validate()`** in the service.
3. **CHECK constraints** in migration 009.

The route is the first gate, not the only one. A zod schema in a file one
import away from a second caller is not a guarantee, and this service is
reachable from a future admin tool or a script.

## The `business_requests` table

```sql
business_requests(
  id, user_id → users, business_name, category, contact_email,
  description, code_id → authorization_codes, status, created_at
)
```

One row per submission — what the user asked for, which code it produced, and
where that code ended up.

`code_id` is `ON DELETE SET NULL` on purpose. Authorization codes are an
operational table that will eventually be pruned or rotated; deleting a code
must not delete the history of the request that created it. The request row is
the durable record, the code is the receipt.

`APPROVED_INSTANT` is the default because in this flow a request always yields
an immediately-generated code. `PENDING_REVIEW` and `REJECTED` exist so a later
moderated flow does not need a migration just to record its outcome.

## How this differs from the Phase 7 flow

| | Phase 7 | Phase 7E |
|---|---|---|
| Getting a code | Message on WhatsApp, wait for a human | Type four fields |
| Entering the code | Type it into `RedeemCodeForm` | Nothing — it is already applied |
| Where the code lives | In a chat log | In the database, attached to the business |
| Who creates the DRAFT | `createBusinessDraft` after a separate redeem | Inside the same transaction |
| Audit trail | `authorization_code_usage` only | + a `business_requests` row and a `BUSINESS_REQUEST_CREATED` event |
| Abuse surface | Code guessing, bounded by `max_uses` | Rate limited per user (10/hour) |

## Admin-issued codes still work

`POST /api/businesses/redeem-code`, `authorization.service.redeemCode` and the
`RedeemCodeForm` component are all **unchanged and still functional**. The new
endpoint is additive.

`RedeemCodeForm` is currently rendered by no page — it is kept deliberately,
per the phase constraints, because codes issued before this phase (or by an
admin out of band) have to remain redeemable, and deleting the only UI for that
path would strand anybody holding one.

