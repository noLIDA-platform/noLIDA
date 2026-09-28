import { NextResponse } from "next/server";
import { query } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await query<{ now: string; version: string }>(
      "SELECT NOW()::text AS now, version() AS version"
    );

    return NextResponse.json({
      ok: true,
      data: {
        status: "healthy",
        database: "connected",
        serverTime: result.rows[0].now,
        postgresVersion: result.rows[0].version.split(" ")[1],
        environment: process.env.NODE_ENV ?? "unknown",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DB_UNREACHABLE",
          message: "Could not reach the database.",
          detail: process.env.NODE_ENV === "production" ? undefined : message,
        },
      },
      { status: 500 }
    );
  }
}
