/**
 * Messaging rules, shared by the composer, the service, the routes and the
 * database CHECK constraints.
 *
 * Client-safe on purpose: a Client Component may not import from
 * `src/lib/server/`, and the composer needs these exact bounds to show a
 * counter that matches what the server accepts. The same numbers live as
 * CHECK constraints in `migrations/011_messaging.sql`.
 */

/** One message body, 1..5000 characters. Matches the DB CHECK. */
export const MESSAGE_BODY_MAX = 5000;

/** Photos and documents share one attachments array; the cap is per message. */
export const MAX_ATTACHMENTS = 4;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** A forward copies a message into at most this many conversations. */
export const MAX_FORWARDS = 5;

/**
 * An edit is only possible for this long after sending. Past that the message
 * history should not be quietly rewritten — the other side already read it.
 */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * The reaction set is FIXED. Six emojis the service will accept — a free-text
 * emoji field is an injection surface and a rendering lottery.
 */
export const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🙏", "👍"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** The recorder auto-stops here; longer would be a hostage note. */
export const VOICE_MAX_MS = 5 * 60 * 1000;

/** A typing flag expires this fast; the client re-arms it while typing. */
export const TYPING_TTL_MS = 10_000;

/**
 * Poll cadence when Supabase Realtime is not configured (or as the
 * reconciliation channel beside it). New messages must arrive within one
 * interval for the chat to feel alive.
 */
export const POLL_INTERVAL_MS = 5_000;

export const CONVERSATION_PAGE_SIZE = 30;
export const MESSAGE_PAGE_SIZE = 50;
export const SEARCH_PAGE_SIZE = 20;

/** Extension allow-list for documents, signed into the upload. */
export const DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "txt",
  "csv",
  "xls",
  "xlsx",
  "zip",
] as const;

/** Courtesy MIME list for the file picker's `accept`; re-checked server-side. */
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
] as const;

/**
 * A share target is `type:id`, e.g. `post:0b7f…`. Built by the share menus,
 * consumed by the conversation picker on `/messages?share=…`. The server
 * re-derives every display field from the database — the client only ever
 * names WHAT is shared, never how it renders.
 */
const SHARE_TARGET_RE = /^(post|business|product|request):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export interface ShareTarget {
  type: "post" | "business" | "product" | "request";
  id: string;
}

export function parseShareTarget(raw: string): ShareTarget | null {
  const match = SHARE_TARGET_RE.exec(raw.trim());
  if (!match) return null;
  return { type: match[1].toLowerCase() as ShareTarget["type"], id: match[2].toLowerCase() };
}

export function buildShareTarget(target: ShareTarget): string {
  return `${target.type}:${target.id}`;
}

/**
 * Why someone reported a message. A short fixed list — an open text field
 * here would land in the admin queue as free-form noise.
 */
export const REPORT_REASONS = [
  "SPAM",
  "HARASSMENT",
  "SCAM",
  "INAPPROPRIATE",
  "OTHER",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment or abuse",
  SCAM: "Scam or fraud",
  INAPPROPRIATE: "Inappropriate content",
  OTHER: "Something else",
};
