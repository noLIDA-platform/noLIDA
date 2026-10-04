# Public Business Profile (Phase 8B)

Phase 8A gave a business owner a way to list services and products behind an
admin gate. Phase 8B gives everyone else a way to *see* an approved business:
a public profile, category listings, and business search — plus the redirect
that moves an owner off the "under review" screen the moment they are approved.

## Routes

| Route | Audience | Layout | Notes |
| --- | --- | --- | --- |
| `/business/[slug]` | Public | `(public)` | The public profile. 404 unless `status = 'APPROVED'`. |
| `/categories/[slug]` | Public | `(public)` | Approved businesses in one category, cursor-paginated. |
| `/api/businesses/[id]/status` | Signed-in owner | — | Status of one owned business. Drives the pending-page poller. |
| `/api/search?type=business` | Signed-in | — | Business results, merged into `type=all` as well. |

## The (public) layout

`src/app/(public)/layout.tsx` holds both public pages. It is deliberately
*not* `(marketing)` (full nav + marketing chrome) and *not* `(main)`
(session-gated app shell):

- Header: NOlida wordmark linking to `/` on the left. On the right, a
  signed-in visitor gets "Back to NOlida" → `/home`; a guest gets
  "Log in" + "Sign up".
- Footer: the existing `SiteFooter`, unchanged.

The header is a Server Component that reads the session itself, so the
signed-out variant renders without a client fetch or a flash of the wrong
buttons. The layout is a Server Component too — a public business profile is
not an app screen, and giving it the sidebar/top bar chrome would say it was.

## Approval status gating

**The gate lives in SQL, in one repository.**

`src/lib/server/repositories/publicBusinesses.repo.ts` is a second, public-only
repository over `businesses`. `businesses.repo.ts` is the owner-facing CRUD:
it sees every status and is called from services that check ownership. This one
never returns a row the public may not read — every function filters
`b.status = 'APPROVED'` inside its `WHERE` clause:

- `findBySlug` returns `null` for a non-approved business.
- `listByCategory`, `listFeatured`, `countByCategory`, `searchBusinesses` and
  `countBusinesses` return only approved rows.

Two consequences worth stating, because they are the reason it is done here
rather than in the service:

1. **A 404 is a 404.** The page cannot show a draft and then hide it — there is
   no window between fetch and filter. `notFound()` fires on the only value the
   service can return for "missing", so a DRAFT listing and a typo'd slug are
   indistinguishable from outside, on purpose.
2. **Pagination stays honest.** Filtering *after* a page is read means a page
   of 12 that yields 3 approved rows is a broken cursor, not a feature. The
   `limit + 1` trick only works if the status predicate is in the query.

`publicBusiness.service.ts` sits on top and adds the catalog:

```ts
getBySlug({ slug })   // → { business, services, products } | null
listByCategory({ categorySlug, limit, cursor })
listFeatured({ limit })
countByCategory(categorySlug)
getBusinessStats({ businessId })
```

`getBusinessStats` counts the same **active-only** catalog `getBySlug` returns,
so the stats row can never claim 8 services while the Services tab shows 7.
Reviews and post counts are honest zeroes until their phases land — the card
rating reads "New" rather than a fabricated 5.0 average.

## Businesses and the catalog

A business owns services and products (`migrations/008_catalog.sql`). Phase 8A
made them editable by the owner **at any status**; Phase 8B makes them publicly
visible **only for APPROVED businesses, and only when active**.

So there are two independent gates, and they are not the same thing:

- `businesses.status` decides whether the business exists publicly at all.
- `services.is_active` / `products.is_active` decide whether an individual row
  appears on a profile that already passed the first gate.

The public profile reuses the Phase 8A `ServiceCard` and `ProductCard`
components with their editing affordances omitted (`editable` defaults to
`false`). The cards were already split so the same component could serve an
owner editing a catalog and a visitor reading one.

`photos`, `socials`, `service_areas` and `hours` are free-form JSONB written by
the submission form. The profile renders them defensively — string values only,
`http(s)`-validated before a URL is put in an `href` — because the shape is
whatever an owner typed, not a schema the UI can trust. Image uploads are
deferred with Cloudinary, so the cover is a gradient band and the avatar is the
business' first letter.

## The profile page

`src/app/(public)/business/[slug]/page.tsx` is a Server Component: it fetches
through the service, calls `notFound()` on `null`, and passes fully-formed data
down. `BusinessProfileClient.tsx` owns only what genuinely needs a browser —
the tab state and nothing else. It never fetches; it renders what it was given,
including its empty states.

