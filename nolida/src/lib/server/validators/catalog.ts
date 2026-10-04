import { z } from "zod";

const name = z.string().trim().min(2).max(120);
const description = z.string().max(1000).nullable().optional();
const categoryId = z.uuid().nullable().optional();
const price = z.number().int().min(0).max(2_147_483_647);

/**
 * The /list-your-business request form (Phase 7E).
 *
 * Every optional field accepts an empty string and is stored as null, because
 * a text input that the user focused and left alone sends `""`, not `undefined`
 * — treating that as "provided" would write empty categories and emails.
 *
 * The bounds here mirror `businessRequest.service.validate` and the CHECK
 * constraints in migration 009. Three layers on purpose; see the note there.
 */
export const businessRequestSchema = z.object({
  businessName: name,
  category: z.string().trim().max(60).nullable().optional(),
  contactEmail: z.email().max(320).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const createServiceSchema = z.object({
  name,
  description,
  categoryId,
  priceMin: price.nullable().optional(),
  priceMax: price.nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
});

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0);

export const createProductSchema = z.object({
  name,
  description,
  categoryId,
  price,
  stock: z.number().int().min(0).nullable().optional(),
  images: z.array(z.url()).max(12).optional(),
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0);

export const categoryQuerySchema = z.object({
  activeOnly: z.enum(["true", "false"]).optional().transform((value) => value !== "false"),
});