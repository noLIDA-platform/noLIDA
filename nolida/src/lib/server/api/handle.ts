import type { NextResponse } from "next/server";
import { fail } from "./response";
import { ServiceError } from "@/lib/server/services/service-error";

/**
 * Turns a thrown `ServiceError` into the right envelope and status.
 *
 * Anything that is *not* a `ServiceError` is rethrown on purpose: a database
 * outage must surface as a 500, not be dressed up as a tidy 400 that hides a
 * real problem. Routes wrap their service call in this and nothing else.
 */
export function handleServiceError(error: unknown): NextResponse {
  if (error instanceof ServiceError) return fail(error.code, error.message);
  throw error;
}