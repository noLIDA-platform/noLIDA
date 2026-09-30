import { getPool } from "@/lib/db/client";
import {
  getSessionUser,
  login,
  logout,
  register,
  verifyOtp,
} from "@/lib/server/services/auth.service";

const TEST_EMAIL = "test@nolida.dev";
const TEST_PASSWORD = "TestPassword123";

async function step(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`SUCCESS: ${name}`);
  } catch (error) {
    console.log(
      `FAILED: ${name}: ${error instanceof Error ? `${error.constructor.name} ${error.message}` : String(error)}`
    );
    throw error;
  }
}

// Mutable ref so the catch block can clean up a partially-created user.
const userIdRef: { value: string | null } = { value: null };

async function main(): Promise<void> {
  let otpCode: string | null = null;
  let sessionToken: string | null = null;
  let userId: string | null = null;

  // 1. Register the test user and capture the OTP from dev console output.
  const originalLog = console.log;
  const captured: string[] = [];
  console.log = (...args: unknown[]) => {
    captured.push(args.map((a) => String(a)).join(" "));
  };
  try {
    const result = await register({ email: TEST_EMAIL, password: TEST_PASSWORD });
    userId = result.userId;
    userIdRef.value = result.userId;
  } finally {
    console.log = originalLog;
  }
  console.log(`SUCCESS: register userId=${userId}`);
  for (const line of captured) {
    const match = line.match(/code=(\d{6})/);
    if (match) otpCode = match[1] ?? null;
  }
  if (!otpCode) throw new Error("Could not read OTP from console output");
  console.log("SUCCESS: captured OTP from dev output");

  await step("verifyOtp", async () => {
    await verifyOtp({ identifier: TEST_EMAIL, code: otpCode as string, purpose: "REGISTER" });
  });

  await step("login", async () => {
    const result = await login({ email: TEST_EMAIL, password: TEST_PASSWORD });
    sessionToken = result.sessionToken;
    userId = result.userId;
    console.log(`sessionToken=${sessionToken}`);
  });

  await step("getSessionUser returns user", async () => {
    const session = await getSessionUser({ sessionToken: sessionToken as string });
    if (!session || session.user.id !== userId) {
      throw new Error("getSessionUser did not return the test user");
    }
    if ("password_hash" in session.user) {
      throw new Error("password_hash leaked in session user");
    }
  });

  await step("logout", async () => {
    await logout({ sessionToken: sessionToken as string });
  });

  await step("getSessionUser returns null after logout", async () => {
    const session = await getSessionUser({ sessionToken: sessionToken as string });
    if (session !== null) throw new Error("session still active after logout");
  });

  await step("cleanup test user", async () => {
    await getPool().query("DELETE FROM users WHERE email = $1", [TEST_EMAIL]);
  });

  console.log("ALL AUTH CHECKS PASSED");
}

main()
  .then(async () => {
    await getPool().end();
  })
  .catch(async (error) => {
    console.error(
      "test-auth failed:",
      error instanceof Error ? error.message : error
    );
    try {
      if (userIdRef.value) {
        await getPool().query("DELETE FROM users WHERE id = $1", [userIdRef.value]);
        console.log("cleanup: removed partial test user");
      } else {
        await getPool().query("DELETE FROM users WHERE email = $1", [TEST_EMAIL]);
      }
    } catch {
      // best effort cleanup
    }
    try {
      await getPool().end();
    } catch {
      // ignore shutdown errors after a failure
    }
    process.exit(1);
  });

