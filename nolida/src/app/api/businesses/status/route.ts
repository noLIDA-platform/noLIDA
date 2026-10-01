import { NextResponse, type NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { getSubmissionStatus } from "@/lib/server/services/business.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Sign in to check your business status." } }, { status: 401 });
  }

  const status = await getSubmissionStatus(session.user.id);
  return NextResponse.json({ ok: true, data: status });
}
