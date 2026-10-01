/**
 * The error every feed service throws.
 *
 * Carries a stable `code` so a Route Handler can turn it into a status without
 * matching on a message string. The auth service has its own `AuthError`; the
 * two are kept separate because they map to different statuses and because
 * `AuthError` predates this one.
 */
export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export type ServiceErrorCode =
  | "INVALID"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "UNAUTHORIZED";