import { withTransaction } from "@/lib/db/client";
import { ServiceError } from "@/lib/server/services/service-error";
import * as requestsRepo from "@/lib/server/repositories/requests.repo";
import * as requestResponsesRepo from "@/lib/server/repositories/requestResponses.repo";
import * as businessesRepo from "@/lib/server/repositories/businesses.repo";
import * as securityEventsRepo from "@/lib/server/repositories/securityEvents.repo";
import type {
  RequestRow,
  RequestUrgency,
} from "@/lib/server/repositories/requests.repo";
import type { ResponseRow } from "@/lib/server/repositories/requestResponses.repo";
import {
  ACCEPTING_STATUSES,
  MIN_DESCRIPTION_LEN,
  MIN_TITLE_LEN,
} from "@/lib/requests/constants";

export interface CreateRequestInput {
  userId: string;
  title: string;
  description: string;
  categoryId?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string;
  urgency?: RequestUrgency;
  location?: string | null;
  deadline?: string | null;
  attachments?: unknown;
}

/**
 * The user's own APPROVED business, or null.
 *
 * The single gate on who may respond, and it is resolved from the SESSION every
 * time rather than accepted from a request body. A `businessId` in the payload
 * would let any signed-in user answer as any business in the database.
 *
 * PENDING_REVIEW and DRAFT businesses are excluded on purpose: somebody halfway
 * through the approval flow should not be collecting work before they are allowed
 * to trade.
 */
export async function getApprovedBusinessForUser(
  userId: string
): Promise<businessesRepo.BusinessRow | null> {
  const business = await businessesRepo.findByOwner(userId);
  if (!business || business.status !== "APPROVED") return null;
  return business;
}

/**
 * Create a request, and the feed post that advertises it.
 *
 * Both rows go in ONE transaction. A request with no feed post is invisible to
 * discovery, and a feed post pointing at a rolled-back request is a dead link in
 * somebody's home feed — neither half is useful on its own.
 *
 * The audit row takes the transaction client too. Written on the pool it would
 * outlive a rollback and record something that never happened.
 */
export async function createRequest(
  input: CreateRequestInput
): Promise<RequestRow> {
  // Re-checked here as well as at the boundary. The deadline rule is
  // time-dependent, and a request validated at 23:59 and submitted at 00:01 is a
  // different question.
  if (input.deadline) {
    const endOfDeadline = Date.parse(`${input.deadline}T23:59:59Z`);
    if (Number.isNaN(endOfDeadline) || endOfDeadline <= Date.now()) {
      throw new ServiceError(
        "INVALID",
        "Choose a date that has not passed yet.",
      );
    }
  }
  if (input.title.trim().length < MIN_TITLE_LEN) {
    throw new ServiceError(
      "INVALID",
      `Give your request a title of at least ${MIN_TITLE_LEN} characters.`,
    );
  }
  if (input.description.trim().length < MIN_DESCRIPTION_LEN) {
    throw new ServiceError(
      "INVALID",
      `Describe what you need in at least ${MIN_DESCRIPTION_LEN} characters.`,
    );
  }
  if (
    input.budgetMin != null &&
    input.budgetMax != null &&
    input.budgetMax < input.budgetMin
  ) {
    throw new ServiceError(
      "INVALID",
      "The maximum budget cannot be lower than the minimum.",
    );
  }

  return withTransaction(async (client) => {
    const created = await requestsRepo.create(
      {
        userId: input.userId,
        title: input.title.trim(),
        description: input.description.trim(),
        categoryId: input.categoryId ?? null,
        budgetMin: input.budgetMin ?? null,
        budgetMax: input.budgetMax ?? null,
        currency: input.currency ?? null,
        urgency: input.urgency ?? null,
        location: input.location?.trim() || null,
        deadline: input.deadline ?? null,
        attachments: input.attachments ?? null,
      },
      client
    );

    await requestsRepo.createFeedPost(
      {
        id: created.id,
        userId: created.user_id,
        title: created.title,
        description: created.description,
        categoryId: created.category_id,
      },
      client
    );

    await securityEventsRepo.log(
      {
        userId: input.userId,
        eventType: "REQUEST_CREATED",
        metadata: {
          requestId: created.id,
          urgency: created.urgency,
          hasBudget:
            created.budget_min != null || created.budget_max != null,
        },
      },
      client
    );

    return created;
  });
}

