# My Business Dashboard (Phase 8C)

Phase 8B gave the public a face to put to a business. Phase 8C gives the owner
the screen to actually run it: a dashboard with real numbers, an editable
profile, and — labelled honestly — the eleven sections that do not exist yet.

## The dashboard layout

```
/my-business
├── (dashboard)/        ← the shell: header, quick actions, tabs, content
│   ├── layout.tsx      ← the approval gate
│   ├── page.tsx        ← Overview (real data)
│   ├── profile/        ← edit an approved business (real)
│   ├── posts/          ← the Phase 5B Feed (real)
│   ├── services/       ← Phase 8A (real)
│   ├── products/       ← Phase 8A (real)
│   ├── settings/       ← grouped links (real)
│   └── …11 placeholders
├── submit/             ← outside the shell
└── pending/            ← outside the shell, with its 15s poller
```

### Why `(dashboard)/` is a route group

The obvious place for this layout is `my-business/layout.tsx`. It cannot go
there. A Next.js layout wraps everything beneath it, so it would also wrap
`/my-business/submit` and `/my-business/pending` — and the layout's own
redirect sends a DRAFT business to `/my-business/submit`, which lands back in
the layout and redirects again. Next.js throws on that loop, so the dashboard
would be unreachable rather than merely awkward.

The `(dashboard)` route group fixes it. A route group contributes to the URL
only by its *absence*: every route inside it is still exactly
`/my-business/…`, so **no URL changed**, and `submit` / `pending` sit outside
the shell. The Phase 8A `services/` and `products/` directories were moved into
the group with `git mv` (history preserved); the only edit they needed was
`../catalog.css` → `./catalog.css`.

### Why a tab bar and not a second sidebar

The app already has a sidebar — `DesktopSidebar` carries Home, Discover,
Create and the rest. A second vertical rail inside the content area would put
two competing navigation columns side by side and squeeze the My Business one
into whatever width the main column had left.

The tab bar also matches what the thing *is*: sixteen sections of one business,
not sixteen peers of the app. It scrolls horizontally below 768px and wraps
above it. It reads the active route from `usePathname`, so the server page
never has to re-derive the route it just rendered.

`MY_BUSINESS_TABS` lives in `src/lib/nav/items.ts` beside `SIDEBAR_ITEMS`,
because "a destination is declared once" applies to a tab bar as much as to a
sidebar. Each entry carries `placeholder?: boolean`, which is what draws the
"soon" dot — eleven of the sixteen are placeholders, and saying so in the
navigation is more honest than a tab that opens onto an empty page.

## The approval gate

`getMyBusiness(session.user.id)` → status → redirect. There is no business id
in the URL anywhere in this flow, so there is nothing for a client to tamper
with.

| Business state | Where the owner goes |
| --- | --- |
| No business | `/list-your-business` |
| `DRAFT`, `CHANGES_REQUESTED` | `/my-business/submit` — finish and send it |
| `PENDING_REVIEW`, `REJECTED`, `SUSPENDED` | `/my-business/pending` — status UI, and a 15s poller while pending |
| `APPROVED` | The dashboard |

The rule is "send them to the screen that can move this forward". A DRAFT owner
in an overview full of zeroes learns nothing; the submission form is where the
work happens. The pending page's own redirect (Phase 8B) means an owner who
approves mid-session lands on `/my-business` without touching this file.

## Overview — what is real

| Section | Source |
| --- | --- |
| Business health | The business row: name, category, location, status badge, link to `/business/[slug]` |
| Services / Products | `getOwnerDashboardStats` — active-only counts |
| Bookings / Revenue | **Hard-coded zeros, marked "Coming soon"** |
| Profile completion | `profileTasks` over the business row + the two counts |
| Recent activity | Last 5 of services ∪ products, sorted by `created_at` |
| Performance | Empty dashed frame with a "Coming soon" badge |

Bookings and Revenue are the whole point of the phase: they render as `0` and
`₦0` because a labelled zero is honest and an unlabelled one is a bug waiting
to be believed. This is the same rule as "badges render only above zero" and
"never fake data on a placeholder".

`getOwnerDashboardStats` deliberately reads the same **active-only** rows as
`getBusinessStats` (Phase 8B), so the overview can never claim eight services
while the public profile shows seven.

### Profile completion

`profileTasks` returns seven checks — name, category, description, phone or
email, location, one service, one product — and `profileCompletionPercent`
turns them into the bar's percentage.

Both are exported from `publicBusiness.service.ts` as pure functions of data
already fetched for the stat cards, rather than re-querying. The description
threshold is 50 characters: the database accepts any length, but three words is
not a description a customer can act on, so the bar is stated in the UI.

The percentage exists only as a summary. "43% complete" tells an owner nothing
about what to do next; "Write a description" does — which is why the checklist
is the section's real output.

## Profile editing

`/my-business/profile` reuses `BusinessSubmissionForm` with
`mode="edit"` and `initialValues`.

Two changes were needed on the way:

1. **`initialValues`** — the form previously started blank. An edit form that
   opens empty is an owner retyping their own details to change one character.
2. **`mode`** — `"edit"` saves and stays; `"submit"` still saves, queues for
   review, and routes to `/my-business/pending`.

### Editing an APPROVED business

