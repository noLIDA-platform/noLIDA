/**
 * The signed-in user's own profile. Read and update.
 *
 * This is an EDIT endpoint for the current user only. There is no id in the
 * path and no user id in the body: the session decides whose profile this is,
 * so there is no identifier a caller could tamper with to edit someone else.
 * `profiles.repo.update` also filters to a known column allow-list, so a
 * surprise key in the body is dropped rather than written.
 */
import { z } from "zod";

/**
 * `avatar_url` must be an https URL we could plausibly have produced.
 *
 * It is a TEXT column holding a provider URL, so nothing at the database layer
 * stops an owner writing `javascript:alert(1)` into it. If a component ever
 * rendered that into an `href` it would be a stored XSS, so the value is
 * restricted to https at the boundary — once, instead of at every render site.
 *
 * A user who signed up before uploads existed may have an avatar from another
 * source, so an https URL on any host is accepted; `null` (remove) is fine.
 */
export function isAllowedAvatarUrl(value: string | null): boolean {
  if (value === null) return true;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  // https only. A `javascript:` or `data:` URL here is a stored XSS waiting for
  // a component to render it as a link.
  if (parsed.protocol !== "https:") return false;
  return true;
}

export const updateProfileSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120).nullable().optional(),
    display_name: z.string().trim().max(80).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    avatar_url: z.url().max(2048).nullable().optional(),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(32)
      .regex(
        /^[a-z0-9_]+$/,
        "Usernames use letters, numbers and underscores.",
      )
      .nullable()
      .optional(),
    country: z.string().trim().max(80).nullable().optional(),
    city: z.string().trim().max(80).nullable().optional(),
    timezone: z.string().trim().max(64).nullable().optional(),
    currency: z.string().trim().max(8).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });