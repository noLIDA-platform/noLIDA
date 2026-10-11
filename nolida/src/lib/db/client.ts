import { Pool, type QueryResult, type QueryResultRow } from "pg";

const globalForPool = globalThis as unknown as {
  pgPool: Pool | undefined;
};

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (local) and to the Vercel project's environment variables."
    );
  }

  return new Pool({
    connectionString,
    // Supabase pooler requires TLS; its chain is not in Node's default store.
    ssl: { rejectUnauthorized: false },
    max: 10,
    min: 1,
    idleTimeoutMillis: 30_000,
    // 15s, not 10s: on a cold start the TLS handshake to the pooler can
    // outlive 10s, and a 10s budget surfaces as
    // "Connection terminated due to connection timeout" on the first request.
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
}

/**
 * Lazily created so importing this module never throws during `next build`.
 * The instance is cached on `globalThis` so dev HMR does not leak pools.
 */
export function getPool(): Pool {
  globalForPool.pgPool ??= createPool();
  return globalForPool.pgPool;
}

/** The exact message pg raises when `connectionTimeoutMillis` expires. */
const CONNECTION_TIMEOUT_MESSAGE = "Connection terminated due to connection timeout";

/**
 * Only the connect-phase timeout is retried, and that is deliberate: pg starts
 * this timer while the socket is being established, so when it fires the query
 * was never sent — retrying cannot double-write anything. A query that failed
 * for any other reason ("Connection terminated", a SQL error, a constraint)
 * may already have executed, so it is rethrown untouched.
 */
function isConnectionTimeout(error: unknown): boolean {
  return error instanceof Error && error.message.includes(CONNECTION_TIMEOUT_MESSAGE);
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  try {
    return await getPool().query<T>(text, params as unknown[] | undefined);
  } catch (error) {
    if (!isConnectionTimeout(error)) throw error;
    // One retry for the cold-start case: the pool was still handshaking when
    // the first attempt timed out. 500ms lets that handshake settle.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getPool().query<T>(text, params as unknown[] | undefined);
  }
}

export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to roll back transaction:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

// Warm-up: start the TLS handshake when the module LOADS instead of when the
// first user request arrives — the cold-start timeout this pool is tuned for
// fires precisely because the handshake was racing the first query. Fire and
// forget: a failure is swallowed here and picked up by the next real query
// (which has its own one-shot retry). The outer try/catch keeps the promise
// made by getPool() — importing this module never throws, even during
// `next build` or when DATABASE_URL is absent.
try {
  void getPool().query("SELECT 1").catch(() => {});
} catch {
  // No DATABASE_URL at load time; getPool() will throw on first real use.
}
