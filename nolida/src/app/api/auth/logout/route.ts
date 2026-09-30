import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logout } from "@/lib/server/services/auth.service";
import { clearSessionCookie, readSessionCookie } from "@/lib/server/auth/session-cookie";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = readSessionCookie(request);
  if (token) await logout({ sessionToken: token });
  const response = NextResponse.json({ ok: true, data: {} });
  clearSessionCookie(response);
  return response;
}
