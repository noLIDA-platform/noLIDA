import { withTransaction } from "@/lib/db/client";
import { AuthError } from "@/lib/server/services/auth.service";
import * as usersRepo from "@/lib/server/repositories/users.repo";
import * as businessesRepo from "@/lib/server/repositories/businesses.repo";
import * as businessOwnersRepo from "@/lib/server/repositories/businessOwners.repo";
import * as businessSubmissionsRepo from "@/lib/server/repositories/businessSubmissions.repo";
import * as approvalRecordsRepo from "@/lib/server/repositories/approvalRecords.repo";
import * as securityEventsRepo from "@/lib/server/repositories/securityEvents.repo";
import { appendRandomSuffix, generateSlug } from "@/utils/slug";

const BUSINESS_STATUS_EDITABLE = new Set([
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
]);

async function ensureAdmin(userId: string): Promise<void> {
  const user = await usersRepo.findById(userId);
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    throw new AuthError("FORBIDDEN", "Only admins can review businesses.");
  }
}

function normalizeBusinessInput(input: {
  name?: string;
  category?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  location?: string | null;
  socials?: Record<string, unknown> | null;
  hours?: Record<string, unknown> | null;
  serviceAreas?: unknown[] | null;
  photos?: unknown[] | null;
  slug?: string | null;
}): {
  name?: string;
  category?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  location?: string | null;
  socials?: Record<string, unknown> | null;
  serviceAreas?: unknown[] | null;
  hours?: Record<string, unknown> | null;
  photos?: unknown[] | null;
  slug?: string;
} {
  return {
    name: input.name?.trim() || undefined,
    category: input.category?.trim() || null,
    description: input.description?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    website: input.website?.trim() || null,
    location: input.location?.trim() || null,
    socials: input.socials ?? {},
    serviceAreas: input.serviceAreas ?? [],
    hours: input.hours ?? {},
    photos: input.photos ?? [],
    slug: input.slug?.trim() || undefined,
  };
}

async function resolveUniqueSlug(baseName: string, existingId?: string): Promise<string> {
  const base = generateSlug(baseName || "my-business");
  const initial = base || "business";
  let candidate = initial;
  let attempt = 0;

  while (attempt < 20) {
    const exists = await businessesRepo.findBySlug(candidate);
    if (!exists || (existingId && exists.id === existingId)) {
      return candidate;
    }
    candidate = appendRandomSuffix(initial);
    attempt += 1;
  }

  throw new AuthError("SLUG_GENERATION_FAILED", "Unable to create a unique business slug.");
}

export async function createBusinessDraft(
  userId: string,
  input: {
    name: string;
    category?: string | null;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    location?: string | null;
    socials?: Record<string, unknown> | null;
    hours?: Record<string, unknown> | null;
    serviceAreas?: unknown[] | null;
    photos?: unknown[] | null;
    slug?: string | null;
  }
) {
  const user = await usersRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    throw new AuthError("ACCOUNT_SUSPENDED", "Your account must be active to list a business.");
  }

  const existing = await businessesRepo.findByOwner(userId);
  if (existing) {
    return existing;
  }

  const fields = normalizeBusinessInput(input);
  const slug = await resolveUniqueSlug(input.name);

  const business = await withTransaction(async (client) => {
    const row = await businessesRepo.create(
      {
        ownerUserId: userId,
        name: fields.name || "My Business",
        slug,
        category: (fields.category as string | null) ?? null,
        description: (fields.description as string | null) ?? null,
        phone: (fields.phone as string | null) ?? null,
        email: (fields.email as string | null) ?? null,
        website: (fields.website as string | null) ?? null,
        socials: (fields.socials as Record<string, unknown> | null) ?? {},
        location: (fields.location as string | null) ?? null,
        serviceAreas: fields.serviceAreas as unknown[] | null,
        hours: (fields.hours as Record<string, unknown> | null) ?? {},
        photos: (fields.photos as unknown[] | null) ?? [],
        status: "DRAFT",
      },
      client
    );

    await businessOwnersRepo.create({ businessId: row.id, userId }, client);
    return row;
  });

  await securityEventsRepo.log({
    userId,
    eventType: "BUSINESS_DRAFT_CREATED",
    metadata: { business_id: business.id, slug },
  });

  return business;
}

