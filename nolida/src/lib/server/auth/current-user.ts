import { getSessionUser, type SessionUser } from "@/lib/server/services/auth.service";
import { readSessionToken } from "@/lib/server/auth/session-cookie";

/**
 * The one place that answers "who is on this request?" for Server Components.
 *
 * The `(main)` layout, the signed-in pages and the `/` redirect all need the
 * same answer, and each must reach it the same way: read the cookie, look the
 * session up in the database, return the user or `null`. Inlining that in every
 * page is how a screen eventually gets left out of the check.
 *
 * Returns `null` for a missing cookie, an expired session, a revoked one, or an
 * account that is no longer ACTIVE — `findActiveByTokenHash` already filters on
 * `revoked_at IS NULL` and `expires_at > NOW()`, so a session revoked mid-day
 * stops working immediately.
 *
 * Never throws on a bad token. A caller decides whether `null` means "redirect
 * to /" or "render the signed-out view"; a database failure is a different
 * matter and does propagate, so an outage reads as an error rather than as
 * "signed out".
 */
export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const sessionToken = await readSessionToken();
  if (!sessionToken) return null;

  const session = await getSessionUser({ sessionToken });
  if (!session) return null;

  /*
   * A session can outlive the account's right to use it: `loginWithPassword`
   * refuses anything but ACTIVE, but nothing revokes existing sessions when an
   * account is suspended or deleted. Treating that as "signed out" means the
   * `(main)` layout redirects, instead of serving a suspended account a working
   * app for the remaining life of its token.
   */
  if (session.user.status !== "ACTIVE") return null;

  return session;
}