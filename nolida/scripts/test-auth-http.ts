/**
 * End-to-end auth check over real HTTP.
 *
 * Unlike `test-auth.ts`, which calls the service layer directly, this drives the
 * Route Handlers exactly as a browser does — JSON envelopes, the
 * `nolida_session` cookie — so it catches wiring mistakes in the Phase 4 UI
 * contract that unit-level tests cannot see.
 *
 * The dev server must already be running:
 *   npm run dev -- -p 3001
 *
 * The 6-digit codes are printed by the dev email fallback, so point this script
 * at the server's log file to read them:
 *   $env:E2E_DEV_LOG = "c:\dev\nolida\dev-e2e.log"
 *   npx tsx --env-file-if-exists=.env.local scripts/test-auth-http.ts
 */
import { readFileSync } from "node:fs";
import { getPool } from "@/lib/db/client";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
const DEV_LOG = process.env.E2E_DEV_LOG ?? "";
const PASSWORD = "TestPassword123";
const NEW_PASSWORD = "TestPassword456";
const EMAIL = `e2e-${Date.now()}@nolida.test`;

let cookie: string | null = null;
let failures = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log(`PASS ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

type SessionData = { user?: { id?: string } | null };

type Envelope = {
  ok: boolean;
  data?: SessionData & Record<string, unknown>;
  error?: { code: string; message: string };
};

async function call(
  path: string,
  init: { method?: string; body?: unknown; anonymous?: boolean } = {},
): Promise<{ status: number; body: Envelope | null; text: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie && !init.anonymous) headers.Cookie = cookie;

  const response = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    redirect: "manual",
  });

  for (const entry of response.headers.getSetCookie()) {
    if (entry.startsWith("nolida_session=")) cookie = entry.split(";")[0] ?? null;
  }

  const text = await response.text();
  let body: Envelope | null = null;
  try {
    body = JSON.parse(text) as Envelope;
  } catch {
    body = null;
  }

  if (text.includes("password_hash")) {
    failures += 1;
    console.log(`FAIL no password_hash in response — leaked on ${path}`);
  }

  return { status: response.status, body, text };
}

/** Waits for the dev server log to contain a code for this address + purpose. */
async function readOtp(purpose: string): Promise<string | null> {
  if (!DEV_LOG) return null;
  const marker = `to=${EMAIL} purpose=${purpose}`;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const text = readFileSync(DEV_LOG, "utf8");
    const index = text.lastIndexOf(marker);
    if (index >= 0) {
      const match = text.slice(index).match(/code=(\d{6})/);
      if (match) return match[1] ?? null;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

async function main(): Promise<void> {
  const health = await call("/api/health");
  check("GET /api/health returns ok envelope", health.body?.ok === true, health.text);

  const register = await call("/api/auth/register", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  check("POST /api/auth/register", register.body?.ok === true, register.text);

  const registerCode = await readOtp("REGISTER");
  check("REGISTER code captured from dev log", registerCode !== null);

  if (registerCode) {
    const verify = await call("/api/auth/verify-otp", {
      method: "POST",
      body: { identifier: EMAIL, code: registerCode, purpose: "REGISTER" },
    });
    check("POST /api/auth/verify-otp (REGISTER)", verify.body?.ok === true, verify.text);
  }

  const login = await call("/api/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  check("POST /api/auth/login", login.body?.ok === true, login.text);
  check("login sets the nolida_session cookie", cookie !== null);

  const session = await call("/api/auth/session");
  check(
    "GET /api/auth/session returns the signed-in user",
    session.body?.data?.user?.id !== undefined,
    session.text,
  );

  const anonymous = await call("/api/auth/session", { anonymous: true });
  check(
    "session route reports user:null without a cookie",
    anonymous.body?.ok === true && anonymous.body?.data?.user === null,
    anonymous.text,
  );

  const logout = await call("/api/auth/logout", { method: "POST" });
  check("POST /api/auth/logout", logout.body?.ok === true, logout.text);

  const afterLogout = await call("/api/auth/session");
  check(
    "session is gone after logout",
    afterLogout.body?.data?.user === null,
    afterLogout.text,
  );

  const forgot = await call("/api/auth/forgot-password", {
    method: "POST",
    body: { identifier: EMAIL },
  });
  check("POST /api/auth/forgot-password", forgot.body?.ok === true, forgot.text);

  const resetCode = await readOtp("RESET");
  check("RESET code captured from dev log", resetCode !== null);

  if (resetCode) {
    // The code is submitted once: /api/auth/reset-password verifies it as part
    // of the change. Hopping through /api/auth/verify-otp first would spend it.
    const reset = await call("/api/auth/reset-password", {
      method: "POST",
      body: { identifier: EMAIL, code: resetCode, newPassword: NEW_PASSWORD },
    });
    check("POST /api/auth/reset-password", reset.body?.ok === true, reset.text);

    const replay = await call("/api/auth/reset-password", {
      method: "POST",
      body: { identifier: EMAIL, code: resetCode, newPassword: PASSWORD },
    });
    check("reset code cannot be replayed", replay.body?.ok === false, replay.text);
  }

  const oldLogin = await call("/api/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  check("old password no longer works", oldLogin.body?.ok === false, oldLogin.text);

  const newLogin = await call("/api/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: NEW_PASSWORD },
  });
  check("new password logs in", newLogin.body?.ok === true, newLogin.text);

  for (const path of ["/", "/signup", "/verify", "/forgot-password", "/reset-password"]) {
    const page = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const html = await page.text();
    check(`GET ${path} renders`, page.status === 200 && !html.includes("Application error"));
  }
}

main()
  .catch((error: unknown) => {
    console.error("e2e run failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getPool().query("DELETE FROM users WHERE email = $1", [EMAIL]);
      console.log(`cleanup: removed ${EMAIL}`);
    } catch {
      // best-effort cleanup
    }
    await getPool().end();
    if (failures > 0) {
      console.log(`${failures} CHECK(S) FAILED`);
      process.exitCode = 1;
      return;
    }
    console.log("ALL HTTP AUTH CHECKS PASSED");
  });


