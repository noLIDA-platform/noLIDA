// WARNING: This file controls whether OTP verification can be skipped
// during signup. It is safe to ship to production because:
//
//   1. DEV_BYPASS_OTP must be explicitly set to "true".
//   2. Only emails listed in DEV_BYPASS_EMAILS can bypass.
//   3. The check requires an exact match — no wildcards, no patterns.
//   4. Production deployments are refused outright (see
//      isProductionDeployment).
//
// If DEV_BYPASS_EMAILS is empty or missing, NO email can bypass,
// even when DEV_BYPASS_OTP is "true".
//
// Do not remove these safeguards.

const bypassEnabled = process.env.DEV_BYPASS_OTP === "true";

const bypassEmails = (process.env.DEV_BYPASS_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter((e) => e.length > 0);

/**
 * Whether this process is a real deployment, where the bypass must not run.
 *
 * `VERCEL_ENV` is set by the platform itself and is not settable as an
 * environment variable, so it cannot be spoofed the way a config value could
 * be. The `NODE_ENV` arm is the fallback for any other host (a container, a
 * self-hosted box) and is inlined at build time.
 *
 * Kept from Phase 7F deliberately. The whitelist alone would still let a
 * misconfigured deployment unverify accounts: both variables are ordinary
 * configuration, and copying a `.env.local` into Vercel is precisely the
 * mistake this guards against. The whitelist decides *who* can bypass; this
 * decides *where* it can happen at all.
 */
function isProductionDeployment(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

/**
 * Whether this specific registration may skip OTP.
 *
 * Takes the identifier being registered (the email, or the phone when the
 * user signed up with one). A phone number will never match an email
 * whitelist, so phone signups always go through the normal OTP flow — which
 * is the safe default, not an oversight.
 *
 * Exact, case-insensitive match. There is intentionally no wildcard or
 * partial matching: a bare `example.com` in the list must not silently grant
 * bypass to `attacker@example.com`, and a `*` must not grant it to anyone.
 */
export function isDevOtpBypassEnabled(identifier: string): boolean {
  if (!bypassEnabled) return false;
  if (isProductionDeployment()) return false;
  if (bypassEmails.length === 0) return false;

  const normalized = identifier.trim().toLowerCase();
  return bypassEmails.includes(normalized);
}

/** The whitelisted addresses, for diagnostics. Never log this in production. */
export function getDevBypassEmails(): string[] {
  return bypassEmails;
}