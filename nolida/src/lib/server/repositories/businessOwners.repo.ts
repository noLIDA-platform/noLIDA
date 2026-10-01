import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

export interface BusinessOwnerRow {
  id: string;
  business_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export async function create(
  input: { businessId: string; userId: string; role?: string },
  db?: Db
): Promise<BusinessOwnerRow> {
  const text = `
    INSERT INTO business_owners (business_id, user_id, role)
    VALUES ($1, $2, $3)
    RETURNING id, business_id, user_id, role, created_at
  `;
  const result = db
    ? await db.query<BusinessOwnerRow>(text, [input.businessId, input.userId, input.role ?? "OWNER"])
    : await query<BusinessOwnerRow>(text, [input.businessId, input.userId, input.role ?? "OWNER"]);
  const row = result.rows[0] ?? null;
  if (!row) throw new Error("businessOwners.repo.create returned no row");
  return row;
}

export async function findByBusiness(businessId: string): Promise<BusinessOwnerRow[]> {
  const result = await query<BusinessOwnerRow>(
    `SELECT id, business_id, user_id, role, created_at
     FROM business_owners
     WHERE business_id = $1`,
    [businessId]
  );
  return result.rows;
}
