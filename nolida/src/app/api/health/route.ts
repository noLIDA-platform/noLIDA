import { NextResponse } from "next/server";
import { query } from "lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthQueryResult {
  now: string;
  version: string;
}

export async function GET() {
  try {
    const result = await query<HealthQueryResult>(
      "SELECT NOW()::text AS now, version() AS version"
    );

    const row = result.rows[0];

    return NextResponse.json({
      ok: true,
      data: {
        status: "healthy",
        timestamp: row?.now ?? new Date().toISOString(),
        database: {
          connected: true,
          version: row?.version ?? "unknown",
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed";

    return NextResponse.json(
      {
        ok: false,
        error: {
          status: "unhealthy",
          message,
        },
      },
      { status: 503 }
    );
  }
}
