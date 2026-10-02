import { query } from "@/lib/db/client";
import type { BusinessProduct } from "@/types/catalog";

export interface ProductCreateInput {
  businessId: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  price: number;
  currency?: string;
  stock?: number | null;
  images?: string[];
}

export type ProductUpdateFields = Partial<
  Omit<ProductCreateInput, "businessId">
>;

const COLUMNS = `id, business_id, name, description, category_id, price,
  currency, stock, images, is_active, sort_order, created_at, updated_at`;

const UPDATE_COLUMNS: Record<keyof ProductUpdateFields, string> = {
  name: "name",
  description: "description",
  categoryId: "category_id",
  price: "price",
  currency: "currency",
  stock: "stock",
  images: "images",
};

export async function create(input: ProductCreateInput): Promise<BusinessProduct> {
  const result = await query<BusinessProduct>(
    `INSERT INTO products (
       business_id, name, description, category_id, price, currency, stock, images
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING ${COLUMNS}`,
    [
      input.businessId,
      input.name,
      input.description ?? null,
      input.categoryId ?? null,
      input.price,
      input.currency ?? "NGN",
      input.stock ?? null,
      JSON.stringify(input.images ?? []),
    ],
  );
  const row = result.rows[0] ?? null;
  if (!row) throw new Error("products.repo.create returned no row");
  return row;
}

export async function findById(id: string): Promise<BusinessProduct | null> {
  const result = await query<BusinessProduct>(
    `SELECT ${COLUMNS} FROM products WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listByBusiness(
  businessId: string,
  input: { activeOnly?: boolean } = {},
): Promise<BusinessProduct[]> {
  const result = await query<BusinessProduct>(
    `SELECT ${COLUMNS}
     FROM products
     WHERE business_id = $1
       AND ($2::boolean = FALSE OR is_active = TRUE)
     ORDER BY sort_order, created_at, id`,
    [businessId, input.activeOnly ?? false],
  );
  return result.rows;
}

export async function update(
  id: string,
  fields: ProductUpdateFields,
): Promise<BusinessProduct | null> {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return findById(id);

  const columns = entries.map(([key], index) => {
    const column = UPDATE_COLUMNS[key as keyof ProductUpdateFields];
    return `${column} = $${index + 1}${column === "images" ? `::jsonb` : ""}`;
  });
  const values = entries.map(([key, value]) =>
    key === "images" ? JSON.stringify(value ?? []) : value,
  );
  const result = await query<BusinessProduct>(
    `UPDATE products
     SET ${columns.join(", ")}
     WHERE id = $${entries.length + 1}
     RETURNING ${COLUMNS}`,
    [...values, id],
  );
  return result.rows[0] ?? null;
}

export async function deleteById(id: string): Promise<boolean> {
  const result = await query("DELETE FROM products WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function reorder(
  businessId: string,
  orderedIds: string[],
): Promise<void> {
  await query(
    `UPDATE products AS product
     SET sort_order = ordered.sort_order::INTEGER
     FROM unnest($2::UUID[]) WITH ORDINALITY AS ordered(id, sort_order)
     WHERE product.business_id = $1 AND product.id = ordered.id`,
    [businessId, orderedIds],
  );
}