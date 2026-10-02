import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/server/api/response";
import { listCategories } from "@/lib/server/services/catalog.service";
import { categoryQuerySchema } from "@/lib/server/validators/catalog";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = categoryQuerySchema.safeParse(query);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "activeOnly must be true or false.");
  }

  const categories = await listCategories(parsed.data);
  return ok({ categories });
}