export interface GetRequestResult {
  request: RequestRow;
  isOwn: boolean;
  /** The viewer's own APPROVED business, when they have one. */
  business: businessesRepo.BusinessRow | null;
  /** Everything needed to decide what to render, decided in one place. */
  canRespond: boolean;
  hasResponded: boolean;
}

/**
 * One request, plus the viewer's standing in relation to it.
 *
 * `canRespond` is computed here rather than in the page so the rule exists once:
 * not your own request, still accepting offers, you have an APPROVED business,
 * and you have not already answered it.
 */
export async function getRequest(input: {
  requestId: string;
  viewerId: string;
}): Promise<GetRequestResult | null> {
  const request = await requestsRepo.findById(input.requestId);
  if (!request) return null;

  const isOwn = request.user_id === input.viewerId;
  const business = await getApprovedBusinessForUser(input.viewerId);

  const hasResponded =
    business && !isOwn
      ? await requestResponsesRepo.hasResponded({
          requestId: request.id,
          businessId: business.id,
        })
      : false;

  return {
    request,
    isOwn,
    business,
    hasResponded,
    canRespond:
      !isOwn &&
      business !== null &&
      ACCEPTING_STATUSES.includes(request.status) &&
      !hasResponded,
  };
}

export interface ListRequestsResult {
  requests: RequestRow[];
  nextCursor: string | null;
}

/** The open feed: OPEN and IN_PROGRESS, newest first. */
export async function listRequests(input: {
  limit: number;
  cursor?: string | null;
  categoryId?: string | null;
  location?: string | null;
  urgency?: RequestUrgency | null;
}): Promise<ListRequestsResult> {
  const page = await requestsRepo.listOpen(input);
  return { requests: page.rows, nextCursor: page.nextCursor };
}

/** Everything one person asked for, any status. */
export async function listMyRequests(input: {
  userId: string;
  limit: number;
  cursor?: string | null;
}): Promise<ListRequestsResult> {
  const page = await requestsRepo.listByUser(input);
  return { requests: page.rows, nextCursor: page.nextCursor };
}

/**
 * Edit an OPEN request you own.
 *
 * Only while it is still OPEN. Once an offer has been accepted the request is
 * IN_PROGRESS and a customer editing the description out from under the business
 * they just agreed terms with is not a thing that should be one tap away — that
 * is a conversation, and messaging is Phase 10.
 */
export async function updateRequest(input: {
  userId: string;
  requestId: string;
  fields: Partial<RequestRow>;
}): Promise<RequestRow> {
  const request = await requestsRepo.findById(input.requestId);
  if (!request) throw new ServiceError("NOT_FOUND", "That request was not found.");
  if (request.user_id !== input.userId) {
    throw new ServiceError("FORBIDDEN", "That is not your request.");
  }
  if (request.status !== "OPEN") {
    throw new ServiceError(
      "INVALID",
      "This request can no longer be edited. Close it and post a new one.",
    );
  }

  const updated = await requestsRepo.update(input.requestId, input.fields);
  if (!updated) throw new ServiceError("NOT_FOUND", "That request was not found.");
  return updated;
}

/** Postgres unique-violation. The one that means "you already responded". */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "23505"
  );
}

/**
 * Send an offer on somebody else's request.
 *
 * The business is resolved from the SESSION, never from the body — see
 * `getApprovedBusinessForUser`. Five rules are checked before anything is
 * written:
 *
 *   1. the caller owns an APPROVED business;
 *   2. the request exists and still accepts offers;
 *   3. it is not the caller's own request;
 *   4. they have not already responded;
 *   5. (race) the unique constraint is the real guarantee for 4.
 *
 * The insert and the counter move together in one transaction. A response with a
 * counter that says zero would hide the very offer the customer is waiting for.
 */
