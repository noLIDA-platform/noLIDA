import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

export interface BusinessRow {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  socials: Record<string, unknown> | null;
  location: string | null;
  service_areas: unknown[] | null;
  hours: Record<string, unknown> | null;
  photos: unknown[] | null;
  status: string;
  status_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = [
  "id",
  "owner_user_id",
  "name",
  "slug",
  "category",
  "description",
  "phone",
  "email",
  "website",
  "socials",
  "location",
  "service_areas",
  "hours",
  "photos",
  "status",
  "status_reason",
  "submitted_at",
  "approved_at",
  "approved_by",
  "created_at",
  "updated_at",
].join(", ");

export async function create(
  input: {
    ownerUserId: string;
    name: string;
    slug: string;
    category?: string | null;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    socials?: Record<string, unknown> | null;
    location?: string | null;
    serviceAreas?: unknown[] | null;
    hours?: Record<string, unknown> | null;
    photos?: unknown[] | null;
    status?: string;
    submittedAt?: Date | string | null;
    approvedAt?: Date | string | null;
    approvedBy?: string | null;
  },
  db?: Db
): Promise<BusinessRow> {
  const text = `
    INSERT INTO businesses (
      owner_user_id, name, slug, category, description, phone, email, website,
      socials, location, service_areas, hours, photos, status, submitted_at, approved_at,
      approved_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING ${COLUMNS}
  `;

  const params = [
    input.ownerUserId,
    input.name,
    input.slug,
    input.category ?? null,
    input.description ?? null,
    input.phone ?? null,
    input.email ?? null,
    input.website ?? null,
    input.socials ? JSON.stringify(input.socials) : "{}",
    input.location ?? null,
    input.serviceAreas ? JSON.stringify(input.serviceAreas) : "[]",
    input.hours ? JSON.stringify(input.hours) : "{}",
    input.photos ? JSON.stringify(input.photos) : "[]",
    input.status ?? "DRAFT",
    input.submittedAt ? new Date(input.submittedAt).toISOString() : null,
    input.approvedAt ? new Date(input.approvedAt).toISOString() : null,
    input.approvedBy ?? null,
  ];

  const result = db ? await db.query<BusinessRow>(text, params) : await query<BusinessRow>(text, params);
  const row = result.rows[0] ?? null;
  if (!row) throw new Error("businesses.repo.create returned no row");
  return row;
}

export async function findById(id: string, db?: Db): Promise<BusinessRow | null> {
  const text = `SELECT ${COLUMNS} FROM businesses WHERE id = $1`;
  const result = db ? await db.query<BusinessRow>(text, [id]) : await query<BusinessRow>(text, [id]);
  return result.rows[0] ?? null;
}

export async function findBySlug(slug: string, db?: Db): Promise<BusinessRow | null> {
  const text = `SELECT ${COLUMNS} FROM businesses WHERE slug = $1`;
  const result = db ? await db.query<BusinessRow>(text, [slug]) : await query<BusinessRow>(text, [slug]);
  return result.rows[0] ?? null;
}

export async function findByOwner(ownerUserId: string, db?: Db): Promise<BusinessRow | null> {
  const text = `SELECT ${COLUMNS} FROM businesses WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1`;
  const result = db
    ? await db.query<BusinessRow>(text, [ownerUserId])
    : await query<BusinessRow>(text, [ownerUserId]);
  return result.rows[0] ?? null;
}

export async function update(
  id: string,
  fields: Record<string, unknown>,
  db?: Db
): Promise<BusinessRow | null> {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return findById(id, db);
  }

  const setClauses = entries.map(([key], index) => {
    const column = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    return `${column} = $${index + 1}`;
  });

  const values = entries.map(([, value]) => {
    if (value === null) return null;
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === "object") return JSON.stringify(value);
    return value;
  });

  const text = `
    UPDATE businesses
    SET ${setClauses.join(", ")}, updated_at = NOW()
    WHERE id = $${entries.length + 1}
    RETURNING ${COLUMNS}
  `;

  const result = db
    ? await db.query<BusinessRow>(text, [...values, id])
    : await query<BusinessRow>(text, [...values, id]);
  return result.rows[0] ?? null;
}

export async function updateStatus(
  id: string,
  status: string,
  reason?: string | null,
  db?: Db
): Promise<BusinessRow | null> {
  const text = `
    UPDATE businesses
    SET status = $2,
        status_reason = $3,
        updated_at = NOW()
    WHERE id = $1
    RETURNING ${COLUMNS}
  `;
  const result = db
    ? await db.query<BusinessRow>(text, [id, status, reason ?? null])
    : await query<BusinessRow>(text, [id, status, reason ?? null]);
  return result.rows[0] ?? null;
}

export async function slugExists(slug: string, db?: Db): Promise<boolean> {
  const text = `SELECT 1 FROM businesses WHERE slug = $1 LIMIT 1`;
  const result = db
    ? await db.query<{ one: number }>(text, [slug])
    : await query<{ one: number }>(text, [slug]);
  return result.rows.length > 0;
}
