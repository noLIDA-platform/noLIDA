import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { sharePost } from "@/lib/server/services/interaction.service";
import { shareSchema } from "@/lib/server/validators/feed";

export const runtime = "nodejs";

/**
 * Records that a share happened.
 *
 * This is not what performs the share — copying a link or opening WhatsApp
 * happens in the browser. This route exists so `share_count` means something,
 * and it is idempotent per (user, post, channel) so a repeat tap does not
 * inflate the number.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const limit = checkRateLimit(`share:${session.user.id}`, 60, 60_000);
  if (!limit.allowed) return fail("RATE_LIMITED", "Slow down a moment.");

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // A share with no body is valid: the channel defaults to COPY_LINK.
    body = {};
  }

  const parsed = shareSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Unknown share channel.");

  const { id } = await context.params;
  try {
    const counts = await sharePost({
      userId: session.user.id,
      postId: id,
      channel: parsed.data.channel,
    });
    return ok({ shared: true, ...counts });
  } catch (error) {
    return handleServiceError(error);
  }
}