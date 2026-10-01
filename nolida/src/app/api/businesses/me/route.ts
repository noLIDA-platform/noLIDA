import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { AuthError } from "@/lib/server/services/auth.service";
import { getMyBusiness, updateBusiness } from "@/lib/server/services/business.service";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  category: z.string().max(120).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  email: z.string().max(320).optional().nullable(),
  website: z.string().max(320).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  slug: z.string().max(120).optional().nullable(),
  socials: z.record(z.string(), z.unknown()).optional().nullable(),
  hours: z.record(z.string(), z.unknown()).optional().nullable(),
  serviceAreas: z.array(z.unknown()).optional().nullable(),
  photos: z.array(z.unknown()).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Sign in to manage your business." } }, { status: 401 });
  }

  const business = await getMyBusiness(session.user.id);
  return NextResponse.json({ ok: true, data: business });
}

export async function POST(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Sign in to manage your business." } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "INVALID_BODY", message: "Request body must be JSON." } }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Business details are invalid." } }, { status: 400 });
  }

  try {
    const existing = await getMyBusiness(session.user.id);
    const business = existing
      ? await updateBusiness(session.user.id, parsed.data)
      : await (await import("@/lib/server/services/business.service")).createBusinessDraft(session.user.id, {
          name: parsed.data.name ?? "My Business",
          category: parsed.data.category,
          description: parsed.data.description,
          phone: parsed.data.phone,
          email: parsed.data.email,
          website: parsed.data.website,
          location: parsed.data.location,
          socials: parsed.data.socials ?? undefined,
          hours: parsed.data.hours ?? undefined,
          serviceAreas: parsed.data.serviceAreas ?? undefined,
          photos: parsed.data.photos ?? undefined,
        });

    return NextResponse.json({ ok: true, data: business });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status });
    }
    throw error;
  }
}
