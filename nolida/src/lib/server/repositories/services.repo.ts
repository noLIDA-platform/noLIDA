import { query } from "@/lib/db/client";
import type { BusinessService } from "@/types/catalog";

export interface ServiceCreateInput {
  businessId: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: string;
  durationMinutes?: number | null;
}

export type ServiceUpdateFields = Partial<
  Omit<ServiceCreateInput, "businessId">
>;

const COLUMNS = `id, business_id, name, description, category_id, price_min,
  price_max, currency, duration_minutes, is_active, sort_order, created_at,
  updated_at`;

const UPDATE_COLUMNS: Record<keyof ServiceUpdateFields, string> = {
  name: "name",
  description: "description",
  categoryId: "category_id",
  priceMin: "price_min",
  priceMax: "price_max",
  currency: "currency",
  durationMinutes: "duration_minutes",
};

export async function create(input: ServiceCreateInput): Promise<BusinessService> {
  const result = await query<BusinessService>(
    `INSERT INTO services (
       business_id, name, description, category_id, price_min, price_max,
       currency, duration_minutes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLUMNS}`,
    [
      input.businessId,
      input.name,
      input.description ?? null,
      input.categoryId ?? null,
      input.priceMin ?? null,
      input.priceMax ?? null,
      input.currency ?? "NGN",
      input.durationMinutes ?? null,
    ],
  );
  const row = result.rows[0] ?? null;
  if (!row) throw new Error("services.repo.create returned no row");
  return row;
}

export async function findById(id: string): Promise<BusinessService | null> {
  const result = await query<BusinessService>(
    `SELECT ${COLUMNS} FROM services WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listByBusiness(
  businessId: string,
  input: { activeOnly?: boolean } = {},
): Promise<BusinessService[]> {
  const result = await query<BusinessService>(
    `SELECT ${COLUMNS}
     FROM services
     WHERE business_id = $1
       AND ($2::boolean = FALSE OR is_active = TRUE)
     ORDER BY sort_order, created_at, id`,
    [businessId, input.activeOnly ?? false],
  );
  return result.rows;
}

export async function update(
  id: string,
  fields: ServiceUpdateFields,
): Promise<BusinessService | null> {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return findById(id);

  const columns = entries.map(([key], index) => {
    const column = UPDATE_COLUMNS[key as keyof ServiceUpdateFields];
    return `${column} = $${index + 1}`;
  });
  const values = entries.map(([, value]) => value);
  const result = await query<BusinessService>(
    `UPDATE services
     SET ${columns.join(", ")}
     WHERE id = $${entries.length + 1}
     RETURNING ${COLUMNS}`,
    [...values, id],
  );
  return result.rows[0] ?? null;
}

export async function deleteById(id: string): Promise<boolean> {
  const result = await query("DELETE FROM services WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function reorder(
  businessId: string,
  orderedIds: string[],
): Promise<void> {
  await query(
    `UPDATE services AS service
     SET sort_order = ordered.sort_order::INTEGER
     FROM unnest($2::UUID[]) WITH ORDINALITY AS ordered(id, sort_order)
     WHERE service.business_id = $1 AND service.id = ordered.id`,
    [businessId, orderedIds],
  );
}