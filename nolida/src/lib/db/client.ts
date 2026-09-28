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
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
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

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[] | undefined);
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
