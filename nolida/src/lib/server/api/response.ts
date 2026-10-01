import { NextResponse } from "next/server";

/**
 * The `{ ok: true, data }` / `{ ok: false, error }` envelope every noLIDA route
 * returns, in one place.
 *
 * `fail` maps a service's error code to a status itself, so a route handler
 * never has to remember that FORBIDDEN is 403. An unknown code falls back to
 * 400 — a code the API does not recognise is a client-facing problem, not a
 * server fault.
 */
const STATUS_BY_CODE: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID: 400,
  VALIDATION_ERROR: 400,
  INVALID_BODY: 400,
  RATE_LIMITED: 429,
};

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(
  code: string,
  message: string,
  status?: number
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status: status ?? STATUS_BY_CODE[code] ?? 400 }
  );
}