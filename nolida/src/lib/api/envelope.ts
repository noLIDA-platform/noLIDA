/**
 * Helpers for reading the `{ ok: true, data }` / `{ ok: false, error }`
 * response envelope that every noLIDA API route returns (see .clinerules).
 *
 * Client-safe and dependency-free: these run in the browser as part of the
 * auth forms, so they must never reach a server-only module.
 */

/** The success envelope, before any validation of its contents. */
export interface ApiEnvelope {
  readonly ok?: unknown;
  readonly data?: unknown;
}

/**
 * Extracts `data.redirectTo` from a parsed response body.
 *
 * The payload is `unknown` on purpose — it came off the wire and nothing about
 * it is trustworthy. A value is returned only when it is a string that starts
 * with `/`, which also rules out off-site redirects via `//evil.example`.
 * Anything else falls back to `fallback`.
 */
export function readRedirectTo(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null) return fallback;

  const { data } = payload as ApiEnvelope;
  if (typeof data !== "object" || data === null) return fallback;

  const { redirectTo } = data as { redirectTo?: unknown };
  return typeof redirectTo === "string" && redirectTo.startsWith("/")
    ? redirectTo
    : fallback;
}
