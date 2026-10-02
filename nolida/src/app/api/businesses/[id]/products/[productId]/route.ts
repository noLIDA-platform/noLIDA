import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { deleteProduct, updateProduct } from "@/lib/server/services/catalog.service";
import { updateProductSchema } from "@/lib/server/validators/catalog";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.uuid(), productId: z.uuid() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to manage your business.");

  const route = paramsSchema.safeParse(await params);
  if (!route.success) return fail("NOT_FOUND", "That product was not found.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Product details are invalid.");
  }

  try {
    const product = await updateProduct({
      userId: session.user.id,
      businessId: route.data.id,
      productId: route.data.productId,
      data: parsed.data,
    });
    return ok({ product });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to manage your business.");

  const route = paramsSchema.safeParse(await params);
  if (!route.success) return fail("NOT_FOUND", "That product was not found.");

  try {
    await deleteProduct({
      userId: session.user.id,
      businessId: route.data.id,
      productId: route.data.productId,
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleServiceError(error);
  }
}