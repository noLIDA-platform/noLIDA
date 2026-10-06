/**
 * A business's photo set: one cover, one logo, and a gallery strip.
 *
 * The `photos` COLUMN has always defaulted to `'[]'` and the service typed it
 * `unknown[]`. This shape replaces the bare array, so `readBusinessPhotos`
 * accepts BOTH: an old row really does hold `[]`, and an admin or script may
 * still write the legacy form. Both are read, and everything is written in the
 * new shape.
 *
 * ## Why this lives here and not in the component (Phase 5H)
 *
 * These three used to be exported from `BusinessSubmissionForm`, which is a
 * `"use client"` module. `/business/[slug]` is a Server Component that needs the
 * same reader, and importing a client function into a server component is not a
 * type error — it is a hard runtime failure:
 *
 * > Attempted to call readBusinessPhotos() from the server but
 * > readBusinessPhotos is on the client.
 *
 * That 500 survived `npm run build` because `/business/[slug]` is dynamic (`ƒ`)
 * and is never prerendered, so the call only ever executed on a request.
 *
 * A Server Component may render a client component or pass props to one; it may
 * not CALL one. So this file is deliberately plain — no `"use client"`, no React
 * — and both sides import from here. `BusinessSubmissionForm` re-exports these
 * names so its existing importers keep working.
 *
 * This mirrors `readAttachmentUrls` in `@/lib/requests/types`, which exists for
 * the same reason: a value read by both a page and a form is neither the form's
 * nor the server's, so it belongs to neither.
 */
export interface BusinessPhotos {
  cover: string | null;
  logo: string | null;
  gallery: string[];
}

/** How many gallery images one business may carry. */
export const BUSINESS_GALLERY_MAX = 8;

/**
 * Normalise whatever is in `businesses.photos` into the shape the UI renders.
 *
 * Tolerant by necessity: the column is JSONB with no CHECK, so it may be `null`,
 * `[]`, an object from this phase, or an array of bare URL strings from before.
 * Anything unrecognised becomes an empty photo set rather than a render crash.
 *
 * Every URL is filtered to `https://`. These render into `src` and `srcSet`, so a
 * `javascript:` value here is stored XSS — the same rule the upload path applies.
 */
export function readBusinessPhotos(raw: unknown): BusinessPhotos {
  const empty: BusinessPhotos = { cover: null, logo: null, gallery: [] };
  if (typeof raw !== "object" || raw === null) return empty;

  // Legacy shape: a bare array of URL strings, or of {url} objects.
  if (Array.isArray(raw)) {
    const gallery = raw
      .map((entry) =>
        typeof entry === "string"
          ? entry
          : typeof entry === "object" && entry !== null &&
              typeof (entry as { url?: unknown }).url === "string"
            ? (entry as { url: string }).url
            : "",
      )
      .filter((url) => url.startsWith("https://"))
      .slice(0, BUSINESS_GALLERY_MAX);
    return { cover: null, logo: null, gallery };
  }

  const record = raw as Record<string, unknown>;
  const str = (value: unknown): string | null =>
    typeof value === "string" && value.startsWith("https://") ? value : null;

  const gallery = Array.isArray(record.gallery)
    ? record.gallery
        .filter((entry): entry is string => typeof entry === "string")
        .filter((url) => url.startsWith("https://"))
        .slice(0, BUSINESS_GALLERY_MAX)
    : [];

  return {
    cover: str(record.cover),
    logo: str(record.logo),
    gallery,
  };
}