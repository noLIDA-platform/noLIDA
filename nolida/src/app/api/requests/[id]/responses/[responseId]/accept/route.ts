import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { acceptResponse } from "@/lib/server/services/request.service";

export const runtime = "nodejs";

/**
 * `POST /api/requests/[id]/responses/[responseId]/accept`
 *
 * Both ids are in the path, and the service checks that the response actually
 * belongs to that request. An offer id from somebody else's request is a 404,
 * not a 403 — "it exists but not for you" is itself an answer worth withholding.
 *
 * No conversation is opened here. Messaging is Phase 10, and starting a thread
 * the customer did not ask for is that phase's decision to make.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to accept an offer.");

  const { id, responseId } = await params;

  try {
    const result = await acceptResponse({
      userId: session.user.id,
      requestId: id,
      responseId,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}