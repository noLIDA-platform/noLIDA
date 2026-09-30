import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, login } from "@/lib/server/services/auth.service";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { setSessionCookie } from "@/lib/server/auth/session-cookie";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.email().max(320).optional(),
  phone: z.string().min(4).max(32).optional(),
  password: z.string().min(1).max(128),
  fingerprint: z.string().min(1).max(256).optional(),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = checkRateLimit(`login:${ip}`, 10, 15 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later." } },
      { status: 429 }
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
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Provide email or phone and password." } },
      { status: 400 }
    );
  }

  try {
    const result = await login({
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
      fingerprint: parsed.data.fingerprint,
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    const response = NextResponse.json({
      ok: true,
      data: { userId: result.userId, expiresAt: result.expiresAt.toISOString() },
    });
    setSessionCookie(response, result.sessionToken, result.expiresAt);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === "ACCOUNT_SUSPENDED" ? 403 : 401;
      return NextResponse.json(
        { ok: false, error: { code: error.code, message: error.message } },
        { status }
      );
    }
    throw error;
  }
}
