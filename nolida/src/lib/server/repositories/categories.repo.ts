import { query } from "@/lib/db/client";
import type { Category } from "@/types/catalog";

const COLUMNS = `id, name, slug, parent_id, icon, sort_order, is_active,
  created_at, updated_at`;

export async function listAll(input: { activeOnly?: boolean } = {}): Promise<Category[]> {
  const result = await query<Category>(
    `SELECT ${COLUMNS}
     FROM categories
     WHERE ($1::boolean = FALSE OR is_active = TRUE)
     ORDER BY sort_order, name, id`,
    [input.activeOnly ?? false],
  );
  return result.rows;
}

export async function findById(id: string): Promise<Category | null> {
  const result = await query<Category>(
    `SELECT ${COLUMNS} FROM categories WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function findBySlug(slug: string): Promise<Category | null> {
  const result = await query<Category>(
    `SELECT ${COLUMNS} FROM categories WHERE slug = $1`,
    [slug],
  );
  return result.rows[0] ?? null;
}