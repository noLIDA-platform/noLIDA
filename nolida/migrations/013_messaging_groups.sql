-- 013: messaging groups (Phase 10, Part 1).
--
-- Conversations grow from a canonical pair (user_a < user_b) into TWO shapes:
--
--   DIRECT (default):  the existing 1:1 pair.  Unchanged.
--   GROUP:             a creator (created_by) plus membership rows in
--                      conversation_members.  The pair columns stay NOT NULL
--                      and must keep the CHECK, so a stable placeholder
--                      (created_by + the smallest member larger than it) is
--                      stored in user_a/user_b.  They are never read for
--                      group logic — membership lives in conversation_members.
--
-- Group identity lives on the conversation row:
--   name           — required 1-60 char group name (the chat header displays it)
--   type           — 'DIRECT' | 'GROUP'
--   avatar_url     — group cover photo
--   description    — optional group description (max 200 chars, handled by the
--                    service; no DB CHECK here, mirrors the existing text rules)
--   invite_code    — auto-generated 8-char hex, UNIQUE, the future join handle
--                    (join-by-invite is Phase 10.5; code issuance is here)
--
-- Profiles carry the global messaging preferences that the chat and the inbox
-- must respect:
--   read_receipts_enabled    -> don't write read_at
--   typing_indicator_enabled -> don't write typing_status
--
-- conversation_members gains role (ADMIN|MEMBER): createGroup makes the creator
-- ADMIN and the rest MEMBER; only admins may add/remove members, edit info, or
-- promote.  The last admin must never be removable (leaveGroup transfers it).

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'DIRECT'
    CHECK (type IN ('DIRECT', 'GROUP'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS read_receipts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS typing_indicator_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE conversation_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'MEMBER'
    CHECK (role IN ('ADMIN', 'MEMBER'));
