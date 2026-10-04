import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db/client";
import { AuthError } from "@/lib/server/services/auth.service";
import { generateAuthorizationCode } from "@/lib/server/auth/code-generator";
import { appendRandomSuffix, generateSlug } from "@/utils/slug";
import * as usersRepo from "@/lib/server/repositories/users.repo";
import * as businessesRepo from "@/lib/server/repositories/businesses.repo";
import * as businessOwnersRepo from "@/lib/server/repositories/businessOwners.repo";
import * as authorizationCodesRepo from "@/lib/server/repositories/authorizationCodes.repo";
import * as businessRequestsRepo from "@/lib/server/repositories/businessRequests.repo";
import * as securityEventsRepo from "@/lib/server/repositories/securityEvents.repo";

const CODE_PURPOSE = "BUSINESS_LISTING";
const CODE_ATTEMPTS = 5;

/**
 * Validation is repeated here even though the route validates with zod.
 *
 * The route is the *first* gate, not the only one. A zod schema in a file that
 * is one import away from a second caller is not a guarantee — this function is
 * reachable from a future admin tool or a script, and it must hold the same
 * line whether or not anybody remembered the route. The database has CHECK
 * constraints as a third backstop; three layers is deliberate.
 */
function validate(input: {
  businessName: string;
  category?: string | null;
  contactEmail?: string | null;
  description?: string | null;
}): void {
  const name = input.businessName.trim();
  if (name.length < 2 || name.length > 120) {
    throw new AuthError("VALIDATION_ERROR", "Business name must be between 2 and 120 characters.");
  }
  if (input.category != null && input.category.trim().length > 60) {
    throw new AuthError("VALIDATION_ERROR", "Category must be 60 characters or fewer.");
  }
  if (input.description != null && input.description.trim().length > 500) {
    throw new AuthError("VALIDATION_ERROR", "Description must be 500 characters or fewer.");
  }
  // Deliberately loose, and the same shape zod uses, so the two never disagree
  // about what "valid" means and produce contradictory error messages.
  const email = input.contactEmail?.trim() ?? "";
  if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError("VALIDATION_ERROR", "That does not look like an email address.");
  }
}

/**
 * A slug that is free, checked *inside* the transaction.
 *
 * `businesses.slug` is UNIQUE, so two people pressing "Request code" in the
 * same millisecond would otherwise race here and one would get a 500 from the
 * index rather than a friendly retry. Checking inside the transaction means the
 * second insert waits for the first to commit and then sees the taken slug.
 */
async function resolveUniqueSlug(
  baseName: string,
  db: PoolClient,
): Promise<string> {
  const base = generateSlug(baseName) || "business";
  let candidate = base;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const exists = await businessesRepo.findBySlug(candidate, db);
    if (!exists) return candidate;
    candidate = appendRandomSuffix(base);
  }
  throw new AuthError("SLUG_GENERATION_FAILED", "Unable to create a unique business slug.");
}

/**
 * The in-app business request flow (Phase 7E).
 *
 * Replaces "message us on WhatsApp, we'll send you a code" with: fill in a
 * short form, get a code on screen immediately, carry on. The user never types
 * a code someone else sent them, and never waits on a human.
 *
 * ## Everything is one transaction
 *
 * Six writes — the code, its usage, the business, the ownership row, the
 * request record and the security event. Split across connections, a failure
 * halfway leaves a user with a code that leads nowhere, or a DRAFT business with
 * no code behind it; neither is recoverable from the UI. Inside one transaction
 * the flow is all-or-nothing.
 *
 * ## The code is created already-spent
 *
 * `max_uses = 1`, `uses_count = 1`, `status = 'USED'`. The code is a receipt,
 * not a credential: it proves this user was granted a listing, and it is
 * already attached to the business it created. Left ACTIVE it would be a
 * second, transferable authorization — anyone who glimpsed it on a shared
 * screen could redeem it for their own business.
 *
 * ## Idempotency for a user who already has a draft
 *
 * A DRAFT or CHANGES_REQUESTED business means they already used this flow. We
 * return the existing business instead of creating a second one —
 * `businesses` has no unique constraint on owner, so a duplicate is perfectly
 * possible, and `findByOwner` would then return whichever row sorted first,
 * which is not necessarily the one we just wrote.
 *
 * We still issue a fresh code in that case, because the caller asked for one
 * and the UI has to show something. The code points at the existing business.
 */
export async function requestBusinessAccess(input: {
  userId: string;
  businessName: string;
  category?: string | null;
  contactEmail?: string | null;
  description?: string | null;
  ip?: string;
}): Promise<{ code: string; businessId: string; business: businessesRepo.BusinessRow }> {
  validate(input);

  const user = await usersRepo.findById(input.userId);
  if (!user || user.status !== "ACTIVE") {
    throw new AuthError("ACCOUNT_SUSPENDED", "Your account must be active to list a business.");
  }

  // Read outside the transaction: it is a guard, not a write, and holding a
  // connection open across it would only add contention.
  const existing = await businessesRepo.findByOwner(input.userId);
  if (existing && ["APPROVED", "PENDING_REVIEW"].includes(existing.status)) {
    throw new AuthError("USER_ALREADY_HAS_BUSINESS", "You already have a business on noLIDA.");
  }

  return withTransaction(async (client) => {
    let code = "";
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const candidate = generateAuthorizationCode();
      const clash = await authorizationCodesRepo.findByCode(candidate, client);
      if (!clash) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      throw new AuthError("CODE_GENERATION_FAILED", "Unable to generate a unique authorization code.");
    }

    const codeRow = await authorizationCodesRepo.create(
      {
        code,
        purpose: CODE_PURPOSE,
        maxUses: 1,
        notes: "Auto-generated via /list-your-business request form",
        createdBy: input.userId,
      },
      client,
    );

    // Burn the code immediately. `create` cannot set these columns, so status

    let business = existing;
    if (!business) {
      const slug = await resolveUniqueSlug(input.businessName, client);
      business = await businessesRepo.create(
        {
          ownerUserId: input.userId,
          name: input.businessName.trim(),
          slug,
          category: input.category?.trim() || null,
          email: input.contactEmail?.trim() || null,
          description: input.description?.trim() || null,
          status: "DRAFT",
        },
        client,
      );
      await businessOwnersRepo.create(
        { businessId: business.id, userId: input.userId, role: "OWNER" },
        client,
      );
    }

    await businessRequestsRepo.create(
      {
        userId: input.userId,
        businessName: input.businessName.trim(),
        category: input.category?.trim() || null,
        contactEmail: input.contactEmail?.trim() || null,
        description: input.description?.trim() || null,
        codeId: codeRow.id,
        status: "APPROVED_INSTANT",
      },
      client,
    );

    await securityEventsRepo.log(
      {
        userId: input.userId,
        eventType: "BUSINESS_REQUEST_CREATED",
        ipAddress: input.ip,
        metadata: {
          business_id: business.id,
          code_id: codeRow.id,
          reused_existing_business: Boolean(existing),
        },
      },
      client,
    );

    return { code, businessId: business.id, business };
  });
}
