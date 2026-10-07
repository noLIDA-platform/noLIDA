/**
 * Phase 10: Messaging.
 *
 * Direct messages: 1:1 conversations, text/photo/voice messages, replies,
 * forwards, reactions, read receipts, typing, per-side settings, blocks and
 * reports. Two design notes worth keeping:
 *
 * 1. A conversation is a CANONICAL PAIR (user_a < user_b), not a "creator"
 *    row. There is no such thing as "the" conversation between two people —
 *    both halves are the conversation — so find-or-create must never insert
 *    two rows for one pair. The CHECK constraint enforces the invariant in
 *    the database, not only in the service.
 *
 * 2. Read receipts are a per-member POINTER (last_read_at +
 *    last_read_message_id), not a row per message per reader. A receipt-row
 *    design writes one insert per message read — a chat that just went quiet
 *    still costs O(messages) rows forever. The pointer answers every
 *    question in O(1) with a comparison on the (created_at, id) total
 *    ordering the feed cursor already uses.
 *
 * Reports live here rather than in a later moderation phase because blocking
 * and reporting are the safety valves a messaging surface cannot open after
 * shipping unprotected chat first.
 */

-- 1. Conversations: the canonical pair ------------------------------------

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_id UUID,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_ordered_pair CHECK (user_a < user_b),
  CONSTRAINT conversations_unique_pair UNIQUE (user_a, user_b)
);

CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Messages ------------------------------------------------------------

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  voice_note JSONB,
  shared_item JSONB,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  forwarded BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELETED')),
  edited_at TIMESTAMPTZ,
  deleted_for UUID[] NOT NULL DEFAULT '{}'::uuid[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A live message carries content; a tombstone ("Deleted for me/everyone")
  -- carries none and only keeps its place in the thread.
  CONSTRAINT messages_content CHECK (
    status = 'DELETED'
    OR char_length(COALESCE(body, '')) > 0
    OR jsonb_array_length(attachments) > 0
    OR voice_note IS NOT NULL
    OR shared_item IS NOT NULL
  ),
  CONSTRAINT messages_body_length CHECK (
    body IS NULL OR char_length(body) <= 5000
  )
);

CREATE TRIGGER messages_set_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX messages_conversation_recent_idx
  ON messages (conversation_id, created_at DESC, id DESC);
CREATE INDEX messages_sender_idx ON messages (sender_id);
CREATE INDEX messages_reply_to_idx ON messages (reply_to_id)
  WHERE reply_to_id IS NOT NULL;

-- The conversation's preview message. ON DELETE SET NULL: when the previewed
-- message disappears, the column empties instead of blocking the delete.
ALTER TABLE conversations
  ADD CONSTRAINT conversations_last_message_fk
  FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX conversations_recent_idx
  ON conversations (last_message_at DESC, id DESC);

-- 3. Members: per-side settings + the read-receipt pointer -----------------

CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TRIGGER conversation_members_set_updated_at
  BEFORE UPDATE ON conversation_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX conversation_members_user_idx
  ON conversation_members (user_id, last_read_at DESC);

-- 4. Reactions: one per user per message (the PK is the constraint) --------

CREATE TABLE message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id),
  CONSTRAINT message_reactions_emoji_length CHECK (
    char_length(emoji) BETWEEN 1 AND 8
  )
);

-- 5. Typing: an expiring flag, pruned opportunistically on read/write ------

CREATE TABLE typing_status (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 6. Blocks ----------------------------------------------------------------

CREATE TABLE user_blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX user_blocks_blocked_idx ON user_blocks (blocked_id);

-- 7. Reports (surfaced in the admin phases) --------------------------------

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'REVIEWED', 'DISMISSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reports_reason_length CHECK (
    char_length(reason) BETWEEN 1 AND 64
  ),
  CONSTRAINT reports_details_length CHECK (
    details IS NULL OR char_length(details) <= 2000
  )
);

CREATE TRIGGER reports_set_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX reports_status_idx ON reports (status, created_at DESC);
