import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { deleteService, updateService } from "@/lib/server/services/catalog.service";
import { updateServiceSchema } from "@/lib/server/validators/catalog";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.uuid(), serviceId: z.uuid() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> },
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to manage your business.");

  const route = paramsSchema.safeParse(await params);
  if (!route.success) return fail("NOT_FOUND", "That service was not found.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Service details are invalid.");
  }

  try {
    const service = await updateService({
      userId: session.user.id,
      businessId: route.data.id,
      serviceId: route.data.serviceId,
      data: parsed.data,
    });
    return ok({ service });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> },
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to manage your business.");

  const route = paramsSchema.safeParse(await params);
  if (!route.success) return fail("NOT_FOUND", "That service was not found.");

  try {
    await deleteService({
      userId: session.user.id,
      businessId: route.data.id,
      serviceId: route.data.serviceId,
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleServiceError(error);
  }
}