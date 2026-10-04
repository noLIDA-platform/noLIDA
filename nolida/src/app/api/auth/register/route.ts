import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, register } from "@/lib/server/services/auth.service";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.email().max(320).optional(),
  phone: z.string().min(4).max(32).optional(),
  password: z.string().min(8).max(128),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = checkRateLimit(`register:${ip}`, 5, 15 * 60_000);
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
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Provide a valid email or phone and a password of 8+ characters." } },
      { status: 400 }
    );
  }

  try {
    const result = await register({
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    // `result` is returned whole, so `verified` (set only by the dev OTP
    // bypass) reaches the signup page without this route knowing what it
    // means. The route stays a pass-through: it validates the body and maps
    // errors, and nothing else.
    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      const status =
        error.code === "EMAIL_TAKEN" || error.code === "PHONE_TAKEN" ? 409 : 400;
      return NextResponse.json(
        { ok: false, error: { code: error.code, message: error.message } },
        { status }
      );
    }
    throw error;
  }
}
