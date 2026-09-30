import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getPool, withTransaction } from "@/lib/db/client";

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

async function ensureLedger(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function appliedIds(): Promise<Set<string>> {
  const result = await getPool().query<{ id: string }>(
    "SELECT id FROM _migrations"
  );
  return new Set(result.rows.map((r: { id: string }) => r.id));
}

async function main(): Promise<void> {
  await ensureLedger();

  const entries = await readdir(MIGRATIONS_DIR);
  const files = entries.filter((f) => f.endsWith(".sql")).sort();
  const applied = await appliedIds();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("No pending migrations");
    return;
  }

  for (const file of pending) {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const sql = await readFile(fullPath, "utf8");
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO _migrations (id) VALUES ($1)", [file]);
    });
    console.log(`Applied: ${file}`);
  }
}

main()
  .then(async () => {
    await getPool().end();
  })
  .catch(async (error) => {
    console.error(
      "Migration failed:",
      error instanceof Error ? error.message : error
    );
    try {
      await getPool().end();
    } catch {
      // ignore shutdown errors after a failure
    }
    process.exit(1);
  });
