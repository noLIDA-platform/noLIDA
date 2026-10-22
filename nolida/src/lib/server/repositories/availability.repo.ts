import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type { AvailabilitySlot } from "@/lib/availability/types";

type Db = Pick<PoolClient, "query">;

export interface AvailabilityRow {
  id: string;
  business_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listByBusiness(
  businessId: string,
  db?: Db
): Promise<AvailabilityRow[]> {
  const text = `
    SELECT id, business_id, day_of_week, start_time,
           end_time, slot_minutes, is_active, created_at, updated_at
    FROM availability
    WHERE business_id = $1
    ORDER BY day_of_week ASC, start_time ASC
  `;
  const result = db
    ? await db.query<AvailabilityRow>(text, [businessId])
    : await query<AvailabilityRow>(text, [businessId]);
  return result.rows;
}

/** Delete every availability row for a business, then insert the new set. */
export async function replaceAllForBusiness(
  businessId: string,
  entries: Omit<AvailabilityRow, "id" | "created_at" | "updated_at">[],
  db: Db
): Promise<AvailabilityRow[]> {
  await db.query(
    `DELETE FROM availability WHERE business_id = $1`,
    [businessId]
  );

  if (entries.length === 0) return [];

  const values: unknown[] = [];
  const tuples: string[] = [];
  let i = 1;
  for (const e of entries) {
    tuples.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`);
    values.push(
      businessId,
      e.day_of_week,
      e.start_time,
      e.end_time,
      e.slot_minutes,
      e.is_active
    );
    i += 6;
  }

  const text = `
    INSERT INTO availability
      (business_id, day_of_week, start_time, end_time, slot_minutes, is_active)
    VALUES ${tuples.join(", ")}
    RETURNING id, business_id, day_of_week, start_time, end_time, slot_minutes, is_active, created_at, updated_at
  `;
  const result = await db.query<AvailabilityRow>(text, values);
  return result.rows;
}

export async function create(
  input: {
    businessId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotMinutes?: number;
    isActive?: boolean;
  },
  db?: Db
): Promise<AvailabilityRow> {
  const text = `
    INSERT INTO availability
      (business_id, day_of_week, start_time, end_time, slot_minutes, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, business_id, day_of_week, start_time, end_time,
              slot_minutes, is_active, created_at, updated_at
  `;
  const result = db
    ? await db.query<AvailabilityRow>(text, [
        input.businessId,
        input.dayOfWeek,
        input.startTime,
        input.endTime,
        input.slotMinutes ?? 60,
        input.isActive ?? true,
      ])
    : await query<AvailabilityRow>(text, [
        input.businessId,
        input.dayOfWeek,
        input.startTime,
        input.endTime,
        input.slotMinutes ?? 60,
        input.isActive ?? true,
      ]);
  return result.rows[0]!;
}

export async function update(
  id: string,
  fields: Partial<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    slot_minutes: number;
    is_active: boolean;
  }>,
  db?: Db
): Promise<AvailabilityRow | null> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return findById(id, db);

  const setClauses = entries.map(([key], index) => `$${index + 1} = ${key}`);
  const values = entries.map(([, v]) => v);
  const text = `
    UPDATE availability
    SET ${setClauses.join(", ")}, updated_at = NOW()
    WHERE id = $${entries.length + 1}
    RETURNING id, business_id, day_of_week, start_time, end_time,
              slot_minutes, is_active, created_at, updated_at
  `;
  const result = db
    ? await db.query<AvailabilityRow>(text, [...values, id])
    : await query<AvailabilityRow>(text, [...values, id]);
  return result.rows[0] ?? null;
}

export async function findById(id: string, db?: Db): Promise<AvailabilityRow | null> {
  const text = `
    SELECT id, business_id, day_of_week, start_time, end_time,
           slot_minutes, is_active, created_at, updated_at
    FROM availability WHERE id = $1
  `;
  const result = db
    ? await db.query<AvailabilityRow>(text, [id])
    : await query<AvailabilityRow>(text, [id]);
  return result.rows[0] ?? null;
}

export async function deleteById(id: string, db?: Db): Promise<void> {
  const text = "DELETE FROM availability WHERE id = $1";
  if (db) await db.query(text, [id]);
  else await query(text, [id]);
}