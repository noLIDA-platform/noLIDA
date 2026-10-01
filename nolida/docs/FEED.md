# Feed, posts and interactions

The social layer: posts, comments, and the six things you can do with them.
Written in Phase 5B.

This is the reference for **how the feed works**. For the tables, read
`docs/DATABASE.md` and migration `migrations/005_posts_social.sql`; for the
app shell the feed sits inside, read `docs/PHASE-5A.md`.

## Post types

Every post carries a `type`. The composer currently posts `GENERAL_POST`; the
other values exist so a post's purpose is data rather than a guess from its
prose, which is what makes later filtering possible without re-reading bodies.

| Type | For |
| --- | --- |
| `GENERAL_POST` | Anything that does not fit the rest. The default. |
| `BUSINESS_POST` | Announcements from a business account. |
| `SERVICE_POST` | Something you offer — "I fix laptops", "cakes for hire". |
| `PRODUCT_POST` | A specific item for sale. |
| `REQUEST_POST` | Something you want — "looking for a generator". |
| `OFFER_POST` | An offer that is not a service or a product. |
| `AVAILABILITY_POST` | "I am free on Thursday", "slots left this week". |
| `JOB_REQUEST_POST` | Hiring. |
| `ANNOUNCEMENT_POST` | Formal news from an account. |
| `RECOMMENDATION_POST` | "You should try this place", a tip. |

The set is enforced by a CHECK constraint in the database, by the service, and
by the request schema. A new type needs all three, in that order.

## Visibility

| Visibility | Who can read it |
| --- | --- |
| `PUBLIC` | Anyone signed in. |
| `FOLLOWERS` | The author and people who follow them. |
| `PRIVATE` | The author only. |

Visibility is decided **in SQL**, by the `VISIBLE_TO_VIEWER` predicate in
`src/lib/server/repositories/posts.repo.ts`, and it is the same predicate in
every place a post can appear — the home feed, a user's posts, the saved list,
and the single-post lookup. A route never loads a post and filters it
afterwards: a post someone may not read must never have been read at all.

The practical consequence is that a `PRIVATE` post cannot be discovered by
anyone else. `GET /api/posts/[id]` answers `404` for it, not `403` — telling
someone a post exists but is off-limits is itself a disclosure.

## The feed algorithm

**Strictly chronological.** `created_at DESC, id DESC`. No ranking, no scoring,
no engagement weighting — not because those are never wanted, but because a
chronological feed is the one thing a new user can predict, and a feed you
cannot predict is impossible to design against.

When ranking does arrive it belongs behind this file: a repository swap, not a
rewrite, because every caller goes through `getHomeFeed`.

A viewer's home feed is:
- `PUBLIC` posts from anyone
- `FOLLOWERS` posts from people they follow
- their own posts, at any visibility

## Pagination

Cursor pagination on a compound key: `(created_at, id)`.

`id` is not decoration. Two posts can share a `created_at` — the column has
microsecond precision but not uniqueness — and a cursor on the timestamp alone
would skip or repeat a post at every page boundary. `id` makes the ordering
total.

A cursor is that pair flattened to `<ISO timestamp>|<uuid>` and handed to the
client, which only ever echoes it back. Cursors are opaque on purpose: a
malformed one means "start from the top", not an error.

The repositories ask for `limit + 1` rows. The extra row is the proof there is
## Why media uploads are deferred

`posts.media` exists as a `JSONB` column and the composer shows Photo and Video
buttons — disabled, with a note.

That is the whole of Phase 5B's media story, and it is deliberate. Uploading
needs somewhere to put the bytes: an object store and a CDN, with signed URLs,
transformations and a cost per gigabyte. NoLIDA has none of that yet, and
pretending otherwise would mean either storing binaries in Postgres or shipping
a composer that accepts files and silently drops them.

The disabled buttons are not an apology. The position of a control in a composer
is a design decision worth making now; the thing behind it is an engineering
decision that needs a provider. A hidden button would make the composer look
finished when it is not, and a fake upload would be worse still.

When Cloudinary is configured, the work is: an upload endpoint returning a signed
response, a `media` JSON shape agreed once and stored as-is, and rendering that
JSON in `PostCard`. The column and the buttons are already there.

## API

Every route returns `{ ok: true, data }` or `{ ok: false, error: { code, message } }`,
reads the session from the cookie, and answers `401` when there is no live one.
Mutating routes are rate-limited per user.

### Feed

| Route | Returns |
| --- | --- |
| `GET /api/feed?limit=&cursor=` | `{ posts, nextCursor }` |
| `GET /api/feed/user/[userId]?limit=&cursor=` | `{ posts, nextCursor }` |
| `GET /api/feed/saved?limit=&cursor=` | `{ posts, nextCursor }` |

