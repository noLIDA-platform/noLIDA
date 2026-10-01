import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { AuthError } from "@/lib/server/services/auth.service";
import { submitBusiness } from "@/lib/server/services/business.service";

export const runtime = "nodejs";

const bodySchema = z.object({
  payload: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Sign in to submit a business." } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "INVALID_BODY", message: "Request body must be JSON." } }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Provide a payload for your business submission." } }, { status: 400 });
  }

  try {
    const result = await submitBusiness(session.user.id, parsed.data.payload);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status });
    }
    throw error;
  }
}