export async function respondToRequest(input: {
  userId: string;
  requestId: string;
  message: string;
  priceEstimate?: number | null;
  currency?: string | null;
  availabilityNote?: string | null;
  attachments?: unknown;
}): Promise<ResponseRow> {
  const business = await getApprovedBusinessForUser(input.userId);
  if (!business) {
    throw new ServiceError(
      "FORBIDDEN",
      "Only an approved business can send offers. Finish your business verification first.",
    );
  }

  const request = await requestsRepo.findById(input.requestId);
  if (!request) throw new ServiceError("NOT_FOUND", "That request was not found.");

  // Own request. Checked before the status so the message is about the real
  // problem rather than "this request is open".
  if (request.user_id === input.userId) {
    throw new ServiceError(
      "FORBIDDEN",
      "You cannot send an offer on your own request.",
    );
  }

  if (!ACCEPTING_STATUSES.includes(request.status)) {
    throw new ServiceError(
      "INVALID",
      "This request is closed and is no longer accepting offers.",
    );
  }

  if (
    await requestResponsesRepo.hasResponded({
      requestId: request.id,
      businessId: business.id,
    })
  ) {
    throw new ServiceError(
      "INVALID",
      "Your business has already responded to this request.",
    );
  }

  try {
    return await withTransaction(async (client) => {
      const response = await requestResponsesRepo.create(
        {
          requestId: request.id,
          businessId: business.id,
          userId: input.userId,
          message: input.message.trim(),
          priceEstimate: input.priceEstimate ?? null,
          currency: input.currency ?? null,
          availabilityNote: input.availabilityNote?.trim() || null,
          attachments: input.attachments ?? null,
        },
        client
      );

      await requestsRepo.incrementResponseCount(request.id, 1, client);

      await securityEventsRepo.log(
        {
          userId: input.userId,
          eventType: "REQUEST_RESPONDED",
          metadata: {
            requestId: request.id,
            responseId: response.id,
            businessId: business.id,
            hasPrice: input.priceEstimate != null,
          },
        },
        client
      );

      return response;
    });
  } catch (error) {
    // Two taps in the same second both pass `hasResponded` and then both insert.
    // The constraint is what actually stops the second one; this turns its
    // failure into the same sentence the check above would have given.
    if (isUniqueViolation(error)) {
      throw new ServiceError(
        "INVALID",
        "Your business has already responded to this request.",
      );
    }
    throw error;
  }
}

export interface ListResponsesResult {
  responses: ResponseRow[];
  nextCursor: string | null;
  /** False for a visitor who is neither the owner nor a responder. */
  canViewAll: boolean;
  /** What a visitor may know even when they see nothing. */
  count: number;
}

/**
 * The responses on a request.
 *
 * Only the OWNER sees them. A competing business reading the other offers on a
 * request would be reading its competitors' prices, which is the one thing this
 * marketplace must never expose. Everyone else gets the count — enough to know
 * the request is worth answering — plus their own offer, which they already know.
 */
export async function listResponses(input: {
  requestId: string;
  viewerId: string;
  limit: number;
  cursor?: string | null;
}): Promise<ListResponsesResult | null> {
  const request = await requestsRepo.findById(input.requestId);
  if (!request) return null;

  if (request.user_id !== input.viewerId) {
    const business = await getApprovedBusinessForUser(input.viewerId);
    const page = await requestResponsesRepo.listByRequest({
      requestId: request.id,
      limit: input.limit,
      cursor: input.cursor,
    });
    return {
      // Their own offer only, so "withdraw" has something to act on.
      responses: business
        ? page.rows.filter((row) => row.business_id === business.id)
        : [],
      // Never the owner's cursor: it would page through responses they may not
      // see.
      nextCursor: null,
      canViewAll: false,
      count: await requestResponsesRepo.countByRequest(request.id),
    };
  }

  const page = await requestResponsesRepo.listByRequest({
    requestId: request.id,
    limit: input.limit,
    cursor: input.cursor,
  });
  return {
    responses: page.rows,
    nextCursor: page.nextCursor,
    canViewAll: true,
    count: await requestResponsesRepo.countByRequest(request.id),
  };
}

/**
 * Accept an offer.
 *
 * One transaction moves four things: this response becomes ACCEPTED, every other
 * offer is DECLINED, `accepted_response_id` is set, and the request becomes
 * IN_PROGRESS. Doing any of them alone leaves a state nobody can explain — a
 * request with two accepted offers, or a customer who accepted somebody while
 * their request still reads OPEN.
 *
 * Allowed from IN_PROGRESS as well as OPEN, so a customer can change their mind;
 * `declineOthers` demotes the previous winner for exactly that reason.
 *
 * No conversation is started here. Messaging is Phase 10, and opening a thread
 * nobody asked for is a decision that belongs to that phase, not this one.
 */
