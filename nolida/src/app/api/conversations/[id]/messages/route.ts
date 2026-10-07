import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import * as messagingService from "@/lib/server/services/messaging.service";
import {
  listMessagesQuerySchema,
  sendMessageSchema,
} from "@/lib/server/validators/messaging";
import { MESSAGE_PAGE_SIZE } from "@/lib/messaging/constants";

export const runtime = "nodejs";

/**
 * `/api/conversations/[id]/messages` — read the thread (cursor-paged,
 * newest-first in the repo, reversed for rendering) or send into it.
 *
 * Sending is rate limited per user: this is the endpoint that mints rows on
 * every keystroke-driven Enter. The service owns blocks, membership and the
 * content rule; this route only parses and answers.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to read messages.");

  const { id } = await params;
  const parsed = listMessagesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That could not be read.");
  }

  try {
    const page = await messagingService.listMessages({
      userId: session.user.id,
      conversationId: id,
      limit: parsed.data.limit ?? MESSAGE_PAGE_SIZE,
      cursor: parsed.data.cursor ?? null,
    });
    return ok(page);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to send messages.");

  const { id } = await params;

  const limit = checkRateLimit(`message-send:${session.user.id}`, 60, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "You are sending messages very fast. Slow down a moment.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That message could not be read.");
  }

  try {
    const message = await messagingService.sendMessage({
      userId: session.user.id,
      conversationId: id,
      body: parsed.data.body,
      attachments: parsed.data.attachments,
      voiceNote: parsed.data.voiceNote,
      sharedItem: parsed.data.sharedItem,
      replyToId: parsed.data.replyToId,
    });
    return ok({ message }, 201);
  } catch (error) {
    return handleServiceError(error);
  }
}
