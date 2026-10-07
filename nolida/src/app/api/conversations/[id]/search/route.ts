import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import * as messagingService from "@/lib/server/services/messaging.service";
import { searchMessagesQuerySchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `/api/conversations/[id]/search?q=` — full-text search inside ONE thread.
 *
 * Membership is checked in the service, so an outsider cannot use this as an
 * existence oracle: a non-member gets the same 404 as a bad id.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to search messages.");

  const { id } = await params;

  const limit = checkRateLimit(`message-search:${session.user.id}`, 30, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "Too many searches. Try again in a minute.");
  }

  const parsed = searchMessagesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That search could not be read.");
  }

  try {
    const hits = await messagingService.searchMessages({
      userId: session.user.id,
      conversationId: id,
      q: parsed.data.q,
      limit: parsed.data.limit,
    });
    return ok({ hits });
  } catch (error) {
    return handleServiceError(error);
  }
}
