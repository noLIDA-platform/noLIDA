import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { createPost } from "@/lib/server/services/post.service";
import { createPostSchema } from "@/lib/server/validators/feed";

export const runtime = "nodejs";

/** Creates a post. Text only — media is deferred until Cloudinary exists. */
export async function POST(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const limit = checkRateLimit(`post-create:${session.user.id}`, 30, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "You are posting very fast. Try again shortly.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "A post needs between 1 and 5000 characters.");
  }

  try {
    const post = await createPost({
      userId: session.user.id,
      body: parsed.data.body,
      type: parsed.data.type,
      location: parsed.data.location ?? null,
      visibility: parsed.data.visibility,
    });
    return ok({ post }, 201);
  } catch (error) {
    return handleServiceError(error);
  }
}