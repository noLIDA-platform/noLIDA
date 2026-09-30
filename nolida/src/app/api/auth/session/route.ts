import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/server/services/auth.service";
import { readSessionCookie } from "@/lib/server/auth/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = readSessionCookie(request);
  if (!token) {
    return NextResponse.json({ ok: true, data: { user: null } });
  }
  const session = await getSessionUser({ sessionToken: token });
  return NextResponse.json({ ok: true, data: { user: session?.user ?? null } });
}
