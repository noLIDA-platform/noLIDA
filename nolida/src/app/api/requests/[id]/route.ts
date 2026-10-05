import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import {
  getRequest,
  updateRequest,
} from "@/lib/server/services/request.service";
import { updateRequestSchema } from "@/lib/server/validators/request";
import type { RequestRow } from "@/lib/server/repositories/requests.repo";

export const runtime = "nodejs";

/**
 * `/api/requests/[id]` — read one request, or edit it.
 *
 * GET returns the viewer's standing alongside the request (`isOwn`,
 * `canRespond`, `hasResponded`) so the page never has to re-derive the rules.
 * Those come from the service, which is the only place they are written down.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to see this request.");

  const { id } = await params;

  try {
    const result = await getRequest({ requestId: id, viewerId: session.user.id });
    // A missing request is a 404, not an empty 200: "it does not exist" and "here
    // is a request with nothing in it" are different answers.
    if (!result) return fail("NOT_FOUND", "That request was not found.");
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

/** Edit a request. Owner only, and only while it is still OPEN. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to edit this request.");

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = updateRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(
      "VALIDATION_ERROR",
      first?.message ?? "Those changes could not be read.",
    );
  }

  // camelCase from the boundary, snake_case to the column. Mapped here rather
  // than in the repository so the column allow-list there stays a single
  // obvious list.
  const fields: Partial<RequestRow> = {
    title: parsed.data.title,
    description: parsed.data.description,
    category_id: parsed.data.categoryId,
    budget_min: parsed.data.budgetMin,
    budget_max: parsed.data.budgetMax,
    urgency: parsed.data.urgency,
    location: parsed.data.location,
    deadline: parsed.data.deadline,
    attachments: parsed.data.attachments,
  };

  try {
    const updated = await updateRequest({
      userId: session.user.id,
      requestId: id,
      fields,
    });
    return ok({ request: updated });
  } catch (error) {
    return handleServiceError(error);
  }
}