- **About** — description, contact links, location, service-area chips, hours.
- **Services / Products** — the Phase 8A cards, or an empty state.
- **Reviews** — "No reviews yet — Reviews are coming soon" (Phase 17).
- **Action bar** — sticky on the bottom on mobile, a side rail on desktop.
  "Message" (Phase 10) and "Book" (Phase 11) render as disabled buttons with an
  honest "Coming soon" tooltip rather than being hidden. When the viewer owns
  the business, they are replaced by "Edit business" → `/my-business`.
  Ownership is computed server-side by comparing the session to
  `business.owner.id` — the client never gets to claim it.

Tabs are client state, not routes. A profile is one document; `?tab=services` in
the URL would make the back button behave like a scroll position nobody asked
to keep.

## Category listings

`/categories/[slug]` resolves the category with `categories.repo.findBySlug`
(404 when unknown), then reads businesses through the public service.

`businesses.category` is free text the owner typed during submission, while
`categories.slug` is the canonical identifier — so the SQL matches the stored
text against **both** the slug and the category's display name, lowercased on
both sides. "Fashion" and `fashion` meet in the middle.

Pagination is the feed's `(created_at, id)` cursor, echoed through `?cursor=`.
The header count comes from `countByCategory`, not from `businesses.length`, so
it states the category total rather than the size of this page.

## Search integration

Businesses were a **stub** in Phase 6: `SearchBusiness` existed in the
discriminated union, the route's schema rejected `type=business`, and
`counts.businesses` was always `0`. Phase 8B makes them real.

- `publicBusinesses.repo.ts` gained `searchBusinesses` and `countBusinesses`.
  They use `ILIKE` on name and description, because `businesses` has no
  `search_vector` column (migration 006 built vectors for posts and profiles
  only). The day businesses get a real vector — or the day search moves to
  Meilisearch — these two functions and their callers in `search.service.ts`
  are what change. Nothing above the service notices.
- Rank is bounded to **0–1**, the same contract as posts and people: `1.0` when
  the query appears in the name, otherwise `word_similarity($1, description)`
  with the needle first (the operand order documented at length in
  `search.repo.ts`). Bounded because `type=all` merges three kinds by rank — an
  unbounded score would stack one kind above the others regardless of fit.
- `search.service.ts` fetches businesses alongside posts and people, merges
  them by rank for `type=all`, slices them for `type=business`, and reports a
  real `counts.businesses`. Counts are computed for all three kinds regardless
  of the `type` filter, which is what makes honest tabs-with-counts possible.
- The validator now accepts `type=business` and the filter panel shows a
  "Businesses" pill; `DiscoverExplorer` renders a `PublicBusinessCard` for that
  branch. Post and user search are untouched.
- `/discover` gained a **Featured businesses** section as the first discovery
  section when no query is active, fed by `publicBusiness.service.listFeatured`
  (ordered by post count, then recency) and rendered on the server page so it
  is the first thing on screen.

`PublicBusinessCard` takes `PublicBusinessCardData` — the four fields it
actually renders — so the same card serves a full `PublicBusiness` (category
pages, featured) and a `SearchBusiness` (search results). One card, three call
sites, no adapters.

## The post-approval redirect

Approval is decided elsewhere and asynchronously: an admin approves the
listing, and the owner is sitting on `/my-business/pending`. Landing there
after the fact — or refreshing minutes after approving — must not show a stale
"under review" screen over an approved business.

So the pending page is a **router first and a screen second**. The status is
resolved before anything renders:

| Status | Result |
| --- | --- |
| `APPROVED` | `redirect('/my-business')` |
| `DRAFT` / `CHANGES_REQUESTED` | `redirect('/my-business/submit')` |
| `PENDING_REVIEW` / `REJECTED` / `SUSPENDED` | Render the status screen |

The remaining case is the honest one — genuinely waiting. `StatusPoller`
(client component, renders nothing) calls `GET /api/businesses/[id]/status`
every 15 seconds and calls `router.refresh()` the moment the status differs
from what the server rendered.

`router.refresh()` rather than a client-side `router.push()` is the important
detail: the page is a Server Component and *it* owns the redirect rule.
Refreshing re-runs it, and the branch above then fires. The rule lives in one
place instead of being duplicated as a client-side push that could drift.

`GET /api/businesses/[id]/status` verifies ownership against the session and
never against the id in the URL — a business id is not proof of anything, and
`NOT_FOUND` (not `FORBIDDEN`) for someone else's business keeps the endpoint
from confirming that a given id exists at all.

## Deferred

- Reviews (Phase 17) — the tab is a placeholder; the rating reads "New".
- Messaging (Phase 10) and booking (Phase 11) — disabled buttons on the action
  bar.
- Photo uploads (Cloudinary) — gradient cover, initial-letter avatar.
- Admin approval UI — the existing `/admin` route and approval service are
  unchanged; Phase 8B only adds the public side and the redirect.