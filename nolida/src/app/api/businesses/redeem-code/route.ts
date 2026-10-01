import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { AuthError } from "@/lib/server/services/auth.service";
import { redeemCode } from "@/lib/server/services/authorization.service";
import { createBusinessDraft } from "@/lib/server/services/business.service";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(48),
});

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export async function POST(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in to create a business listing." } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: "Request body must be JSON." } },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Provide a valid authorization code." } },
      { status: 400 }
    );
  }

  try {
    const redeemed = await redeemCode({
      code: parsed.data.code,
      userId: session.user.id,
      ip: clientIp(request),
    });

    const business = await createBusinessDraft(session.user.id, {
      name: "My Business",
    });

    return NextResponse.json({
      ok: true,
      data: {
        codeId: redeemed.codeId,
        businessId: business.id,
        businessStatus: business.status,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json(
        { ok: false, error: { code: error.code, message: error.message } },
        { status }
      );
    }
    throw error;
  }
}
