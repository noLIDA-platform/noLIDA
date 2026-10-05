import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { withdrawResponse } from "@/lib/server/services/request.service";

export const runtime = "nodejs";

/**
 * `DELETE /api/requests/[id]/responses/[responseId]` — withdraw your own offer.
 *
 * The service checks the responder owns it and that it is still PENDING. An
 * ACCEPTED offer cannot be withdrawn: the customer is relying on it, and that
 * ends by closing the request instead.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to withdraw an offer.");

  const { responseId } = await params;

  try {
    await withdrawResponse({ userId: session.user.id, responseId });
    return ok({ withdrawn: true });
  } catch (error) {
    return handleServiceError(error);
  }
}