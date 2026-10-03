import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/server/api/response";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { getBusinessStatusForOwner } from "@/lib/server/services/business.service";

export const runtime = "nodejs";

const idSchema = z.uuid();

/**
 * `GET /api/businesses/[id]/status` — the status of one business.
 *
 * The poller on `/my-business/pending` calls this while a submission is under
 * review so the page can notice the moment an admin approves it and
 * `router.refresh()` into the redirect.
 *
 * Ownership is checked against the session, never against the id in the URL:
 * a business id is not proof of anything, and returning `NOT_FOUND` (not
 * `FORBIDDEN`) for someone else's business keeps the endpoint from
 * confirming that a given id exists at all.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to check your business status.");

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return fail("NOT_FOUND", "That business was not found.");

  const status = await getBusinessStatusForOwner({
    userId: session.user.id,
    businessId: id,
  });
  if (!status) return fail("NOT_FOUND", "That business was not found.");

  return ok(status);
}
