import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { AuthError } from "@/lib/server/services/auth.service";
import {
  approveBusiness,
  rejectBusiness,
  requestBusinessChanges,
} from "@/lib/server/services/business.service";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "REQUEST_CHANGES"]),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Admin access required." } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "INVALID_BODY", message: "Request body must be JSON." } }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Action and notes are invalid." } }, { status: 400 });
  }

  const { id } = await params;

  try {
    const result =
      parsed.data.action === "APPROVE"
        ? await approveBusiness({ adminUserId: session.user.id, businessId: id, notes: parsed.data.notes ?? null })
        : parsed.data.action === "REJECT"
          ? await rejectBusiness({ adminUserId: session.user.id, businessId: id, notes: parsed.data.notes ?? null })
          : await requestBusinessChanges({ adminUserId: session.user.id, businessId: id, notes: parsed.data.notes ?? null });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status });
    }
    throw error;
  }
}
