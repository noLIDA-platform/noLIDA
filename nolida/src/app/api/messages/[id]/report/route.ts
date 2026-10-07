import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import * as messagingService from "@/lib/server/services/messaging.service";
import { reportMessageSchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `/api/messages/[id]/report` — flag a message for review.
 *
 * The response is the same whether or not this reporter has flagged the
 * person before: a report is a record, never a verdict, and never a hint.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to report a message.");

  const { id } = await params;

  const limit = checkRateLimit(`report:${session.user.id}`, 10, 3_600_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "You have filed several reports. Try again later.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = reportMessageSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That report could not be read.");
  }

  try {
    const result = await messagingService.reportMessage({
      userId: session.user.id,
      messageId: id,
      reason: parsed.data.reason,
      details: parsed.data.details,
    });
    return ok(result, 201);
  } catch (error) {
    return handleServiceError(error);
  }
}