export async function getMyBusiness(userId: string) {
  return businessesRepo.findByOwner(userId);
}

export async function updateBusiness(
  userId: string,
  input: {
    name?: string;
    category?: string | null;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    location?: string | null;
    socials?: Record<string, unknown> | null;
    hours?: Record<string, unknown> | null;
    serviceAreas?: unknown[] | null;
    photos?: unknown[] | null;
    slug?: string | null;
  }
) {
  const business = await businessesRepo.findByOwner(userId);
  if (!business) {
    throw new AuthError("BUSINESS_NOT_FOUND", "No business record was found for this account.");
  }

  if (!BUSINESS_STATUS_EDITABLE.has(business.status)) {
    throw new AuthError("BUSINESS_LOCKED", "This business cannot be edited in its current state.");
  }

  const fields = normalizeBusinessInput(input);
  const nextSlug = input.slug?.trim() ? await resolveUniqueSlug(input.slug, business.id) : business.slug;
  const nextValues: Record<string, unknown> = {
    ...fields,
    slug: nextSlug,
  };

  const updated = await businessesRepo.update(business.id, nextValues);
  if (!updated) {
    throw new AuthError("BUSINESS_UPDATE_FAILED", "The business could not be updated.");
  }

  await securityEventsRepo.log({
    userId,
    eventType: "BUSINESS_UPDATED",
    metadata: { business_id: updated.id, status: updated.status },
  });

  return updated;
}

export async function submitBusiness(userId: string, payload: Record<string, unknown>) {
  const business = await businessesRepo.findByOwner(userId);
  if (!business) {
    throw new AuthError("BUSINESS_NOT_FOUND", "No business was found for this account.");
  }

  const submission = await withTransaction(async (client) => {
    const nextBusiness = await businessesRepo.update(
      business.id,
      { status: "PENDING_REVIEW", submitted_at: new Date().toISOString() },
      client
    );
    if (!nextBusiness) {
      throw new AuthError("BUSINESS_UPDATE_FAILED", "Your submission could not be queued for review.");
    }

    const created = await businessSubmissionsRepo.create(
      { businessId: business.id, userId, payload },
      client
    );

    return { business: nextBusiness, submission: created };
  });

  await securityEventsRepo.log({
    userId,
    eventType: "BUSINESS_SUBMITTED",
    metadata: { business_id: business.id, submission_id: submission.submission.id },
  });

  return submission;
}

export async function getSubmissionStatus(userId: string) {
  const business = await businessesRepo.findByOwner(userId);
  if (!business) {
    return null;
  }
  const submission = await businessSubmissionsRepo.findLatestForBusiness(business.id);
  return { business, submission };
}

/**
 * The status of one business, for the `/my-business/pending` poller.
 *
 * Ownership is verified here rather than trusted from the id in the URL: an
 * id is not proof, and a caller that could poll any business could learn
 * whether it was approved. `null` covers both "no such business" and "not
 * yours", so the route answers NOT_FOUND for either — the endpoint never
 * confirms that an id it was given exists.
 */
export async function getBusinessStatusForOwner(input: {
  userId: string;
  businessId: string;
}): Promise<{ status: string; updated_at: string } | null> {
  const business = await businessesRepo.findById(input.businessId);
  if (!business || business.owner_user_id !== input.userId) {
    return null;
  }
  return { status: business.status, updated_at: business.updated_at };
}

