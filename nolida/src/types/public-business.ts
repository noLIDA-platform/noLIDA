/**
 * Public business shapes (Phase 8B).
 *
 * Client-safe by design: the `/business/[slug]` page, `PublicBusinessCard`
 * and the discovery section all render these, and components must never
 * import from `src/lib/server/`. The repository constructs them, the service
 * passes them through, and nothing below the service knows about SQL.
 */

/** The slice of the owner a public profile shows. Never the email or phone. */
export interface PublicBusinessOwner {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  /** Free-form JSONB from the submission form; rendered defensively. */
  socials: Record<string, unknown> | null;
  location: string | null;
  service_areas: unknown[] | null;
  hours: Record<string, unknown> | null;
  photos: unknown[] | null;
  owner: PublicBusinessOwner;
  created_at: string;
  approved_at: string | null;
}

/**
 * The stats row above the profile tabs.
 *
 * `reviews` and `posts` are honest zeroes until their phases land —
 * never fake a number a visitor cannot verify.
 */
export interface PublicBusinessStats {
  services: number;
  products: number;
  reviews: number;
  posts: number;
}

/**
 * The minimum a card needs to render and link. Both `PublicBusiness`
 * (featured rows) and `SearchBusiness` (search results) satisfy it,
 * so one card component serves discovery, search and category pages.
 */
export interface PublicBusinessCardData {
  name: string;
  slug: string;
  category: string | null;
  location: string | null;
}
