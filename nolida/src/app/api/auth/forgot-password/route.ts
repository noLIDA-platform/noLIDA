import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/server/services/auth.service";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  identifier: z.string().min(1).max(320),
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
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Provide an email or phone number." } },
      { status: 400 }
    );
  }

  const ip = clientIp(request);
  const limit = checkRateLimit(
    `forgot-password:${ip}:${parsed.data.identifier}`,
    3,
    60 * 60_000
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later." } },
      { status: 429 }
    );
  }

  await requestPasswordReset({
    identifier: parsed.data.identifier,
    ip,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  // Always ok — never reveals whether the account exists.
  return NextResponse.json({ ok: true, data: {} });
}