A post in the response is the post plus its author and the two per-viewer
flags:

```json
{
  "ok": true,
  "data": {
    "posts": [
      {
        "id": "3f1c…",
        "user_id": "9ab2…",
        "type": "GENERAL_POST",
        "body": "Anyone else find the new bakery on Adeola Odeku?",
        "location": "Ikeja",
        "visibility": "PUBLIC",
        "like_count": 3,
        "comment_count": 1,
        "share_count": 0,
        "created_at": "2026-10-01T09:00:00.000Z",
        "author": { "id": "9ab2…", "username": "tolu", "full_name": "Tolu A.", "avatar_url": null },
        "liked": false,
        "saved": true
      }
    ],
    "nextCursor": "2026-10-01T08:41:12.000Z|1c9e…"
  }
}
```

`liked` and `saved` are per-viewer, so they cannot be joined into the page
query cleanly. They are resolved with **two batched lookups for the whole page**
(`post_id = ANY($1)`), never one query per post.

### Posts

| Route | Body | Returns |
| --- | --- | --- |
| `POST /api/posts` | `{ body, type?, location?, visibility? }` | `{ post }` |
| `GET /api/posts/[id]` | — | `{ post }` |
| `PATCH /api/posts/[id]` | `{ body }` | `{ post }` |
| `DELETE /api/posts/[id]` | — | `{ deleted: true }` |

Editing and deleting require ownership. Someone else's post is `403` — and a
post that does not exist is `404`, so the author can tell the two apart while a
stranger learns nothing.

### Interactions

| Route | Returns |
| --- | --- |
| `POST /api/posts/[id]/like` | `{ liked: true, like_count, comment_count, share_count }` |
| `DELETE /api/posts/[id]/like` | `{ liked: false, …counts }` |
| `POST /api/posts/[id]/comments` | `{ comment, counts }` |
| `GET /api/posts/[id]/comments?limit=&cursor=` | `{ rows, nextCursor }` |
| `DELETE /api/comments/[id]` | `{ deleted: true, postId, counts }` |
| `POST /api/comments/[id]/like` | `{ liked: true, likeCount }` |
| `DELETE /api/comments/[id]/like` | `{ liked: false, likeCount }` |
| `POST /api/posts/[id]/share` | `{ shared: true, …counts }` |
| `POST /api/posts/[id]/save` | `{ saved: true }` |
| `DELETE /api/posts/[id]/save` | `{ saved: false }` |
| `POST /api/follows/[userId]` | `{ following: true }` |
| `DELETE /api/follows/[userId]` | `{ following: false }` |

Every one of these is safe to repeat. Calling `POST /api/posts/[id]/like` twice
returns success both times and moves `like_count` once.

The follower in a follow call is always the session's user; the path names only
the target. That is what makes "follow on behalf of someone else" impossible to
express rather than something a handler has to remember to forbid.

## Error codes

| Code | Status | Means |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | No live session for an ACTIVE account. |
| `FORBIDDEN` | 403 | Not your post or comment. |
| `NOT_FOUND` | 404 | Gone, or never yours to see. |
| `INVALID` | 400 | Failed a service rule (self-follow, empty body). |
| `VALIDATION_ERROR` | 400 | Failed the request schema. |
| `RATE_LIMITED` | 429 | Too fast. |

## Client behaviour

Likes and saves are optimistic: the icon flips immediately and is restored
exactly as it was if the request fails. Counts are then reconciled against the
server's response, so two people liking at once still agree on the number.

Comments and deletes are not optimistic. A comment that appeared and then
vanished, or a post that looks deleted but is still there, are both worse than
a brief wait — so both wait for the server and show their own errors.

`PostCard` loads its comments on open, not with the feed. A page of twenty posts
should not carry twenty threads nobody has opened.
a next page; without it, the client shows "load more" on the last page and
spends a request discovering there was nothing more. A `nextCursor` of `null`
says the end, so the client never has to infer it.

## Interactions are idempotent

Liking, saving, sharing, following and commenting can all arrive twice — a
double tap, a retry after a flaky network, two tabs racing. All of them succeed
and move the counters once.

The mechanism is `ON CONFLICT DO NOTHING` plus a UNIQUE constraint per table,
never a read-then-write:

```sql
INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)
  ON CONFLICT (post_id, user_id) DO NOTHING
```

The repository reports whether it inserted. Only then does the service move
`like_count` — and it does so **inside the same transaction** as the insert. A
crash between the two would leave the counter permanently wrong, and nothing
would ever notice.

Counters are also clamped: `GREATEST(0, like_count + delta)`. A count cannot go
negative even if a decrement races past the row that should have existed.