import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { deleteComment } from "@/lib/server/services/interaction.service";

export const runtime = "nodejs";

/**
 * Deletes a comment the caller wrote.
 *
 * Ownership is decided by the service from the stored row, never from anything
 * the client sent — the path carries an id, not a claim about who owns it.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const { id } = await context.params;
  try {
    const result = await deleteComment({
      userId: session.user.id,
      commentId: id,
    });
    return ok({ deleted: true, ...result });
  } catch (error) {
    return handleServiceError(error);
  }
}