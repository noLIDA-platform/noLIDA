# Profile Page (Phase 5D)

Two routes, one layout, one set of components.

| Route | Whose | Base path for tab links |
| ----- | ----- | ----------------------- |
| `/profile` | Yours | `/profile?tab=…` |
| `/user/[username]` | Anyone | `/user/<handle>?tab=…` |

`/profile/[id]` still exists and still answers, but it is a **forwarding route**
(see [Legacy route](#legacy-route-profileid)).

---

## Why the handle, not the id

A profile URL is the one thing people put in a message. `/user/ada` can be said
out loud, typed from memory, and recognised in a search result. A UUID does none
of those things, and it also leaks how many accounts exist.

`profiles.repo.findByUsername` compares with `lower()` in SQL rather than in JS,
because the value arrives from a route parameter carrying whatever casing someone
typed or a shared link held. `/user/Ada` and `/user/ada` are one person; a
case-sensitive comparison would 404 one of them and the failure would look like a
broken link rather than a typo.

Handles are stored lowercase by the profile validator, so the case-insensitive
comparison can only ever be more forgiving — never ambiguous.

## Legacy route: `/profile/[id]`

It redirects to `/user/[username]` when the account has a handle, and renders a
minimal view only for accounts that do not.

That is a correction, not a stub. `/profile/[id]` was already the other-person
profile, and once `/profile` was rebuilt it became a **second, older profile UI
for the same person** — two places showing different information. Forwarding
removes the duplication. Accounts with no username have no handle to forward to,
so they keep the simple view.

## Layout

```
ProfileHeader      avatar + stats, identity, actions, business card
ProfileTabs        Posts | Saved | Tagged | About
<one panel>        the active tab's content
```

Both pages render this shape; only the props differ (`isOwnProfile`,
`isFollowing`).

## Header

Row order is the order a phone is held in: avatar and counts, then who they are,
then what they do, then what you can do to them. Action buttons come **last** —
on a 375px screen a row of buttons above the fold pushes the person's name off
it.

Counts are abbreviated (`1.2K`, `3.4M`) but never replaced: the exact number
stays in the `title` and in the accessible name. A rounded number that is also
the only number is a number nobody can trust.

The header is a Server Component. The only interactive parts are two small
client islands — `FollowButton` and `ShareProfileButton` — so the header itself
ships no JavaScript and neither island blocks the page from rendering.

### Business card

Shown only when the person owns an **APPROVED** business. A `DRAFT` or
`PENDING_REVIEW` business is the owner's own unfinished page, and putting it on a
public profile would advertise something nobody else can open. The filter lives in
`profile.service.getProfileData`, not in the component.

## Tabs

The active tab is `?tab=posts|saved|tagged|about`.

Not client state, and that is the whole design:

- it survives a refresh, which `useState` does not;
- it can be linked to and shared, which `useState` cannot;
- it works before — or entirely without — hydration.

`ProfileTabs` is a Server Component of four plain `<Link>`s. **Do not add
`"use client"` to it.** A tab bar is navigation, and navigation that needs
JavaScript to have happened is navigation that has not happened yet.

`parseProfileTab` coerces anything unexpected back to `posts`, so a hand-edited
or stale `?tab=rot` lands on the default view rather than a blank page.

**"Saved" is hidden on other people's profiles.** It is always empty there and
invites a question we cannot answer.

Only the active tab's list is fetched. Fetching every tab's data up front pays
for two lists nobody is looking at.

## Posts grid

Three columns at **every** width. The Instagram layout does not change column
count on a phone, and neither does this one: a two-column grid on mobile makes
each tile big enough to be mistaken for a feed post, and the density is the point.

| Post has | Tile shows |
| -------- | ---------- |
| An image | The image, `object-fit: cover` |
| A video | A play badge over the first image, or a play tile when there is none |
| Nothing | Its own body text, line-clamped to 5 lines |

`media` is read through `parsePostMedia`, never trusted as an array — the column
is JSONB and predates this grid, so a legacy or hand-edited row must not be able
to render a broken tile.

On mobile the grid is edge-to-edge with no page padding. 16px either side of a
2px gutter makes every tile narrower than it should be at 375px. Everything above
the grid keeps its inset.

## Visibility

Nothing on this page filters posts itself. `getUserPosts` already applies
`VISIBLE_TO_VIEWER` in SQL, so a `FOLLOWERS`-only post is excluded before it is
read.

| Visibility | Who sees it on a profile |
| ---------- | ------------------------ |
| `PUBLIC` | Anyone signed in |
| `FOLLOWERS` | The author, and people who follow them |
| `PRIVATE` | The author only |

The same rule makes the **post count** viewer-aware:
`posts.repo.countByUser({ userId, viewerId })` applies the predicate too. A count
that ignored visibility would contradict the grid directly beneath it — "12 posts"
above six tiles reads as a bug even when it is correct — and it would leak the
existence of private posts to anyone counting.

Follower and following counts query `follows` directly rather than joining the
user tables. The consequence is deliberate: a row pointing at a since-deleted
account still counts but would not appear in a list. Nothing renders both on the
same screen today.

## Follow button

Optimistic, like the like and save buttons. The label flips on click and is put
back if the request fails. A round trip before the button reacts makes following
feel broken on a slow connection.

The initial label comes from the server (`is_following` computed in the profile
query). A card that always said "Follow" would invite a tap that silently does
nothing; one that always said "Following" makes unfollowing impossible.

The hover "Unfollow" label is a **second, `aria-hidden` span** rather than a JS
text swap. The button keeps one accessible name that always describes its current
state, and "Unfollow" is decoration for a mouse. The two labels are stacked with
`position: absolute` so the button never changes width under the pointer.

## Placeholders

Message and the more-menu (Report, Block) render **disabled** with a tooltip, not
hidden. Hiding them would leave the row's shape unsettled for when they arrive.

The `title` sits on a **wrapper span**, not on the disabled button. A disabled
button emits no pointer events, so there is nothing to hover and its own tooltip
would never appear.

## Where the types live

`@/lib/profile/types`, not `profile.service.ts`. No component may import from
`src/lib/server/` — that rule exists so a server-only module can never be pulled
into a client bundle. The service imports these types and returns them, so there
is still one definition of each shape.

## Verification rows

Email and phone verification used to live in a "My Account" card on `/profile`,
which this phase removed. They now appear on **your own About tab only** — they
are account details rather than public identity, and another person's
verification state is not shown here at all.