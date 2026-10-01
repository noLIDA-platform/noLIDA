# Phase 6 — Search and Discovery

Search across posts and people, and a `/discover` screen worth landing on before
you have typed anything.

Two things in here are easy to get wrong, and cost real time to get right: the
trigram fallback (it has an operand order that silently returns nothing) and the
fact that results are merged from two unrelated tables, so pagination cannot be a
cursor.

---

## Why Postgres, and why `simple`

Search runs on `pg_trgm` and `to_tsvector` inside Postgres. No extra service, no
index to keep in sync, and — decisively — the visibility rules stay in SQL next
to the rows they guard.

`'simple'` is the text search configuration, deliberately. The English one
applies a stemmer and an English stopword list, which quietly breaks a product
for Nigeria: it removes words like `"me"` and `"no"` that appear inside Yoruba
and Hausa names and business names. With `simple`, `photography` is the lexeme
`photography`, and a user searching `Chukwuemeka` gets a prefix match instead of
a mangled one.

The trade-off is losing stemming, so `photograph` does not match `photography`.
That is the right trade at this scale, and the trigram arm picks up some of the
slack.

## Migration `006_search.sql`

- `posts.search_vector` — `body` + `location`, weighted `A`/`B`.
- `profiles.search_vector` — `display_name`, `username`, `full_name`, `bio`.
- GIN indexes on both, plus `gin_trgm_ops` on the body text, which is what the
  fuzzy arm uses.
- Insert **and** update triggers on both tables.

The triggers matter more than they look. A search_vector populated only on insert
goes stale the moment somebody edits a post, and the failure is invisible:
searches keep returning the old text. `scripts/test-search.ts` covers the update
path directly.

## The trigram fallback — read this before changing it

Fuzzy search uses `<%` (word similarity), **not** `%`, and the operands are in a
specific order. Both are load-bearing:

1. `%` compares two strings *as a whole*. For `"photograpy"` against
   `"New photography studio opening in Lagos next month."` that scores **0.18**,
   because the long string is full of perfectly good trigrams the short query
   does not contain. `<%` asks the question a human means — does *any word* in

## Visibility

Search reuses the feed's visibility predicate — `VISIBLE_TO_VIEWER`, extracted to
`src/lib/server/repositories/visibility.ts` and shared with `posts.repo.ts`. A
post that is `PRIVATE` or `FOLLOWERS` cannot appear in anyone's search results
except the people entitled to see it, and that is enforced in the `WHERE` clause
rather than by filtering a page of results afterwards.

The counts respect this too. `counts.posts` is the number of posts the *viewer*
may see, not the number in the database — otherwise the count itself leaks the
existence of a private post.

## Two tables, one result list, therefore offset pagination

A search returns posts and people in one ranked list. The two come from separate
queries, because they have separate indexes and separate ranking, and they are
merged in the service by `rank`.

That merge is why search paginates by **offset** and not by the `(created_at,
id)` cursor the feed uses. A cursor has to order by a key that is unique and
stable across the merged set; `created_at, id` is meaningless across two tables
that do not share an id space, and relevance order has no stable key at all. So
`LIMIT n OFFSET m` it is, with `MAX_OFFSET = 500` — past that a result set is
deep enough that nobody scrolls to it, and an unbounded offset is a cheap way to
make a database slow.

`nextCursor` is the next offset as a string. It is named for what the client does
with it rather than shipping `hasMore` and a separate number.

## Ranking

- Full-text hit → `1.0`.
- Otherwise `word_similarity(query, body)`.
- `recent` and `popular` ignore rank entirely and use `created_at DESC, id DESC`
  or `like_count DESC, created_at DESC, id DESC`.

`id DESC` is always the final tiebreak, so two equally-liked posts of the same
age never swap places between page loads.

## API

### `GET /api/search`

| Query param | Notes |
| --- | --- |
| `q` | 1–120 characters after trimming. |
| `type` | `all` \| `post` \| `user`. `business` is not exposed yet. |
| `sortBy` | `relevance` (default) \| `recent` \| `popular`. |
| `location` | Case-insensitive substring on `posts.location`. |
| `limit` | 1–50, default 20. |
| `offset` | 0–500. |

```json
{
  "ok": true,
  "data": {
    "results": [
      { "type": "post", "id": "…", "body": "…", "rank": 1, "author": {} },
      { "type": "user", "id": "…", "username": "amara",
        "is_following": false, "rank": 0.82 }
    ],
    "counts": { "posts": 3, "users": 1, "businesses": 0 },
    "nextCursor": "20"
  }
}
```