export async function acceptResponse(input: {
  userId: string;
  requestId: string;
  responseId: string;
}): Promise<{ request: RequestRow; acceptedResponse: ResponseRow }> {
  const request = await requestsRepo.findById(input.requestId);
  if (!request) throw new ServiceError("NOT_FOUND", "That request was not found.");
  if (request.user_id !== input.userId) {
    throw new ServiceError("FORBIDDEN", "That is not your request.");
  }
  if (!ACCEPTING_STATUSES.includes(request.status)) {
    throw new ServiceError(
      "INVALID",
      "This request is closed, so its offers can no longer be accepted.",
    );
  }

  const response = await requestResponsesRepo.findById(input.responseId);
  if (!response || response.request_id !== request.id) {
    // Also covers "this response belongs to a different request", which is
    // exactly the check that must not become a redirect or a 403.
    throw new ServiceError("NOT_FOUND", "That offer was not found.");
  }
  if (response.status === "WITHDRAWN") {
    throw new ServiceError(
      "INVALID",
      "That business has withdrawn their offer.",
    );
  }

  const updatedRequest = await withTransaction(async (client) => {
    await requestResponsesRepo.updateStatus(response.id, "ACCEPTED", client);
    await requestResponsesRepo.declineOthers(request.id, response.id, client);
    await requestsRepo.setAcceptedResponse(request.id, response.id, client);
    await requestsRepo.updateStatus(request.id, "IN_PROGRESS", client);

    await securityEventsRepo.log(
      {
        userId: input.userId,
        eventType: "REQUEST_RESPONSE_ACCEPTED",
        metadata: {
          requestId: request.id,
          responseId: response.id,
          businessId: response.business_id,
        },
      },
      client
    );

    return requestsRepo.findById(request.id, client);
  });

  if (!updatedRequest) {
    throw new ServiceError("NOT_FOUND", "That request was not found.");
  }
  const acceptedResponse =
    (await requestResponsesRepo.findById(response.id)) ?? response;
  return { request: updatedRequest, acceptedResponse };
}

/** Close, cancel, or mark fulfilled. Owner only, and only while still open. */
export async function closeRequest(input: {
  userId: string;
  requestId: string;
  status?: "CLOSED" | "CANCELLED" | "FULFILLED";
}): Promise<RequestRow> {
  const request = await requestsRepo.findById(input.requestId);
  if (!request) throw new ServiceError("NOT_FOUND", "That request was not found.");
  if (request.user_id !== input.userId) {
    throw new ServiceError("FORBIDDEN", "That is not your request.");
  }
  if (!ACCEPTING_STATUSES.includes(request.status)) {
    throw new ServiceError("INVALID", "This request is already closed.");
  }

  const status = input.status ?? "CLOSED";

  await withTransaction(async (client) => {
    await requestsRepo.close(request.id, status, client);
    await securityEventsRepo.log(
      {
        userId: input.userId,
        eventType: "REQUEST_CLOSED",
        metadata: { requestId: request.id, status },
      },
      client
    );
  });

  const updated = await requestsRepo.findById(request.id);
  if (!updated) throw new ServiceError("NOT_FOUND", "That request was not found.");
  return updated;
}

/**
 * Withdraw an offer you sent.
 *
 * The responder's own right, on their own response, and only while it is still
 * PENDING. Once it has been ACCEPTED the customer is relying on it, and it goes
 * away by the request being closed instead.
 */
export async function withdrawResponse(input: {
  userId: string;
  responseId: string;
}): Promise<void> {
  const response = await requestResponsesRepo.findById(input.responseId);
  if (!response) throw new ServiceError("NOT_FOUND", "That offer was not found.");
  if (response.user_id !== input.userId) {
    throw new ServiceError("FORBIDDEN", "That is not your offer.");
  }
  if (response.status !== "PENDING") {
    throw new ServiceError(
      "INVALID",
      response.status === "ACCEPTED"
        ? "The customer has already accepted this offer, so it cannot be withdrawn."
        : "This offer can no longer be withdrawn.",
    );
  }

  await withTransaction(async (client) => {
    await requestResponsesRepo.updateStatus(response.id, "WITHDRAWN", client);
    await requestsRepo.incrementResponseCount(response.request_id, -1, client);
    await securityEventsRepo.log(
      {
        userId: input.userId,
        eventType: "REQUEST_RESPONSE_WITHDRAWN",
        metadata: {
          requestId: response.request_id,
          responseId: response.id,
          businessId: response.business_id,
        },
      },
      client
    );
  });
}