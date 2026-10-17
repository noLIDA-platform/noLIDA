import { z } from "zod";
import {
  DOCUMENT_EXTENSIONS,
  MAX_ATTACHMENTS,
  MAX_FORWARDS,
  MESSAGE_BODY_MAX,
  REACTION_EMOJIS,
  REPORT_REASONS,
  VOICE_MAX_MS,
} from "@/lib/messaging/constants";

/**
 * Messaging schemas — the zod boundary.
 *
 * The service validates again and `migrations/011_messaging.sql` holds the
 * final CHECK constraints; three layers, because "a body is 1 to 5000
 * characters" should survive a caller that checks none of them. Every bound
 * comes from `@/lib/messaging/constants`, never a literal — the composer
 * shows counters against those same numbers.
 *
 * URLs are https-only: every attachment, voice note and shared image renders
 * into an `src`, and a `javascript:` value in a stored column is stored XSS.
 */

const uuid = z.string().uuid();

const httpsUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => value.startsWith("https://"), {
    message: "Media must be an https URL.",
  });

const bodyField = z
  .string()
  .trim()
  .min(1, "Write something first.")
  .max(MESSAGE_BODY_MAX, `Messages are capped at ${MESSAGE_BODY_MAX} characters.`);

const attachment = z.object({
  url: httpsUrl,
  kind: z.enum(["image", "file"]),
  name: z.string().trim().min(1).max(200),
  size: z.number().int().min(0).max(200 * 1024 * 1024),
});

const voiceNoteField = z.object({
  url: httpsUrl,
  duration: z
    .number()
    .int()
    .min(1, "That voice note is empty.")
    .max(VOICE_MAX_MS, "Voice notes are capped at 5 minutes."),
});

/** The client names WHAT is shared; the server derives how it renders. */
const sharedItemField = z.object({
  type: z.enum(["post", "business", "product", "request"]),
  id: uuid,
});

export const startConversationSchema = z.object({
  otherUserId: uuid,
});

export const listConversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().max(300).optional(),
  includeArchived: z.enum(["true", "false"]).optional(),
});

export const updateConversationSchema = z
  .object({
    pinned: z.boolean().optional(),
    muted: z.boolean().optional(),
    archived: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.pinned !== undefined ||
      value.muted !== undefined ||
      value.archived !== undefined,
    { message: "Nothing to update." }
  );

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().max(300).optional(),
});

export const sendMessageSchema = z
  .object({
    body: bodyField.optional(),
    attachments: z.array(attachment).max(MAX_ATTACHMENTS).optional(),
    voiceNote: voiceNoteField.optional(),
    sharedItem: sharedItemField.optional(),
    replyToId: uuid.optional(),
  })
  .refine(
    (value) =>
      value.body !== undefined ||
      (value.attachments !== undefined && value.attachments.length > 0) ||
      value.voiceNote !== undefined ||
      value.sharedItem !== undefined,
    { message: "A message needs something in it." }
  );

export const editMessageSchema = z.object({
  body: bodyField,
});

export const deleteMessageSchema = z.object({
  scope: z.enum(["me", "everyone"]).default("me"),
});

export const reactSchema = z.object({
  emoji: z.enum(REACTION_EMOJIS, {
    message: "Pick a reaction from the list.",
  }),
});

export const forwardSchema = z.object({
  conversationIds: z.array(uuid).min(1).max(MAX_FORWARDS),
});

export const typingSchema = z.object({
  typing: z.boolean(),
});

export const searchMessagesQuerySchema = z.object({
  q: z.string().trim().min(2, "Type at least 2 characters.").max(100),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const reportMessageSchema = z.object({
  reason: z.enum(REPORT_REASONS, { message: "Choose a reason." }),
  details: z.string().trim().max(2000).optional(),
});

export const blockUserSchema = z.object({
  userId: uuid,
});

export const documentExtensionList: readonly string[] = DOCUMENT_EXTENSIONS;

/**
 * Group chats (Phase 10, Part 4/8). Bounds mirror the service and the
 * migration: name 1–60, description ≤200, at most 255 picked members
 * (the creator makes 256). Every bound comes from a literal the spec
 * fixed, validated again by the service — the dialog only counters
 * against these same numbers.
 */
export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name your group.")
    .max(60, "Group names are capped at 60 characters."),
  description: z
    .string()
    .trim()
    .max(200, "Descriptions are capped at 200 characters.")
    .optional(),
  avatarUrl: httpsUrl.nullish(),
  memberIds: z
    .array(uuid)
    .min(1, "Add at least one person.")
    .max(255, "Groups are capped at 256 members in total."),
});

export const updateGroupInfoSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name your group.")
      .max(60, "Group names are capped at 60 characters.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(200, "Descriptions are capped at 200 characters.")
      .optional(),
    avatarUrl: httpsUrl.nullish(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.avatarUrl !== undefined,
    { message: "Nothing to update." }
  );

export const addGroupMembersSchema = z.object({
  memberIds: z
    .array(uuid)
    .min(1, "Pick at least one person to add.")
    .max(255, "Groups are capped at 256 members in total."),
});

export const reportConversationSchema = z.object({
  reason: z.enum(REPORT_REASONS, { message: "Choose a reason." }),
  details: z.string().trim().max(2000).optional(),
});

/** Body of `POST .../members/promote` — promote the named member. */
export const promoteMemberSchema = z.object({ userId: uuid });

/** Query of `DELETE .../members?userId=` — remove the named member. */
export const removeMemberQuerySchema = z.object({ userId: uuid });

export const messagingPrefsSchema = z
  .object({
    readReceipts: z.boolean().optional(),
    typingIndicator: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.readReceipts !== undefined ||
      value.typingIndicator !== undefined,
    { message: "Nothing to update." }
  );
