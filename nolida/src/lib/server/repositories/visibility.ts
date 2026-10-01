/**
 * Who may see a post, as a SQL fragment.
 *
 * Lives on its own, imported by both `posts.repo.ts` and `search.repo.ts`,
 * because a second copy of this rule is a second rule that will drift: a post
 * feed that filters but a search that does not is exactly the bug that leaks
 * someone's private post through a different door.
 *
 * The fragment aliases `posts` as `p` and expects **`$1` to be the viewer's
 * id**:
 *
 * - `PUBLIC`   — anyone signed in.
 * - `FOLLOWERS` — only people the viewer follows (plus the author).
 * - `PRIVATE`  — the author only.
 *
 * `p.user_id = $1` is what lets an author see their own post at any
 * visibility; without it, posting privately would look like a failed post.
 *
 * Always applied in the `WHERE` clause. Never fetch a page and filter after:
 * a post the viewer may not read must never have been read.
 */
export const VISIBLE_TO_VIEWER = `(
  p.visibility = 'PUBLIC'
  OR p.user_id = $1
  OR (
    p.visibility = 'FOLLOWERS'
    AND EXISTS (
      SELECT 1 FROM follows f
      WHERE f.follower_id = $1 AND f.following_id = p.user_id
    )
  )
)`;