import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, verifyOtp } from "@/lib/server/services/auth.service";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  identifier: z.string().min(1).max(320),
  code: z.string().regex(/^\d{6}$/),
  purpose: z.enum(["REGISTER", "LOGIN", "RESET", "VERIFY_CONTACT"]),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export async function POST(request: Request) {
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
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Provide identifier, a 6-digit code, and purpose." } },
      { status: 400 }
    );
  }

  const ip = clientIp(request);
  const limit = checkRateLimit(
    `verify-otp:${ip}:${parsed.data.identifier}`,
    10,
    15 * 60_000
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later." } },
      { status: 429 }
    );
  }

  try {
    const result = await verifyOtp({
      identifier: parsed.data.identifier,
      code: parsed.data.code,
      purpose: parsed.data.purpose,
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: { code: error.code, message: error.message } },
        { status: 400 }
      );
    }
    throw error;
  }
}
