import * as profilesRepo from "@/lib/server/repositories/profiles.repo";
import * as usersRepo from "@/lib/server/repositories/users.repo";

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