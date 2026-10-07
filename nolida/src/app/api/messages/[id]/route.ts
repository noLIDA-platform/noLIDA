import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import * as messagingService from "@/lib/server/services/messaging.service";
import {
  deleteMessageSchema,
  editMessageSchema,
} from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `/api/messages/[id]` — edit the body (sender, inside the edit window) or
 * delete (`me` hides from the caller, `everyone` is the sender's tombstone).
 *
 * Every branch checks membership through the service first: a message id
 * from a conversation you are not in is a 404 here, same as everywhere else.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to edit a message.");

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = editMessageSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That edit could not be read.");
  }

  try {
    const message = await messagingService.editMessage({
      userId: session.user.id,
      messageId: id,
      body: parsed.data.body,
    });
    return ok({ message });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to delete a message.");

  const { id } = await params;
  const parsed = deleteMessageSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "That delete request could not be read.");
  }

  try {
    const result = await messagingService.deleteMessage({
      userId: session.user.id,
      messageId: id,
      scope: parsed.data.scope,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
