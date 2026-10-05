import { z } from "zod";
import {
  MAX_ATTACHMENTS,
  MAX_BUDGET,
  MAX_DESCRIPTION_LEN,
  MAX_LOCATION_LEN,
  MAX_MESSAGE_LEN,
  MAX_NOTE_LEN,
  MAX_TITLE_LEN,
  MIN_DESCRIPTION_LEN,
  MIN_MESSAGE_LEN,
  MIN_TITLE_LEN,
  REQUEST_URGENCIES,
} from "@/lib/requests/constants";

/**
 * Request and response schemas.
 *
 * The boundary. The service validates again and the database holds the final
 * CHECK constraints — three layers, because the rule "a request title is 5 to
 * 200 characters" should survive a new caller that skips all but one of them.
 *
 * Every bound comes from `@/lib/requests/constants`, never a literal: the
 * composer shows a character counter against those same numbers, and a second
 * copy here would drift from what the user was told they may type.
 *
 * Budgets are MAJOR units (naira) — `50000` means ₦50,000 — unlike products and
 * services, which are minor units. Converting to kobo somewhere in the middle
 * would be unit confusion that shows up as a price off by a factor of a hundred.
 */

/** `YYYY-MM-DD`. Validated as a real calendar date, not just a string. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "Use a valid date.",
  });

/** https-only, because every attachment renders into an `src`. */
const attachments = z
  .array(
    z
      .string()
      .url()
      .max(2048)
      .refine((value) => value.startsWith("https://"), {
        message: "Attachments must be https URLs.",
      })
  )
  .max(MAX_ATTACHMENTS);

const budgetShape = {
  budgetMin: z.coerce.number().int().min(0).max(MAX_BUDGET).nullish(),
  budgetMax: z.coerce.number().int().min(0).max(MAX_BUDGET).nullish(),
};

/**
 * A deadline must be in the future.
 *
 * A request with a deadline that has already passed is not a request anybody can
 * answer — it would sit in the open feed forever looking answerable. Checked
 * here and again in the service, because this one is time-dependent and a request
 * validated at 23:59 and submitted at 00:01 is a different question.
 */
const futureDate = isoDate.refine(
  (value) => Date.parse(`${value}T23:59:59Z`) > Date.now(),
  { message: "Choose a date that has not passed yet." }
);

/**
 * `₦50,000 – ₦20,000` is not a generous budget, it is a mistake.
 *
 * Returns void: a `superRefine` callback reports through `ctx.addIssue`, and
 * returning the value makes it a plain `.refine` shape.
 */
function budgetOrdered<T extends { budgetMin?: number | null; budgetMax?: number | null }>(
  data: T,
  ctx: z.RefinementCtx
): void {
  if (
    data.budgetMin != null &&
    data.budgetMax != null &&
    data.budgetMax < data.budgetMin
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["budgetMax"],
      message: "The maximum budget cannot be lower than the minimum.",
    });
  }
}

export const createRequestSchema = z
  .object({
    title: z.string().trim().min(MIN_TITLE_LEN).max(MAX_TITLE_LEN),
    description: z
      .string()
      .trim()
      .min(MIN_DESCRIPTION_LEN)
      .max(MAX_DESCRIPTION_LEN),
    categoryId: z.uuid().nullish(),
    ...budgetShape,
    currency: z.string().trim().max(8).optional(),
    urgency: z.enum(REQUEST_URGENCIES).optional(),
    location: z.string().trim().max(MAX_LOCATION_LEN).nullish(),
    deadline: futureDate.nullish(),
    attachments: attachments.nullish(),
  })
  // `superRefine`, not `refine`: this check needs the context object to add an
  // issue against `budgetMax` specifically, and `.refine` only takes the value.
  .superRefine(budgetOrdered);

/**
 * The PATCH body.
 *
 * Every field optional, and at least one required — an empty PATCH is almost
 * certainly a bug in the caller, and silently returning the unchanged row would
 * hide it. `status` is deliberately absent: a request's lifecycle moves through
 * accept and close, not through an edit.
 */
export const updateRequestSchema = z
  .object({
    title: z.string().trim().min(MIN_TITLE_LEN).max(MAX_TITLE_LEN).optional(),
    description: z
      .string()
      .trim()
      .min(MIN_DESCRIPTION_LEN)
      .max(MAX_DESCRIPTION_LEN)
      .optional(),
    categoryId: z.uuid().nullish(),
    ...budgetShape,
    urgency: z.enum(REQUEST_URGENCIES).optional(),
    location: z.string().trim().max(MAX_LOCATION_LEN).nullish(),
    deadline: futureDate.nullish(),
    attachments: attachments.nullish(),
  })
  .superRefine(budgetOrdered)
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

/**
 * A response to a request.
 *
 * `businessId` is NOT here and must never be. It is resolved on the server from
 * the signed-in user's own APPROVED business — a body field would be a client
 * choosing which business it answers as, which is how one business ends up
 * answering on behalf of another.
 */
export const respondToRequestSchema = z.object({
  message: z.string().trim().min(MIN_MESSAGE_LEN).max(MAX_MESSAGE_LEN),
  priceEstimate: z.coerce.number().int().min(0).max(MAX_BUDGET).nullish(),
  availabilityNote: z.string().trim().max(MAX_NOTE_LEN).nullish(),
  attachments: attachments.nullish(),
});

/** Closing is one of three states. Never OPEN — that is what accepting is for. */
export const closeRequestSchema = z.object({
  status: z.enum(["CLOSED", "CANCELLED", "FULFILLED"]).optional(),
});

export const listRequestsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().max(200).nullish(),
  categoryId: z.uuid().nullish(),
  location: z.string().trim().max(MAX_LOCATION_LEN).nullish(),
  urgency: z.enum(REQUEST_URGENCIES).nullish(),
});

export const listMineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().max(200).nullish(),
});

export const listResponsesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().max(200).nullish(),
});