`updateBusiness` used to reject anything outside DRAFT / PENDING_REVIEW /
CHANGES_REQUESTED. Without widening it, the new Profile page would have looked
perfect and failed on its first save with "This business cannot be edited in
its current state". So the set was split in two:

- **`BUSINESS_STATUS_EDITABLE`** — where a row may be written. `APPROVED` was
  added: an approved owner must be able to fix a typo in their phone number.
- **`BUSINESS_STATUS_SUBMITTABLE`** — where a *submission* may be queued.
  `APPROVED` is **not** in it.

The second set is the important one, and it closed a pre-existing hole.
`submitBusiness` writes `status = 'PENDING_REVIEW'` directly and had **no
status guard at all**. Calling it on an approved business would pull a live
public profile offline — the listing would vanish from `/business/[slug]` and
from search the moment an owner double-clicked Submit or replayed a request.
It now throws `BUSINESS_NOT_SUBMITTABLE`.

What stays locked even for APPROVED, and why the widening is safe:

- **`status` is never client-writable.** `updateBusiness` writes only the
  columns in `normalizeBusinessInput`; there is no `status` key to set. Promotion
  to APPROVED still happens only through `approveBusiness`, which requires an
  admin and writes an `approval_records` row.
- **Slug changes are still uniqueness-resolved** (`resolveUniqueSlug`), so an
  edit cannot collide with another business or break the unique index.

## Posts

`/my-business/posts` renders the Phase 5B `<Feed feedType="user">`.

**This filters by `user_id`, not by business, and that is temporary.**
`posts.business_id` exists in the schema — migration 005 reserved it without a
foreign key — but nothing writes it, because the composer's business picker is
a later phase. `WHERE business_id = $1` would return an empty page forever,
which reads as broken. Filtering by `user_id` is the honest approximation for
today; when posts gain a `business_id` writer this switches to a
`getBusinessPosts` call and the UI does not change.

`getUserPosts` still applies the real `VISIBLE_TO_VIEWER` predicate, so an owner
sees their own PRIVATE posts and nothing else they may not.

## Quick actions

One scrolling row above the tabs: Create Post, Add Service, Add Product, View
Bookings, View Messages, View Analytics, Withdraw Earnings. Every one is a
navigation and nothing mutates.

Actions whose destination is a placeholder use a dashed border and say so. An
owner looking for Bookings should learn that it exists and is not ready —
hiding it reads as "NOlida has no bookings", which is a different and wrong
claim.

`Add Service` and `Add Product` link to `?new=1`, and `ServicesClient` /
`ProductsClient` open their create form on arrival. Without it, clicking
"Add service" and then "Add service" asks the same question twice. The read is
in a `useEffect` guarded by a ref rather than in a `useState` initialiser:
`useSearchParams` is empty during SSR, so seeding initial state from it would
hydrate "form closed" over "form open".

## Sub-pages: real vs placeholder

| Tab | Route | Status |
| --- | --- | --- |
| Overview | `/my-business` | **Real** — services, products, completion, activity |
| Profile | `/my-business/profile` | **Real** — `mode="edit"` |
| Posts | `/my-business/posts` | **Real** — Phase 5B Feed, by `user_id` |
| Services | `/my-business/services` | **Real** — Phase 8A |
| Products | `/my-business/products` | **Real** — Phase 8A |
| Settings | `/my-business/settings` | **Real** — grouped links |
| Reviews | `/my-business/reviews` | Placeholder (Phase 17) |
| Bookings | `/my-business/bookings` | Placeholder (Phase 11) |
| Messages | `/my-business/messages` | Placeholder (Phase 10) |
| Orders | `/my-business/orders` | Placeholder |
| Customers | `/my-business/customers` | Placeholder |
| Requests | `/my-business/requests` | Placeholder |
| Quotes | `/my-business/quotes` | Placeholder |
| Earnings | `/my-business/earnings` | Placeholder (wallet) |
| Payouts | `/my-business/payouts` | Placeholder (payments) |
| Analytics | `/my-business/analytics` | Placeholder |
| Promotions | `/my-business/promotions` | Placeholder |

Nine of them render through `ComingSoonPanel`, which takes only icon, title and
description — eleven copies of the same three elements would be eleven chances
to miss a wording fix.

What each becomes:

- **Bookings** — Phase 11. Backed by the "Book" button already sitting
  disabled on the public profile.
- **Messages** — Phase 10. Backed by the "Message" button on the same rail.
- **Reviews** — Phase 17. Rating appears only after a customer's first
  completed booking or order; until then the public profile reads "New" rather
  than a fabricated 5.0, and this page agrees with it.
- **Orders / Customers / Requests / Quotes** — the commerce pipeline, once
  payments exist.
- **Earnings / Payouts** — the wallet and payments systems. Business earnings
  stay in their own table, separate from any personal balance.
- **Analytics** — views, bookings and revenue over time.
- **Promotions** — promotions and sponsored posts.

## Settings

A grouped index, not a form: every row links to the screen that owns that
setting. Profile fields live on `/my-business/profile`; notification
preferences are a *personal* setting and correctly stay under
`/settings/notifications`.

**Unpublish** is a disabled button with a tooltip naming the route to it
(contact support). Unpublishing sets the business to UNPUBLISHED and pulls the
public profile offline — irreversible from the owner's side, and exactly the
kind of action that must be deliberate. No API accepts it yet. A disabled
button with no explanation is the worst of both worlds; one that says "contact
support" tells the owner what to do next.