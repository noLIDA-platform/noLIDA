# Requests & Responses (Phase 9)

The request-first marketplace: a person says what they need, businesses send
offers, the person picks one. This is the core loop NOlida exists for.

```
person posts a request ──▶ a REQUEST_POST appears in the feed
        │
        ▼
approved businesses send offers (one per business)
        │
        ▼
the owner accepts one ──▶ request becomes IN_PROGRESS, every other offer DECLINED
        │
        ▼
Phase 11: the quote and booking flow opens
```

---

## A request is not a post

`requests` is its own table. Creating a request also writes a `REQUEST_POST` row
so the request is discoverable in the ordinary feed, but the lifecycle — offers,
acceptance, closing — lives only in the requests tables.

Both rows are written in **one transaction**. A request with no feed post is
invisible; a feed post pointing at a rolled-back request is a dead link in
somebody's home feed. Neither half is useful alone.

The feed post carries `metadata: { requestId }`. `PostCard` reads that and renders
a "Request" badge plus a **View request** link. It does not fetch the request
itself — the feed would pay for a request lookup per row.

## Statuses

```
OPEN ──────────▶ IN_PROGRESS ──▶ FULFILLED
  │                   │              (closed by the owner)
  ├──▶ CLOSED          │
  └──▶ CANCELLED       └──▶ CLOSED / CANCELLED
```

| Status | Accepts new offers? |
| ------ | ------------------- |
| `OPEN` | Yes |
| `IN_PROGRESS` | Yes — you can change your mind and accept a different offer |
| `FULFILLED` | No |
| `CLOSED` | No |
| `CANCELLED` | No |

Accepting is allowed from `IN_PROGRESS` as well as `OPEN`, so a customer can
pick a different business. That is why `declineOthers` includes `'ACCEPTED'` in
its `WHERE` clause: without it, a second acceptance leaves **two** responses
marked `ACCEPTED` and nothing says which one the customer chose.

## Who can respond

**Only a user with an APPROVED business.** Enforced in three places:

1. `respondToRequest` resolves the business from the **session** via
   `getApprovedBusinessForUser`.
2. There is no `businessId` field in the response body — a body field would let
   any signed-in user answer as any business in the database.
3. The database constraint `one_response_per_business` stops a second offer.

The request owner cannot respond to their own request, and only one offer per
business per request is allowed.

A `PENDING_REVIEW` or `DRAFT` business cannot respond. Somebody halfway through
approval should not be collecting work before they are allowed to trade.

## Who can see the offers

**Only the request owner.** Everyone else — including competing businesses —
gets the count plus their own offer.

This is the one rule the whole feature depends on. A business reading its rivals'
prices on the same request turns a marketplace into a price-comparison site.
The filter lives in `listResponses` in the service, never in the page, because a
page-level filter is one somebody can route around.

The count *is* exposed. Knowing a request has four offers is what tells a
business it is worth answering.

## The composer

Four labelled sections on **one page**, not a wizard. A wizard makes people page
through steps to discover what is being asked, and a request is four short
answers — somebody who needs an AC repairer tomorrow should not click through a
carousel to say so.

| Section | Fields |
| ------- | ------ |
| What do you need? | Title (5–200), description (10–5000), category |
| Where and when? | Location, needed-by date, urgency |
| Budget *(optional)* | Min, max — in naira |
| Photos *(optional)* | Up to 3, uploaded straight to Cloudinary |

Every bound shown comes from `@/lib/requests/constants`, the same numbers the
server validates against. A counter that disagrees with the limit it counts
towards is worse than no counter.

Urgency carries a hint — "Needed as soon as possible — usually today or
tomorrow" — because "Urgent" alone means different things to different people.

## Money

Requests are in **major units** (naira). `50000` is ₦50,000, in the composer, in
the API and in the column.

Products and services use *minor* units (kobo). The two are deliberately
different: a budget is an estimate somebody types in their head, and kobo
precision on it would be a precision nobody asked for and every reader would
misread. `formatMoney` in `@/lib/requests/constants` takes the value untouched —
do not "fix" it to match the catalog.

A missing budget renders as **"Budget flexible"**, not as a blank. Leaving it
out is a real answer.

## API

All routes require a session, validate with zod, and return
`{ ok: true, data }` / `{ ok: false, error }`.

| Method | Path | Notes |
| ------ | ---- | ----- |
| `POST` | `/api/requests` | Creates the request **and** its feed post. 10/hour. |
| `GET` | `/api/requests` | Open feed. `limit`, `cursor`, `categoryId`, `location`, `urgency` |
| `GET` | `/api/requests/mine` | Scoped to the session; no id in the path or query |
| `GET` | `/api/requests/[id]` | Returns `isOwn`, `canRespond`, `hasResponded` alongside |
| `PATCH` | `/api/requests/[id]` | Owner, and only while `OPEN` |
| `POST` | `/api/requests/[id]/close` | `{ status }` — `CLOSED`, `CANCELLED`, `FULFILLED` |
| `POST` | `/api/requests/[id]/responses` | The business comes from the session |
| `GET` | `/api/requests/[id]/responses` | Owner sees all; a visitor sees only their own |
| `POST` | `/api/requests/[id]/responses/[responseId]/accept` | Owner only |
| `DELETE` | `/api/requests/[id]/responses/[responseId]` | Withdraw your own, while `PENDING` |

An offer id that belongs to a different request is a **404, not a 403** — "it
exists but not for you" is itself an answer worth withholding. Same rule as
private posts.

`GET /api/requests/[id]` deliberately returns the viewer's standing alongside the
request, so the page never re-derives a rule that lives in the service.

## In the feed

`createRequest` writes a `REQUEST_POST` with `metadata: { requestId }` in the same
transaction as the request.

`PostCard` checks `post.type === "REQUEST_POST"` and reads
`metadata.requestId`, rendering a "Request" badge and a **View request** link.
The id is type-checked at read time — the column is free-form JSONB, and anything
could be in it. A non-string is treated as absent, which leaves an ordinary post
rather than a link to `/requests/undefined`.

## Race conditions

**Two taps in the same second.** Both pass `hasResponded`, then both insert. The
unique constraint stops the second, and `respondToRequest` catches the `23505`
and returns the same sentence the check above would have — rather than an opaque
constraint violation to the user.

**Counter underflow.** A withdrawal racing a delete could drive
`response_count` below zero. The update is clamped with `GREATEST(0, …)`.

## After acceptance

Acceptance moves four things in **one transaction**:

1. the chosen response → `ACCEPTED`
2. every other response → `DECLINED`
3. `requests.accepted_response_id` → set
4. the request → `IN_PROGRESS`

Doing any of them alone leaves a state nobody can explain.

**No conversation is created.** Messaging is Phase 10, and opening a thread the
customer did not ask for is that phase's decision to make. This phase leaves the
door open for the quote/booking flow (Phase 11) and nothing else.

`ResponseCard` refreshes the router after accepting or withdrawing rather than
updating optimistically: an accept flips four things across two tables, so
painting the new state locally and then finding out the transaction failed would
leave the customer looking at a choice they did not make.