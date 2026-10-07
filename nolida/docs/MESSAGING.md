# Messaging (Phase 10)

Direct 1:1 conversations: text, photos, files, voice notes, replies, forwards,
reactions, read receipts, typing indicators, pin/mute/archive, block, and
report.

## Schema

- **conversations**: canonical pair (`user_a < user_b`). Exactly one row per
  pair. `last_message_id` and `last_message_at` point at the newest SENT
  message.
- **conversation_members**: per-side settings (pinned, muted, archived) plus
  the read pointer (`last_read_at`, `last_read_message_id`). One row per user
  per conversation.
- **messages**: text, attachments (JSONB), voice note (JSONB), shared item
  (JSONB), reply chain, forwarded flag, soft delete (`status`).
- **message_reactions**: one row per user per message. Primary key is
  `(message_id, user_id)` — reacting twice updates the emoji instead of
  creating duplicates.
- **typing_status**: expiring flag per user per conversation. Pruned
  opportunistically on reads/writes. Entries older than 5 seconds are stale.
- **user_blocks**: self-block prevented by CHECK.
- **reports**: generic report table for messages, users, and conversations.

## Message kinds

| kind | shape |
|------|-------|
| TEXT | `body` |
| IMAGE | `attachments[]` with `kind: "image"` |
| FILE | `attachments[]` with `kind: "file"` |
| VOICE | `voice_note: { url, duration }` |
| SHARED_ITEM | `shared_item: { type, id }` — server derives title/image/href |
| SYSTEM | future use |

## Real-time

Supabase Realtime if `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
Server broadcasts on `conversation:{id}`. The client subscribes and refetches
through the ordinary API.

Fallback: polling `/api/conversations/[id]/messages` every 5 seconds. The
polling cadence is the floor: every feature works identically without
Realtime; real-time is an optimisation for perceived speed.

## Voice notes

Recorded via `MediaRecorder` + `getUserMedia({ audio: true })`. Uploaded to
Cloudinary as `resourceType: "video"` under the `message` purpose folder. The
server stores `{ url, duration }` where `duration` is Cloudinary's measured
seconds (converted to ms).

The client shows play/pause, a seekable progress bar, elapsed/total time, and
a playback speed toggle (1x / 1.5x / 2x).

## Reactions, replies, forwards

- Reactions: fixed set — ❤️ 😂 😮 😢 👍 🙏.
- Reply: `reply_to_id` points to the original message. The reply preview shows
  the quoted text and sender name.
- Forward: `is_forwarded = true`, `forwarded_from_message_id` (future field).
  The UI shows a "Forwarded" label above the content. Targets are limited to 5
  conversations.

## Read receipts

Pointer-based, not per-row. `conversation_members.last_read_at` +
`last_read_message_id` is the reader's position. A message is read once
`(m.created_at, m.id) <= (reader.last_read_at, reader.last_read_message_id)`.

The UI shows ✓✓ under the last sent message once the other member has passed
it.

## Typing indicators

The `typing_status` table stores `(conversation_id, user_id, expires_at)`. The
client re-arms the flag every few seconds while typing. Entries older than 5
seconds are considered stale.

## Mute / pin / archive

Per-side settings on `conversation_members`. Each user controls only their own
row.

- **Pin**: hoists the conversation to the top of the list.
- **Mute**: hides notifications for the conversation. The UI shows a mute icon.
- **Archive**: hides from the default list. The user can view archived
  conversations with a toggle.

## Block / report

- Block: `user_blocks(blocker_id, blocked_id)`. Checked in both directions
  before any write. A block stops messaging in both directions.
- Report: `reports` table. `reason` is a fixed enum (SPAM, HARASSMENT, SCAM,
  INAPPROPRIATE, OTHER). Phase 17 surfaces reports in the admin panel.

## Deferred to Phase 10.5

- Voice calls
- Video calls
- Group chats

## WhatsApp reference notes

- Chat list: full-width rows, avatar 56px left, name bold, last-message
  preview muted single-line, timestamp top-right, unread badge (green pill),
  pinned/mute icons.
- Chat window: header with back arrow, avatar, name, status; message bubbles
  with tails; timestamps inside bubbles; ✓✓ read receipts; day dividers;
  typing indicator (three animated dots).
- Voice notes: waveform bar, play/pause, elapsed/total time, seekable,
  playback speed 1x/1.5x/2x.
