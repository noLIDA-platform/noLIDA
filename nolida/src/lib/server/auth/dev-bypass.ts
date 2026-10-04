// WARNING: This bypasses OTP verification for signup during local
// development. It is impossible to enable in production because
// the check requires NODE_ENV !== "production". Do not remove that
// guard — it is the only thing standing between a copy-pasted env
// var and every real account in production being unverified.
//
// Both conditions must hold. `NODE_ENV` is set by the build
// platform and is not controllable from a Vercel environment
// variable, so an accidental `DEV_BYPASS_OTP=true` in production
// still evaluates to false.

/**
 * Whether signup may skip OTP verification.
 *
 * Deliberately not cached in a module-level constant: `NODE_ENV` is inlined at
 * build time but `DEV_BYPASS_OTP` is read from the environment at runtime, and
 * a cached value would make a dev server restart (or an env change) appear not
 * to take effect.
 */
export function isDevOtpBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_BYPASS_OTP === "true"
  );
}