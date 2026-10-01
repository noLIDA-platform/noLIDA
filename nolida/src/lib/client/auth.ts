import { apiFetch } from "@/lib/client/api";

/**
 * Signs the current session out and returns the user to the sign-in screen.
 *
 * Safe to call from any Client Component. The client never touches the cookie:
 * it is HttpOnly, so only the server can clear it, and `/api/auth/logout` does
 * exactly that. Going to `/` is not the security control — the server-side
 * check in the `(main)` layout is. This redirect only decides where the user
 * ends up once the session is gone.
 *
 * A failed logout still redirects. If the request never landed the cookie may
 * still exist, but `/` re-checks it, so the user is never left stranded on a
 * signed-in page with a button that appears to do nothing.
 */
export async function signOut(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
  // A full document load, not a push: every render after this one must come
  // from the server, with the cookie already cleared.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full load; the cookie is cleared server-side first
  window.location.href = "/";
}