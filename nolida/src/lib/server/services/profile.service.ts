import { ServiceError } from "@/lib/server/services/service-error";
import * as profilesRepo from "@/lib/server/repositories/profiles.repo";
import * as usersRepo from "@/lib/server/repositories/users.repo";
import * as followsRepo from "@/lib/server/repositories/follows.repo";
import * as postsRepo from "@/lib/server/repositories/posts.repo";
import * as businessesRepo from "@/lib/server/repositories/businesses.repo";
import type { Profile, User } from "@/lib/server/repositories/types";
import type {
  ProfileBusinessCard,
  ProfileCard,
  ProfileStatsCard,
  ProfileView,
} from "@/lib/profile/types";
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

/**
 * The view shapes are declared in `@/lib/profile/types`, not here.
 *
 * A component may not import from `src/lib/server/`, and `ProfileHeader` needs
 * these types — so the definitions live in a client-safe module and the service
 * imports them. Aliases rather than renames, so the names this service has
 * always exported keep working for the pages that import them.
 */
export type PublicProfile = ProfileCard;
export type ProfileStats = ProfileStatsCard;
export type ProfileBusiness = ProfileBusinessCard;
export type ProfileData = ProfileView;

/**
 * Flatten a user row and its (optional) profile row into one shape.
 *
 * The profile row can be missing entirely — a user exists at registration, the
 * profile arrives a moment later — so every field is nullable and the caller's
 * job is to render around the gaps rather than to expect them filled.
 */
function toPublicProfile(user: User, profile: Profile | null): PublicProfile {
  return {
    id: user.id,
    user_id: profile?.user_id ?? user.id,
    username: profile?.username ?? null,
    full_name: profile?.full_name ?? null,
    display_name: profile?.display_name ?? null,
    bio: profile?.bio ?? null,
    avatar_url: profile?.avatar_url ?? null,
    city: profile?.city ?? null,
    country: profile?.country ?? null,
    language: profile?.language ?? null,
    created_at: profile?.created_at ?? user.created_at,
  };
}

/**
 * Everything a profile header and its tab bar need, in one call.
 *
 * Null when the person should not be visible at all: no such account, or one
 * that is suspended or deleted. Those are deliberately indistinguishable — a
 * profile page that answers 404 for both is withholding an answer nobody is
 * entitled to.
 *
 * The counts and the business lookup go out together in one `Promise.all`.
 * Sequentially they would stack four round trips into the time to first paint
 * of the header, which is the first thing anyone looks at.
 */
export async function getProfileData(input: {
  viewerId: string;
  userId: string;
}): Promise<ProfileData | null> {
  const user = await usersRepo.findById(input.userId);

  // Mirrors `getCurrentSessionUser`: an account must be ACTIVE to be used.
  if (!user || user.status !== "ACTIVE") return null;

  const isOwnProfile = input.viewerId === input.userId;

  const [profile, postsCount, followersCount, followingCount, isFollowing, business] =
    await Promise.all([
      profilesRepo.findByUserId(input.userId),
      postsRepo.countByUser({
        userId: input.userId,
        viewerId: input.viewerId,
      }),
      followsRepo.countFollowers(input.userId),
      followsRepo.countFollowing(input.userId),
      // Asking whether you follow yourself is a wasted query, and a follow
      // button reading "Following" on your own profile is worse than useless.
      isOwnProfile
        ? Promise.resolve(false)
        : followsRepo.isFollowing({
            followerId: input.viewerId,
            followingId: input.userId,
          }),
      businessesRepo.findByOwner(input.userId),
    ]);

  return {
    profile: toPublicProfile(user, profile),
    stats: { postsCount, followersCount, followingCount },
    isOwnProfile,
    isFollowing,
    // Only an APPROVED business belongs on a profile. A DRAFT or PENDING_REVIEW
    // one is the owner's own unfinished business page, and putting it on their
    // public profile would advertise something nobody else can open.
    business:
      business && business.status === "APPROVED"
        ? {
            id: business.id,
            name: business.name,
            slug: business.slug,
            category: business.category,
            status: business.status,
          }
        : null,
  };
}

/**
 * The same, looked up by handle rather than by id.
 *
 * Resolves the username to a profile row and then defers, so the two entry
 * points cannot answer differently about the same person.
 */
export async function getProfileByUsername(input: {
  viewerId: string;
  username: string;
}): Promise<ProfileData | null> {
  const profile = await profilesRepo.findByUsername(input.username);
  if (!profile) return null;
  return getProfileData({ viewerId: input.viewerId, userId: profile.user_id });
}

export async function getProfileForViewer(userId: string): Promise<PublicProfile | null> {
  const user = await usersRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") return null;

  return toPublicProfile(user, await profilesRepo.findByUserId(userId));
}