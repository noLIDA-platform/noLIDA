import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import * as messagingService from "@/lib/server/services/messaging.service";
import { updateConversationSchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `/api/conversations/[id]` — one conversation's detail, or its per-side
 * settings (pin / mute / archive). Non-members get 404 from the service;
 * the route never reveals whether the id exists.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to view that conversation.");

  const { id } = await params;
  try {
    const conversation = await messagingService.getConversation({
      userId: session.user.id,
      conversationId: id,
    });
    return ok({ conversation });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to update that conversation.");

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = updateConversationSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That update could not be read.");
  }

  try {
    const conversation = await messagingService.updateConversationSettings({
      userId: session.user.id,
      conversationId: id,
      fields: parsed.data,
    });
    return ok({ conversation });
  } catch (error) {
    return handleServiceError(error);
  }
}