`is_following` is computed per viewer in the same query as the results. It is not
decoration: without it every person card says "Follow", a tap silently does
nothing, and there is no way to see that you already follow someone.

### `GET /api/discovery`

## UI

- `/discover` is a **Server Component** that reads the session and `?q=`, then
  renders the `DiscoverExplorer` client island. That is what makes the desktop
  top bar's plain GET form work end to end: submitting it navigates to
  `/discover?q=…` and results exist on the first render rather than after a
  hydration round-trip.
- The page passes `key={initialQuery}` so submitting the top bar form *while
  already on* `/discover` re-runs the search instead of leaving stale results.
- Components live in `src/components/discover/`: `SearchBar`, `FilterPanel`,
  `PostResultCard`, `UserResultCard`, `DiscoverySection`, `DiscoverExplorer`.
- Typing is debounced 300ms; Enter and the clear button flush immediately.
  Waiting for a pause only helps when you are mid-word.
- Requests carry a token, so a slow response cannot overwrite a newer one — type
  "lag", pause, clear the box, and the late response for "lag" must not paint.
- `/profile/[id]` is a minimal read-only view of someone else's profile, reached
  from search and from the follow button. The visitor's own profile redirects to
  `/profile`, which has the richer card. A person who does not exist and a
  suspended account both 404, for the same reason private posts 404 elsewhere.

## Testing

```bash
npm run test:search
```

Seeds its own accounts, posts, likes and follows, then deletes all of it. Covers
full-text, the trigram fallback (twice, on two different posts, so one green case
cannot hide a one-off), the private-post guarantee from both sides of the fence,
counts, type and location filters, sorting, offset pagination, the follow flag,
and both discovery feeds.

Run `npm run test:feed` too — `posts.repo.ts` now shares its visibility predicate
with search.

## Deferred, deliberately

- **Businesses in search.** `business` exists in `SearchResultType` and there is
  a repository function, but the public route accepts only `all | post | user`.
  Searchable businesses are Phase 8; offering the filter now would return an
  empty list that looks broken.
- **Meilisearch / Typesense.** Isolated behind `search.repo.ts` and
  `search.service.ts` precisely so it can be swapped in without touching a
  component or a route. Nothing above those two files knows how search works.
- **A genuinely public `/discover`** and public profile pages. Different privacy
  rules, and a separate decision.
- **Hashtags and @mentions.** These want `to_ts('english')` prefix indexes, and
  `english` prefix indexes do not mix with the `simple` config chosen here.
- **Ranking beyond relevance and recency.** No popularity decay, no personalised
  ranking, no boosting of followed accounts.
- **Infinite scroll.** "Load more" pages instead, because the offset boundary is
  the honest primitive here.


No parameters. Trending posts (last 7 days, most liked), suggested users
(most-followed accounts the viewer does not follow yet), and recent posts — all
through the same visibility rules. Empty arrays rather than fabricated content
when there is nothing to show.

   this text look like my query — and scores **0.82**.

2. `<%` means "the first argument, compared against any continuous extent of the
   second". So it is **`$2 <% p.body`** (needle first), not `p.body <% $2`.
   Written the other way round it scores the entire post against a short word,
   returns false even when a perfect match is sitting inside the text, and fuzzy
   search looks broken for no visible reason.

Both forms use `posts_body_trgm_idx`: `>%=` is the index-supported commutate of
`<%`.

### What the fuzzy arm does and does not catch

The threshold is Postgres's default `pg_trgm.word_similarity_threshold = 0.6`.
Measured against `"Laptop screen replacements while you wait."`:

| Query | Kind | Score | Match? |
| --- | --- | --- | --- |
| `laptop` | exact | 1.000 | yes |
| `laptob` | transposition | 0.714 | yes |
| `replacments` | transposition | 0.667 | yes |
| `laptpo` | **deletion** | 0.571 | no |
| `sreen` | deletion | 0.500 | no |
| `repairs` | real word, absent | 0.375 | no (correct) |

Transpositions and plural changes are caught comfortably. A one-character
**deletion** is not, and that is a known property of trigram scoring rather than
a bug: dropping one letter from a six-letter word destroys a third of its
trigrams.

Lowering the threshold to 0.5 would catch deletions, but it is a database-wide
GUC that every current and future `<%` query would inherit, and it drags
unrelated-but-close words through the index with it. Taking that decision is not
worth doing by accident inside a migration. If a real user needs deletions to
match, the fix is a lower threshold chosen deliberately, with this table
re-measured — or a proper search engine, which is the eventual answer anyway.