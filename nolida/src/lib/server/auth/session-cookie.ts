import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "nolida_session";
const isProd = process.env.NODE_ENV === "production";

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date
): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function readSessionCookie(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Reads the session token from the request store instead of a `NextRequest`.
 *
 * Route Handlers receive a `NextRequest` and use `readSessionCookie`; Server
 * Components and layouts do not, so they go through `cookies()`. Both helpers
 * live here so `COOKIE_NAME` stays private to this module.
 *
 * Reading from `cookies()` opts the calling route into dynamic rendering, so a
 * page that calls it is never statically prerendered at build time.
 */
export async function readSessionToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}
