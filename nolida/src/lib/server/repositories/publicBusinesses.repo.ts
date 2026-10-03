/**
 * Public reads over `businesses`, plus the business arm of search.
 *
 * ## The status gate lives in SQL
 *
 * Every function here filters `b.status = 'APPROVED'` inside the query. That
 * is deliberate: a PENDING_REVIEW or SUSPENDED business must not leak through
 * a list that forgot to filter, and a post-hoc `.filter()` in the service
 * would paginate wrongly (a page of 12 that renders 3 is a bug, not a
 * feature). A non-approved business is `null` or an absent row — never a
 * partially-visible object.
 *
 * ## Why this is its own repository
 *
 * `businesses.repo.ts` is the owner-facing CRUD: it sees every status and is
 * called from services that check ownership. This file never returns a row
 * the public may not read, so a caller cannot accidentally publish a draft by
 * reaching for the wrong helper. Two repos, two guarantees.
 */
import { query } from "@/lib/db/client";
import { decodeCursor, encodeCursor } from "./cursor";
import type { PublicBusiness } from "@/types/public-business";

/**
 * Owner info comes from `users` + `profiles` as a nested object so the shape
 * the component receives matches `PublicBusiness["owner"]` exactly — no
 * flattening step in the service where a field could be dropped.
 */
const PUBLIC_COLUMNS = `
  b.id, b.name, b.slug, b.category, b.description, b.phone, b.email, b.website,
  b.socials, b.location, b.service_areas, b.hours, b.photos,
  jsonb_build_object(
    'id', u.id,
    'full_name', COALESCE(pr.full_name, pr.display_name),
    'username', pr.username,
    'avatar_url', pr.avatar_url
  ) AS owner,
  b.created_at, b.approved_at
`;

const FROM_PUBLIC = `
  FROM businesses b
  JOIN users u ON u.id = b.owner_user_id
  LEFT JOIN profiles pr ON pr.user_id = u.id
`;

const APPROVED = `b.status = 'APPROVED'`;

/**
 * A single approved business by slug, with its owner.
 *
 * Slug is the public identifier, so the lookup is parameterised and the status
 * predicate sits in the same WHERE clause — there is no window where a draft
 * could be fetched and then "hidden" by the caller. Returns `null` for a slug
 * that does not exist *or* belongs to any status other than APPROVED: the two
 * are indistinguishable from outside, on purpose.
 */
export async function findBySlug(slug: string): Promise<PublicBusiness | null> {
  const result = await query<PublicBusiness>(
    `SELECT ${PUBLIC_COLUMNS}
     ${FROM_PUBLIC}
     WHERE b.slug = $1 AND ${APPROVED}`,
    [slug],
  );
  return result.rows[0] ?? null;
}

/**
 * Approved businesses in a category, newest first.
 *
 * `businesses.category` is free text written by the owner, while
 * `categories.slug` is the canonical identifier — so the match is made
 * against both the slug and the category's display name, lowercased on
 * both sides. A business that typed "Fashion" and a category slugged
 * `fashion` meet in the middle.
 *
 * Cursor is the feed's `(created_at, id)` pair. Repositories fetch
 * `limit + 1`; the extra row is what makes `nextCursor` honest.
 */
export async function listByCategory(input: {
  categorySlug: string;
  limit?: number;
  cursor?: string | null;
}): Promise<{ businesses: PublicBusiness[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 50);
  const decoded = decodeCursor(input.cursor);

  const result = await query<PublicBusiness>(
    `SELECT ${PUBLIC_COLUMNS}
     ${FROM_PUBLIC}
     WHERE ${APPROVED}
       AND LOWER(COALESCE(b.category, '')) IN (
         LOWER($1),
         LOWER(COALESCE((SELECT name FROM categories WHERE slug = $1), ''))
       )
       AND ($2::timestamptz IS NULL OR (b.created_at, b.id) < ($2::timestamptz, $3::uuid))
     ORDER BY b.created_at DESC, b.id DESC
     LIMIT $4`,
    [input.categorySlug, decoded?.createdAt ?? null, decoded?.id ?? null, limit + 1],
  );

  const rows = result.rows;
  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = page[page.length - 1];
  return {
    businesses: page,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  };
}

