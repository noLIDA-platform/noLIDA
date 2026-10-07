import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import * as messagingService from "@/lib/server/services/messaging.service";
import {
  listConversationsQuerySchema,
  startConversationSchema,
} from "@/lib/server/validators/messaging";
import { CONVERSATION_PAGE_SIZE } from "@/lib/messaging/constants";

export const runtime = "nodejs";

/**
 * `/api/conversations` — the viewer's conversation list, or start one.
 *
 * Starting a conversation is one of the few messaging writes that mints a
 * new row per call, so it carries its own rate limit. The service decides
 * everything else: blocks, self-messaging, the canonical pair.
 */
export async function GET(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to see your conversations.");

  const parsed = listConversationsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That could not be read.");
  }

  try {
    const page = await messagingService.listConversations({
      userId: session.user.id,
      limit: parsed.data.limit ?? CONVERSATION_PAGE_SIZE,
      cursor: parsed.data.cursor ?? null,
      includeArchived: parsed.data.includeArchived === "true",
    });
    return ok(page);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to start a conversation.");

  const limit = checkRateLimit(`conversation-start:${session.user.id}`, 30, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "You are starting conversations very fast. Try again shortly.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = startConversationSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That request could not be read.");
  }

  try {
    const conversation = await messagingService.startConversation({
      userId: session.user.id,
      otherUserId: parsed.data.otherUserId,
    });
    return ok({ conversation }, 201);
  } catch (error) {
    return handleServiceError(error);
  }
}
