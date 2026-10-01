/**
 * The signed-in identity the app chrome needs.
 *
 * Deliberately a *client-safe* module: it imports nothing from
 * `src/lib/server/`, so components may depend on it without breaking the rule
 * that no component reaches into server code. The `(main)` layout maps a
 * `SessionUser` onto this shape once and passes it down.
 *
 * Only display fields live here. Anything a screen must trust — balance, role
 * checks, verification state — is re-read from the session on the server.
 */
export interface ShellUser {
  id: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  role: string;
  email: string | null;
  phone: string | null;
}

/**
 * The structural slice of `SessionUser` this mapping needs. Declaring it here
 * rather than importing the server type keeps this module importable from
 * Client Components; a full `SessionUser` is assignable to it.
 */
export interface ShellUserSource {
  user: {
    id: string;
    role: string;
    email: string | null;
    phone: string | null;
  };
  profile: {
    display_name: string | null;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * Chooses the name to show, in the order a user would expect, and always
 * produces something: a profile can be entirely empty right after signup.
 */
export function toShellUser(source: ShellUserSource): ShellUser {
  const { user, profile } = source;
  const displayName =
    profile?.display_name ??
    profile?.full_name ??
    profile?.username ??
    user.email ??
    user.phone ??
    "You";

  return {
    id: user.id,
    displayName,
    handle: profile?.username ? `@${profile.username}` : null,
    avatarUrl: profile?.avatar_url ?? null,
    role: user.role,
    email: user.email,
    phone: user.phone,
  };
}

/**
 * Up to two letters for the avatar fallback — first and last initial, or the
 * first two letters of a single word.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";
  const initials = `${first}${last}`.trim();

  return initials.length > 0 ? initials.toUpperCase() : "?";
}