/**
 * Approved businesses for the discovery page, most-authored first.
 *
 * `post_count` is computed from `posts.business_id` rather than a stored
 * column: the column does not exist yet, posts are the ranking signal, and a
 * denormalised counter would need a trigger to stay honest. If the ORDER BY
 * ever gets slow, that is the migration — not a `.sort()` in the service.
 *
 * Businesses with no posts tie at 0 and fall back to recency, so a fresh
 * listing is not buried under a zero-activity one.
 */
export async function listFeatured(input: { limit?: number } = {}): Promise<PublicBusiness[]> {
  const limit = Math.min(Math.max(input.limit ?? 6, 1), 24);

  const result = await query<PublicBusiness>(
    `SELECT ${PUBLIC_COLUMNS}
     ${FROM_PUBLIC}
     WHERE ${APPROVED}
     ORDER BY (
       SELECT COUNT(*) FROM posts p WHERE p.business_id = b.id
     ) DESC, b.created_at DESC, b.id DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

/** How many approved businesses a category has, for its header count. */
export async function countByCategory(categorySlug: string): Promise<number> {
  const result = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM businesses b
     WHERE ${APPROVED}
       AND LOWER(COALESCE(b.category, '')) IN (
         LOWER($1),
         LOWER(COALESCE((SELECT name FROM categories WHERE slug = $1), ''))
       )`,
    [categorySlug],
  );
  return result.rows[0]?.total ?? 0;
}

/**
 * Business search rows for `/api/search`.
 *
 * ## ILIKE for now, and why that is honest
 *
 * `businesses` has no `search_vector` column (migration 006 built vectors for
 * posts and profiles only), so this arm matches with case-insensitive
 * substring on name and description. The day businesses get a real vector —
 * or the day search moves to Meilisearch — this function and its callers in
 * `search.service.ts` are what change. Nothing above the service notices.
 *
 * ## Rank is bounded to 0–1, same contract as posts and people
 *
 * `1.0` when the query appears in the name (the strongest signal a substring
 * match can give), otherwise word similarity against the description —
 * needle first, the operand order documented at length in `search.repo.ts`.
 * Bounded so the merge in `search.service.ts` stays meaningful: an unbounded
 * score would stack one kind of result above the other regardless of fit.
 *
 * An empty query means "show me some businesses" — the predicate is dropped
 * and ordering falls to recency, mirroring how `searchPosts` treats it.
 */
export interface BusinessSearchRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  location: string | null;
  rank: number;
}

const BUSINESS_MATCHES = `(
  b.name ILIKE '%' || $1 || '%'
  OR COALESCE(b.description, '') ILIKE '%' || $1 || '%'
)`;

const BUSINESS_RANK = `
  CASE
    WHEN $1::text IS NULL THEN 0.0
    WHEN b.name ILIKE '%' || $1 || '%' THEN 1.0
    ELSE LEAST(1.0, GREATEST(word_similarity($1, COALESCE(b.description, '')), 0))
  END
`;

export async function searchBusinesses(input: {
  query: string;
  limit: number;
  offset: number;
}): Promise<BusinessSearchRow[]> {
  const trimmed = input.query.trim();
  const hasQuery = trimmed.length > 0;

  const result = await query<BusinessSearchRow>(
    `SELECT b.id, b.slug, b.name, b.category, b.location, ${BUSINESS_RANK} AS rank
     FROM businesses b
     WHERE ${APPROVED}
       AND ($1::text IS NULL OR ${BUSINESS_MATCHES})
     ORDER BY rank DESC, b.created_at DESC, b.id DESC
     LIMIT $2 OFFSET $3`,
    [hasQuery ? trimmed : null, input.limit, input.offset],
  );
  return result.rows;
}

/** Total business matches for `counts.businesses`. Same predicate, no paging. */
export async function countBusinesses(input: { query: string }): Promise<number> {
  const trimmed = input.query.trim();
  const hasQuery = trimmed.length > 0;

  const result = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM businesses b
     WHERE ${APPROVED}
       AND ($1::text IS NULL OR ${BUSINESS_MATCHES})`,
    [hasQuery ? trimmed : null],
  );
  return result.rows[0]?.total ?? 0;
}