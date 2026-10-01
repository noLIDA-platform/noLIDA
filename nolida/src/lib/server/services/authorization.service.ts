import { AuthError } from "@/lib/server/services/auth.service";
import { generateAuthorizationCode } from "@/lib/server/auth/code-generator";
import * as usersRepo from "@/lib/server/repositories/users.repo";
import * as businessesRepo from "@/lib/server/repositories/businesses.repo";
import * as authorizationCodesRepo from "@/lib/server/repositories/authorizationCodes.repo";
import * as securityEventsRepo from "@/lib/server/repositories/securityEvents.repo";

export interface AuthorizationCodeInput {
  adminUserId: string;
  purpose?: string;
  maxUses?: number;
  notes?: string | null;
  expiresAt?: Date | string | null;
}

export async function generateCode(input: AuthorizationCodeInput) {
  const user = await usersRepo.findById(input.adminUserId);
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    throw new AuthError("FORBIDDEN", "Admins only.");
  }

  const purpose = input.purpose ?? "BUSINESS_LISTING";
  const maxUses = Math.max(1, Number(input.maxUses ?? 1) || 1);
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

  let code = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = generateAuthorizationCode();
    const existing = await authorizationCodesRepo.findByCode(code);
    if (!existing) break;
  }

  if (!code) {
    throw new AuthError("CODE_GENERATION_FAILED", "Unable to generate a unique authorization code.");
  }

  const row = await authorizationCodesRepo.create({
    code,
    purpose,
    maxUses,
    notes: input.notes ?? null,
    expiresAt: expiresAt ?? null,
    createdBy: input.adminUserId,
  });

  await securityEventsRepo.log({
    userId: input.adminUserId,
    eventType: "AUTH_CODE_GENERATED",
    metadata: {
      code,
      purpose,
      max_uses: maxUses,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    },
  });

  return row;
}

export async function redeemCode(input: {
  code: string;
  userId: string;
  ip?: string;
}): Promise<{ valid: true; codeId: string }> {
  const record = await authorizationCodesRepo.findByCode(input.code.trim());
  if (!record) {
    throw new AuthError("CODE_NOT_FOUND", "That authorization code was not found.");
  }

  if (record.status !== "ACTIVE") {
    throw new AuthError("CODE_NOT_ACTIVE", "That authorization code is no longer active.");
  }

  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
    await authorizationCodesRepo.updateStatus(record.id, "EXPIRED");
    throw new AuthError("CODE_EXPIRED", "That authorization code has expired.");
  }

  if (record.uses_count >= record.max_uses) {
    await authorizationCodesRepo.updateStatus(record.id, "USED");
    throw new AuthError("CODE_EXHAUSTED", "That authorization code has already been used.");
  }

  const existingBusiness = await businessesRepo.findByOwner(input.userId);
  if (
    existingBusiness &&
    ["APPROVED", "PENDING_REVIEW"].includes(existingBusiness.status)
  ) {
    throw new AuthError(
      "USER_ALREADY_HAS_BUSINESS",
      "You already have a business submission in progress or approved."
    );
  }

  const updated = await authorizationCodesRepo.incrementUses(record.id);
  const nextUses = updated?.uses_count ?? record.uses_count + 1;
  if (nextUses >= record.max_uses) {
    await authorizationCodesRepo.updateStatus(record.id, "USED");
  }

  await authorizationCodesRepo.logUsage({
    codeId: record.id,
    userId: input.userId,
    ipAddress: input.ip ?? undefined,
    metadata: { code: record.code, purpose: record.purpose },
  });

  await securityEventsRepo.log({
    userId: input.userId,
    eventType: "AUTH_CODE_REDEEMED",
    ipAddress: input.ip ?? undefined,
    metadata: {
      code_id: record.id,
      purpose: record.purpose,
      uses_count: nextUses,
      max_uses: record.max_uses,
    },
  });

  return { valid: true, codeId: record.id };
}