export async function approveBusiness(input: {
  adminUserId: string;
  businessId: string;
  notes?: string | null;
}) {
  await ensureAdmin(input.adminUserId);
  const business = await businessesRepo.findById(input.businessId);
  if (!business) {
    throw new AuthError("BUSINESS_NOT_FOUND", "Business not found.");
  }

  const submission = await businessSubmissionsRepo.findLatestForBusiness(business.id);

  const result = await withTransaction(async (client) => {
    const nextBusiness = await businessesRepo.update(
      business.id,
      {
        status: "APPROVED",
        approved_at: new Date().toISOString(),
        approved_by: input.adminUserId,
        status_reason: input.notes ?? "Approved by admin review.",
      },
      client
    );

    if (!nextBusiness) {
      throw new AuthError("BUSINESS_UPDATE_FAILED", "Unable to approve the business.");
    }

    const nextSubmission = submission
      ? await businessSubmissionsRepo.updateStatus(submission.id, "APPROVED", client)
      : null;

    await approvalRecordsRepo.create(
      {
        submissionId: nextSubmission?.id ?? null,
        businessId: business.id,
        adminUserId: input.adminUserId,
        action: "APPROVE",
        notes: input.notes ?? null,
      },
      client
    );

    return { business: nextBusiness, submission: nextSubmission };
  });

  await securityEventsRepo.log({
    userId: input.adminUserId,
    eventType: "BUSINESS_APPROVED",
    metadata: { business_id: business.id, notes: input.notes ?? null },
  });

  return result;
}

export async function rejectBusiness(input: {
  adminUserId: string;
  businessId: string;
  notes?: string | null;
}) {
  await ensureAdmin(input.adminUserId);
  const business = await businessesRepo.findById(input.businessId);
  if (!business) {
    throw new AuthError("BUSINESS_NOT_FOUND", "Business not found.");
  }

  const submission = await businessSubmissionsRepo.findLatestForBusiness(business.id);

  const result = await withTransaction(async (client) => {
    const nextBusiness = await businessesRepo.update(
      business.id,
      { status: "REJECTED", status_reason: input.notes ?? "Rejected by admin review." },
      client
    );
    const nextSubmission = submission
      ? await businessSubmissionsRepo.updateStatus(submission.id, "REJECTED", client)
      : null;
    await approvalRecordsRepo.create(
      {
        submissionId: nextSubmission?.id ?? null,
        businessId: business.id,
        adminUserId: input.adminUserId,
        action: "REJECT",
        notes: input.notes ?? null,
      },
      client
    );
    return { business: nextBusiness, submission: nextSubmission };
  });

  await securityEventsRepo.log({
    userId: input.adminUserId,
    eventType: "BUSINESS_REJECTED",
    metadata: { business_id: business.id, notes: input.notes ?? null },
  });

  return result;
}

export async function requestBusinessChanges(input: {
  adminUserId: string;
  businessId: string;
  notes?: string | null;
}) {
  await ensureAdmin(input.adminUserId);
  const business = await businessesRepo.findById(input.businessId);
  if (!business) {
    throw new AuthError("BUSINESS_NOT_FOUND", "Business not found.");
  }

  const submission = await businessSubmissionsRepo.findLatestForBusiness(business.id);

  const result = await withTransaction(async (client) => {
    const nextBusiness = await businessesRepo.update(
      business.id,
      { status: "CHANGES_REQUESTED", status_reason: input.notes ?? "Changes requested by admin review." },
      client
    );
    const nextSubmission = submission
      ? await businessSubmissionsRepo.updateStatus(submission.id, "CHANGES_REQUESTED", client)
      : null;
    await approvalRecordsRepo.create(
      {
        submissionId: nextSubmission?.id ?? null,
        businessId: business.id,
        adminUserId: input.adminUserId,
        action: "REQUEST_CHANGES",
        notes: input.notes ?? null,
      },
      client
    );
    return { business: nextBusiness, submission: nextSubmission };
  });

  await securityEventsRepo.log({
    userId: input.adminUserId,
    eventType: "BUSINESS_CHANGES_REQUESTED",
    metadata: { business_id: business.id, notes: input.notes ?? null },
  });

  return result;
}
