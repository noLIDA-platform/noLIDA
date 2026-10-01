import type { NextRequest } from "next/server";
import { readSessionCookie } from "@/lib/server/auth/session-cookie";
import {
  getSessionUser,
  type SessionUser,
} from "@/lib/server/services/auth.service";

/**
 * "Who is on this request?" for Route Handlers.
 *
 * Server Components use `getCurrentSessionUser()` (which reads `cookies()`) and
 * Server Components alone; handlers hold a `NextRequest` and go through this
 * helper. Both apply the same two rules, so a route and a page can never
 * disagree about who is signed in:
 *
 * 1. `null` for a missing cookie, an expired session, or a revoked one.
 * 2. `null` for an account that is no longer ACTIVE — a session must not
 *    outlive the account's right to use it.
 *
 * A caller turns `null` into a 401. A database failure is not `null` and is
 * allowed to propagate, so an outage reads as an error rather than as
 * "signed out".
 */
export async function getRequestSessionUser(
  request: NextRequest
): Promise<SessionUser | null> {
  const token = readSessionCookie(request);
  if (!token) return null;

  const session = await getSessionUser({ sessionToken: token });
  if (!session) return null;
  if (session.user.status !== "ACTIVE") return null;

  return session;
}