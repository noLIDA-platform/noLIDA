import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { createService, listServices } from "@/lib/server/services/catalog.service";
import { createServiceSchema } from "@/lib/server/validators/catalog";

export const runtime = "nodejs";

const idSchema = z.uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to manage your business.");

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return fail("NOT_FOUND", "That business was not found.");

  try {
    const services = await listServices({ userId: session.user.id, businessId: id });
    return ok({ services });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to manage your business.");

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return fail("NOT_FOUND", "That business was not found.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Service details are invalid.");
  }

  try {
    const service = await createService({
      userId: session.user.id,
      businessId: id,
      data: parsed.data,
    });
    return ok({ service }, 201);
  } catch (error) {
    return handleServiceError(error);
  }
}