import { ServiceError } from "@/lib/server/services/service-error";
import * as profilesRepo from "@/lib/server/repositories/profiles.repo";
import * as usersRepo from "@/lib/server/repositories/users.repo";
import type { Profile } from "@/lib/server/repositories/types";
import { publicIdFromUrl, storage } from "@/lib/server/adapters/storage";
import { isAllowedAvatarUrl } from "@/lib/server/validators/profile";

/** The current user's own profile row. Throws when there is not one. */
export async function getOwnProfile(userId: string): Promise<Profile> {
  const profile = await profilesRepo.findByUserId(userId);
  if (!profile) {
    throw new ServiceError("NOT_FOUND", "Your profile could not be found.");
  }
  return profile;
}

export interface UpdateOwnProfileInput {
  full_name?: string | null;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  currency?: string | null;
}

/**
 * Update the signed-in user's own profile.
 *
 * Two decisions live here rather than in the route, because they are rules
 * about the data and not about HTTP:
 *
 * - `username` uniqueness is checked BEFORE the write. The column has a unique
 *   index, so the database would also reject a duplicate — but that surfaces as
 *   an opaque unique-violation, and the caller deserves "that name is taken".
 * - Replacing an avatar deletes the old asset. The row holds a URL, not a file,
 *   so without this the replaced photos pile up in the provider forever. It runs
 *   AFTER the row is updated, and a deletion failure is logged rather than
 *   thrown: the user's new photo is already saved, and failing the whole request
 *   would tell them it was not.
 */
export async function updateOwnProfile(
  userId: string,
  input: UpdateOwnProfileInput,
): Promise<Profile> {
  const current = await getOwnProfile(userId);

  if (input.avatar_url !== undefined && !isAllowedAvatarUrl(input.avatar_url)) {
    throw new ServiceError(
      "INVALID",
      "That photo link is not a valid https address.",
    );
  }

  if (input.username && input.username !== current.username) {
    if (await profilesRepo.usernameExists(input.username)) {
      throw new ServiceError("INVALID", "That username is already taken.");
    }
  }

  const updated = await profilesRepo.update(userId, input);

  if (
    input.avatar_url !== undefined &&
    input.avatar_url !== current.avatar_url
  ) {
    void deleteReplacedAvatar(current.avatar_url);
  }

  return updated;
}

/**
 * Best-effort cleanup of the avatar a user just replaced.
 *
 * Only ever called with the PREVIOUS url, and `publicIdFromUrl` returns null for
 * anything that is not one of our own Cloudinary assets — so an avatar that came
 * from somewhere else, or from a provider we have since migrated off, is left
 * alone. Deleting a file we do not own would be worse than leaking one.
 */
async function deleteReplacedAvatar(previousUrl: string | null): Promise<void> {
  if (!previousUrl) return;

  try {
    const publicId = publicIdFromUrl(previousUrl);
    if (!publicId) return;
    await storage.deleteAsset(publicId, "image");
  } catch (error) {
    // The row already points at the new photo. Log and move on.
    console.warn(
      "[profile] could not delete replaced avatar:",
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Reading someone's profile.
 *
 * Exists because pages talk to services, not repositories — and because
 * "should this person be visible at all" is a decision, not a query. A suspended
 * or deleted account is `null`, exactly like an account that never existed: the
 * profile page answers 404 for both, and the difference between them is nobody's
 * business.
 *
 * No viewer here. Nothing on the profile page depends on who is looking, so
 * there is nothing to enforce and nothing to thread through — a follow button
 * belongs on this page eventually, and that is the day `viewerId` arrives.
 */

export interface PublicProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  /** ISO string, for the "Member since" line. */
  created_at: string;
}

export async function getProfileForViewer(userId: string): Promise<PublicProfile | null> {
  const user = await usersRepo.findById(userId);

  // Mirrors `getCurrentSessionUser`: an account must be ACTIVE to be used.
  if (!user || user.status !== "ACTIVE") return null;

  const profile = await profilesRepo.findByUserId(userId);

  return {
    id: user.id,
    username: profile?.username ?? null,
    full_name: profile?.full_name ?? null,
    display_name: profile?.display_name ?? null,
    bio: profile?.bio ?? null,
    avatar_url: profile?.avatar_url ?? null,
    created_at: profile?.created_at ?? user.created_at,
  };
}