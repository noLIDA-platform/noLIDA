import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db/client";
import { decodeCursor, encodeCursor } from "./cursor";

type Db = Pick<PoolClient, "query">;

/**
 * A message counts as read for the other person once the pair
 * (m.created_at, m.id) is <= their pointer. When a member has never opened
 * the conversation the pointer is the member row itself, so the comparison
 * uses the zero uuid — every real uuid is greater, so an unread message
 * never falsely counts as read, even when the first message shares the
 * conversation's own NOW() timestamp inside one transaction.
 */
export const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export interface ConversationRow {
  id: string;
  user_a: string;
  user_b: string;
  last_message_id: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  /** Group identity (migration 013). Null name on a 1:1 row. */
  name: string | null;
  avatar_url: string | null;
  type: "DIRECT" | "GROUP";
  created_by: string | null;
  /** Group description (migration 013). Only selected by the detail reads. */
  description?: string | null;
  /** Group invite code (migration 013). Only selected by the detail reads. */
  invite_code?: string | null;
  /** Not a column — always read through a count subquery cast to int. */
  member_count: number;
}

export interface ConversationMemberRow {
  conversation_id: string;
  user_id: string;
  /** Migration 013. Group roles only; 1:1 rows are always MEMBER. */
  role: "ADMIN" | "MEMBER";
  last_read_at: string;
  last_read_message_id: string | null;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
}

/** One joined row from the viewer's conversation list. */
export interface ConversationListRow {
  id: string;
  last_message_at: string;
  created_at: string;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  /** Group identity (migration 013) — `name` is null for a 1:1 row. */
  name: string | null;
  avatar_url: string | null;
  type: "DIRECT" | "GROUP";
  member_count: number;
  /** Display name of whoever sent the preview message (groups label it). */
  last_sender_name: string | null;
  other_id: string;
  other_username: string | null;
  other_display_name: string | null;
  other_full_name: string | null;
  other_avatar_url: string | null;
  last_id: string | null;
  last_body: string | null;
  last_attachments: unknown;
  last_voice_note: unknown;
  last_shared_item: unknown;
  last_status: string | null;
  last_sender_id: string | null;
  last_created_at: string | null;
  unread_count: number;
  other_typing: boolean;
  blocked: boolean;
  blocked_by_other: boolean;
}

export interface ConversationListPage {
  rows: ConversationListRow[];
  nextCursor: string | null;
}

/**
 * The conversation list: joined to the other member, their profile, the
 * preview message, a live typing flag, block state and an unread count — all
 * in ONE query. A second round-trip per conversation is how a list becomes
 * slow the moment it has content. Per-message visibility (`deleted_for`) is
 * applied inside the unread subquery, never by filtering the page after
 * loading it.
 */
const SELECT_LIST = `
  SELECT
    c.id, c.last_message_at, c.created_at, c.name, c.avatar_url, c.type, c.created_by,
    cm.pinned, cm.muted, cm.archived,
    om.user_id AS other_id,
    pr.username AS other_username,
    pr.display_name AS other_display_name,
    pr.full_name AS other_full_name,
    pr.avatar_url AS other_avatar_url,
    lm.id AS last_id,
    lm.body AS last_body,
    lm.attachments AS last_attachments,
    lm.voice_note AS last_voice_note,
    lm.shared_item AS last_shared_item,
    lm.status AS last_status,
    lm.sender_id AS last_sender_id,
    lm.created_at AS last_created_at,
    (SELECT count(*)::int FROM conversation_members mc
     WHERE mc.conversation_id = c.id) AS member_count,
    (SELECT COALESCE(pr2.display_name, pr2.full_name, pr2.username)
     FROM messages m2
     JOIN profiles pr2 ON pr2.user_id = m2.sender_id
     WHERE m2.id = c.last_message_id) AS last_sender_name,
    COALESCE((
      SELECT count(*) FROM messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id <> cm.user_id
        AND m.status = 'SENT'
        AND NOT (cm.user_id = ANY(m.deleted_for))
        AND (m.created_at, m.id) > (
          cm.last_read_at,
          COALESCE(cm.last_read_message_id, '${ZERO_UUID}'::uuid)
        )
    ), 0)::int AS unread_count,
    (ts.user_id IS NOT NULL) AS other_typing,
    (ub.blocker_id IS NOT NULL) AS blocked,
    (ub2.blocker_id IS NOT NULL) AS blocked_by_other
  FROM conversation_members cm
  JOIN conversations c ON c.id = cm.conversation_id
  LEFT JOIN conversation_members om
    ON om.conversation_id = c.id AND om.user_id <> cm.user_id
  LEFT JOIN profiles pr ON pr.user_id = om.user_id
  LEFT JOIN messages lm ON lm.id = c.last_message_id
  LEFT JOIN typing_status ts
    ON ts.conversation_id = c.id
   AND ts.user_id = om.user_id
   AND ts.expires_at > now()
  LEFT JOIN user_blocks ub
    ON ub.blocker_id = cm.user_id AND ub.blocked_id = om.user_id
  LEFT JOIN user_blocks ub2
    ON ub2.blocker_id = om.user_id AND ub2.blocked_id = cm.user_id
  WHERE cm.user_id = $1
`;

/**
 * Find or create the canonical conversation between two users.
 *
 * The insert is ON CONFLICT DO NOTHING on the (user_a, user_b) unique pair,
 * and the row is always re-selected — two devices starting a chat at once
 * both come away with the same id. Callers pass the pair already ordered
 * (user_a < user_b); the CHECK constraint refuses anything else.
 */
export async function findOrCreatePair(
  input: { userA: string; userB: string },
  db?: Db
): Promise<ConversationRow> {
  const text = `
    INSERT INTO conversations (user_a, user_b)
    VALUES ($1, $2)
    ON CONFLICT (user_a, user_b) DO NOTHING
    RETURNING id, user_a, user_b, last_message_id, last_message_at,
              created_at, updated_at
  `;
  let result;
  if (db) result = await db.query<ConversationRow>(text, [input.userA, input.userB]);
  else result = await query<ConversationRow>(text, [input.userA, input.userB]);
  const inserted = result.rows[0];
  if (inserted) return inserted;

  // The conflict path: someone (this caller a moment ago, or another device)
  // already owns the pair. Re-select it.
  const selectText = `SELECT id, user_a, user_b, last_message_id, last_message_at,
                             created_at, updated_at
                      FROM conversations
                      WHERE user_a = $1 AND user_b = $2`;
  const selected = db
    ? await db.query<ConversationRow>(selectText, [input.userA, input.userB])
    : await query<ConversationRow>(selectText, [input.userA, input.userB]);
  const row = selected.rows[0];
  if (!row) throw new Error("conversations.repo.findOrCreatePair returned no row");
  return row;
}

/** Idempotent: creates any missing member rows, never touches existing ones. */
export async function ensureMembers(
  input: { conversationId: string; userA: string; userB: string },
  db?: Db
): Promise<void> {
  const text = `
    INSERT INTO conversation_members (conversation_id, user_id)
    VALUES ($1, $2), ($1, $3)
    ON CONFLICT (conversation_id, user_id) DO NOTHING
  `;
  const params = [input.conversationId, input.userA, input.userB];
  if (db) await db.query(text, params);
  else await query(text, params);
}

export async function findById(
  id: string,
  db?: Db
): Promise<ConversationRow | null> {
  const text = `SELECT id, user_a, user_b, last_message_id, last_message_at,
                       created_at, updated_at, name, avatar_url, type, created_by,
                       description, invite_code,
                       (SELECT count(*)::int FROM conversation_members cm
                        WHERE cm.conversation_id = c.id) AS member_count
                FROM conversations c
                WHERE c.id = $1`;
  const result = db
    ? await db.query<ConversationRow>(text, [id])
    : await query<ConversationRow>(text, [id]);
  return result.rows[0] ?? null;
}

export async function getMember(
  conversationId: string,
  userId: string,
  db?: Db
): Promise<ConversationMemberRow | null> {
  // `role` is load-bearing: every admin gate in the service compares
  // member.role !== "ADMIN". Without this column in the SELECT the field
  // is undefined and EVERY admin action is refused.
  const text = `SELECT conversation_id, user_id, role, last_read_at,
                       last_read_message_id, pinned, muted, archived
                FROM conversation_members
                WHERE conversation_id = $1 AND user_id = $2`;
  const result = db
    ? await db.query<ConversationMemberRow>(text, [conversationId, userId])
    : await query<ConversationMemberRow>(text, [conversationId, userId]);
  return result.rows[0] ?? null;
}

/** One member row joined to the profile fields the info page renders. */
export interface GroupMemberListRow {
  user_id: string;
  role: "ADMIN" | "MEMBER";
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Every member of a group, admins first then by display name. Bounded by
 * the 256-member cap the service enforces, so this list needs no cursor —
 * a page of members the viewer may already see in full is not pagination.
 */
export async function listMembers(
  conversationId: string,
  db?: Db
): Promise<GroupMemberListRow[]> {
  const text = `SELECT cm.user_id, cm.role,
                       p.username, p.display_name, p.full_name, p.avatar_url
                FROM conversation_members cm
                JOIN profiles p ON p.user_id = cm.user_id
                WHERE cm.conversation_id = $1
                ORDER BY (cm.role = 'ADMIN') DESC,
                         COALESCE(p.display_name, p.full_name, p.username, '') ASC,
                         cm.user_id ASC`;
  const result = db
    ? await db.query<GroupMemberListRow>(text, [conversationId])
    : await query<GroupMemberListRow>(text, [conversationId]);
  return result.rows;
}

/**
 * The viewer's conversation list, newest activity first, pinned hoisted.
 *
 * The cursor is the (last_message_at, id) pair. Ordering by pinned first
 * means a cursor boundary can cut a pinned row away from its page — accepted
 * deliberately: conversation lists that large are rare, and a stable
 * (last_message_at, id) cursor beats a cursor that has to encode a boolean.
 */
export async function listForUser(input: {
  userId: string;
  limit: number;
  cursor?: string | null;
  includeArchived?: boolean;
}): Promise<ConversationListPage> {
  const decoded = decodeCursor(input.cursor);
  const result = await query<ConversationListRow>(
    `${SELECT_LIST}
       AND ($2::boolean OR cm.archived = FALSE)
       AND ($3::timestamptz IS NULL
            OR (c.last_message_at, c.id) < ($3::timestamptz, $4::uuid))
     ORDER BY cm.pinned DESC, c.last_message_at DESC, c.id DESC
     LIMIT $5`,
    [
      input.userId,
      input.includeArchived ?? false,
      decoded?.createdAt ?? null,
      decoded?.id ?? null,
      input.limit + 1,
    ]
  );

  const hasMore = result.rows.length > input.limit;
  const rows = hasMore ? result.rows.slice(0, input.limit) : result.rows;
  const last = rows[rows.length - 1];
  return {
    rows,
    nextCursor:
      hasMore && last
        ? encodeCursor({ created_at: last.last_message_at, id: last.id })
        : null,
  };
}

/** Points the conversation's preview at a freshly inserted message. */
export async function touchLastMessage(
  input: { conversationId: string; messageId: string; at: string },
  db?: Db
): Promise<void> {
  const text = `UPDATE conversations
                SET last_message_id = $2, last_message_at = $3
                WHERE id = $1`;
  const params = [input.conversationId, input.messageId, input.at];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/**
 * Recomputes the preview after a message disappears (deleted for everyone).
 *
 * When nothing SENT is left the conversation empties its preview instead of
 * pointing at a tombstone — a list row that says "This message was deleted"
 * is a row nobody asked to see.
 */
export async function recomputeLastMessage(
  conversationId: string,
  db?: Db
): Promise<void> {
  const text = `
    UPDATE conversations c SET
      last_message_id = (
        SELECT m.id FROM messages m
        WHERE m.conversation_id = c.id AND m.status = 'SENT'
        ORDER BY m.created_at DESC, m.id DESC LIMIT 1
      ),
      last_message_at = COALESCE((
        SELECT m.created_at FROM messages m
        WHERE m.conversation_id = c.id AND m.status = 'SENT'
        ORDER BY m.created_at DESC, m.id DESC LIMIT 1
      ), now())
    WHERE c.id = $1
  `;
  if (db) await db.query(text, [conversationId]);
  else await query(text, [conversationId]);
}

/**
 * Per-side settings: pinned, muted, archived. Column allow-list — a surprise
 * key in the body is dropped rather than written, same rule as every update
 * in this codebase. Only the caller's own membership row is ever touched.
 */
const MEMBER_UPDATABLE = new Set(["pinned", "muted", "archived"]);

export async function updateMemberSettings(
  input: {
    conversationId: string;
    userId: string;
    fields: Partial<Pick<ConversationMemberRow, "pinned" | "muted" | "archived">>;
  },
  db?: Db
): Promise<ConversationMemberRow | null> {
  const entries = Object.entries(input.fields).filter(
    ([key, value]) => MEMBER_UPDATABLE.has(key) && typeof value === "boolean"
  );
  if (entries.length === 0) {
    return getMember(input.conversationId, input.userId, db);
  }

  const sets = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values: unknown[] = entries.map(([, value]) => value);
  const text = `UPDATE conversation_members
                SET ${sets.join(", ")}
                WHERE conversation_id = $${values.length + 1}
                  AND user_id = $${values.length + 2}
                RETURNING conversation_id, user_id, last_read_at,
                          last_read_message_id, pinned, muted, archived`;
  const result = db
    ? await db.query<ConversationMemberRow>(text, [
        ...values,
        input.conversationId,
        input.userId,
      ])
    : await query<ConversationMemberRow>(text, [
        ...values,
        input.conversationId,
        input.userId,
      ]);
  return result.rows[0] ?? null;
}

/**
 * Create a group conversation owned by one person.
 *   creatorId — the group owner / first admin
 *   name       — 1-60 characters, required
 *   description — optional, max 200 characters (client-side courtesy only)
 *   avatarUrl   — optional group cover (https URL; server re-checks)
 *   memberIds   — everyone besides the creator; 1+ people (2+ total), 256 max
 *
 * The creator is stored as ADMIN, everyone else as MEMBER. The owner
 * (created_by), the pair columns and a generated invite code keep the row
 * addressable by the 1:1 code paths (receipts, messages, blocks); all group
 * rules live in the service.
 */
export async function createGroup(
  input: {
    name: string;
    description?: string | null;
    avatarUrl?: string | null;
    createdById: string;
    userA: string;
    userB: string;
    inviteCode: string;
    memberIds: string[];
  },
  db?: Db
): Promise<ConversationRow> {
  const { name, description, avatarUrl, createdById, userA, userB, inviteCode, memberIds } = input;

  if (!name || name.length > 60) {
    throw new Error("Group name must be 1-60 characters.");
  }
  const trimmedDescription = description?.trim() ?? null;
  if (trimmedDescription && trimmedDescription.length > 200) {
    throw new Error("Group description must be 200 characters or fewer.");
  }
  if (memberIds.length < 1) {
    throw new Error("A group needs at least 1 member besides the creator.");
  }
  if (memberIds.length + 1 > 256) {
    throw new Error("Groups are capped at 256 members in total.");
  }
  if (memberIds.includes(createdById)) {
    throw new Error("The creator cannot be in the member list.");
  }

  const uniqueMembers = Array.from(new Set(memberIds));
  if (uniqueMembers.length !== memberIds.length) {
    throw new Error("A member cannot be added twice.");
  }

  const creator = await query<{ id: string; status: string }>(
    "SELECT id, status FROM users WHERE id = $1",
    [createdById]
  );
  if (creator.rows.length === 0 || creator.rows[0].status !== "ACTIVE") {
    throw new Error("That user could not be found or is not active.");
  }

  const run = async (client: Db): Promise<ConversationRow> => {
    const insert = await client.query(
      `INSERT INTO conversations
        (type, name, description, avatar_url, created_by, user_a, user_b, invite_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_a, user_b, last_message_id, last_message_at,
                 created_at, updated_at, name, avatar_url, type, created_by`,
      [
        "GROUP",
        name,
        trimmedDescription,
        avatarUrl ?? null,
        createdById,
        userA,
        userB,
        inviteCode,
      ]
    );
    const conversationId = insert.rows[0].id;

    // Three placeholders per ROW — generated from `members`, never from the
    // flattened values, or the counts drift apart at 2+ members.
    const members: Array<[string, string]> = [
      [createdById, "ADMIN"],
      ...uniqueMembers.map((userId): [string, string] => [userId, "MEMBER"]),
    ];
    const memberValues: unknown[] = [];
    const tuples = members.map(([userId, role], index) => {
      memberValues.push(conversationId, userId, role);
      return `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`;
    });
    await client.query(
      `INSERT INTO conversation_members (conversation_id, user_id, role)
       VALUES ${tuples.join(", ")}
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      memberValues
    );

    // member_count is not a real column (neither migration adds one) — the
    // canonical SELECT computes it, so re-read through that.
    const created = await findById(conversationId, client);
    if (!created) throw new Error("createGroup: row not found after insert");
    return created;
  };
  return db ? run(db) : withTransaction(run);
}

/**
 * Edit a group's name, description or cover photo. Only the ADMIN can do it.
 */
export async function updateGroupInfo(
  input: {
    conversationId: string;
    userId: string;
    name?: string;
    description?: string;
    avatarUrl?: string | null;
  },
  db?: Db
): Promise<ConversationRow | null> {
  const member = await getMember(input.conversationId, input.userId, db);
  if (!member || member.role !== "ADMIN") {
    throw new Error("Only the group admin can edit group info.");
  }

  const { name, description, avatarUrl } = input;
  const sets: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (name !== undefined) {
    if (!name || name.length > 60) {
      throw new Error("Group name must be 1-60 characters.");
    }
    sets.push(`name = $${index++}`);
    values.push(name);
  }
  if (description !== undefined) {
    if (description.length > 200) {
      throw new Error("Group description must be 200 characters or fewer.");
    }
    sets.push(`description = $${index++}`);
    values.push(description);
  }
  if (avatarUrl !== undefined) {
    sets.push(`avatar_url = $${index++}`);
    values.push(avatarUrl);
  }

  if (sets.length === 0) {
    return findById(input.conversationId, db);
  }

  values.push(input.conversationId);
  const text = `UPDATE conversations SET ${sets.join(", ")} WHERE id = $${index}`;
  if (db) {
    await db.query(text, values);
  } else {
    await query(text, values);
  }
  return findById(input.conversationId, db);
}

/**
 * Add members to a group. Only the ADMIN can do it; the new total must stay
 * at or under 256. Duplicate members are rejected.
 */
export async function addGroupMembers(
  input: { conversationId: string; userId: string; memberIds: string[] },
  db?: Db
): Promise<ConversationRow | null> {
  const member = await getMember(input.conversationId, input.userId, db);
  if (!member || member.role !== "ADMIN") {
    throw new Error("Only the group admin can add members.");
  }

  const existing = await query<{ id: string }>(
    "SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = ANY($2)",
    [input.conversationId, input.memberIds]
  );
  if (existing.rows.length > 0) {
    throw new Error("One or more of these people are already in the group.");
  }
  const current = await memberCount(input.conversationId, db);
  if (current + input.memberIds.length > 256) {
    throw new Error("Groups are capped at 256 members in total.");
  }

  if (input.memberIds.length === 0) return findById(input.conversationId, db);

  // One tuple per member; the placeholder indexes follow the tuple index.
  const values: unknown[] = [];
  const tuples = input.memberIds.map((id, index) => {
    values.push(input.conversationId, id, "MEMBER");
    return `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`;
  });
  const text = `INSERT INTO conversation_members (conversation_id, user_id, role)
                 VALUES ${tuples.join(", ")}
                 ON CONFLICT (conversation_id, user_id) DO NOTHING`;
  if (db) {
    await db.query(text, values);
  } else {
    await query(text, values);
  }
  return findById(input.conversationId, db);
}

/**
 * Remove a member from a group. Only the ADMIN can do it. The last admin can
 * never be removed — the group would become unmanageable.
 */
export async function removeGroupMember(
  input: { conversationId: string; userId: string; targetUserId: string },
  db?: Db
): Promise<ConversationRow | null> {
  const member = await getMember(input.conversationId, input.userId, db);
  if (!member || member.role !== "ADMIN") {
    throw new Error("Only the group admin can remove members.");
  }

  const target = await getMember(input.conversationId, input.targetUserId, db);
  if (!target) {
    throw new Error("That person is not in the group.");
  }
  if (target.role === "ADMIN") {
    const admins = await countAdmins(input.conversationId, db);
    if (admins <= 1) {
      throw new Error("The last admin cannot be removed from the group.");
    }
  }

  const values = [input.conversationId, input.targetUserId];
  if (db) {
    await db.query(
      "DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2",
      values
    );
  } else {
    await query(
      "DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2",
      values
    );
  }

  if ((await memberCount(input.conversationId, db)) === 0) {
    await deleteEmptyGroup(input.conversationId, db);
  }
  return findById(input.conversationId, db);
}

/**
 * Promote a member to admin. Only the current admin can do it.
 */
export async function makeGroupAdmin(
  input: { conversationId: string; userId: string; targetUserId: string },
  db?: Db
): Promise<ConversationRow | null> {
  const member = await getMember(input.conversationId, input.userId, db);
  if (!member || member.role !== "ADMIN") {
    throw new Error("Only the group admin can promote members.");
  }

  const values = [input.conversationId, input.targetUserId, "ADMIN"];
  if (db) {
    await db.query(
      `UPDATE conversation_members SET role = $3
       WHERE conversation_id = $1 AND user_id = $2`,
      values
    );
  } else {
    await query(
      `UPDATE conversation_members SET role = $3
       WHERE conversation_id = $1 AND user_id = $2`,
      values
    );
  }
  return findById(input.conversationId, db);
}

/**
 * Leave a group. If the leaver is the last admin, the most senior remaining
 * member (by lowest user id) takes over. If the group becomes empty, it is
 * deleted entirely.
 */
export async function leaveGroup(
  input: { conversationId: string; userId: string },
  db?: Db
): Promise<ConversationRow | null> {
  const member = await getMember(input.conversationId, input.userId, db);
  if (!member) {
    throw new Error("You are not in this group.");
  }

  const roles = await query<{ user_id: string; role: string }>(
    "SELECT user_id, role FROM conversation_members WHERE conversation_id = $1 ORDER BY user_id",
    [input.conversationId]
  );
  const allMembers = roles.rows.map((r) => r.user_id);

  if (member.role === "ADMIN") {
    const admins = roles.rows
      .filter((r) => r.role === "ADMIN")
      .map((r) => r.user_id);
    if (admins.length === 1 && admins[0] === input.userId) {
      // Transfer admin to the next member, if any.
      const next = allMembers.find((id) => id !== input.userId) ?? null;
      if (next) {
        await query(
          "UPDATE conversation_members SET role = 'ADMIN' WHERE conversation_id = $1 AND user_id = $2",
          [input.conversationId, next]
        );
      }
    }
  }

  if (allMembers.length === 1) {
    // The group becomes empty: delete it.
    deleteEmptyGroup(input.conversationId, db);
    return null;
  }

  const values = [input.conversationId, input.userId];
  if (db) {
    await db.query(
      "DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2",
      values
    );
  } else {
    await query(
      "DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2",
      values
    );
  }
  return findById(input.conversationId, db);
}

/**
 * A group with no members is finished — drop the row along with its cascade.
 */
async function deleteEmptyGroup(conversationId: string, db?: Db): Promise<void> {
  if (db) {
    await db.query("DELETE FROM conversations WHERE id = $1", [conversationId]);
  } else {
    await query("DELETE FROM conversations WHERE id = $1", [conversationId]);
  }
}

/**
 * Look up a DIRECT conversation by its invite code (the user's two-user
 * conversation gets a generated code so it can be rejoined by anyone holding
 * it). Returns the conversation row, never the full member view.
 */
export async function findByIdByInviteCode(
  inviteCode: string,
  db?: Db
): Promise<ConversationRow | null> {
  const text = `SELECT id, user_a, user_b, last_message_id, last_message_at,
                       created_at, updated_at, name, avatar_url, type, created_by,
                       description, invite_code,
                       (SELECT count(*)::int FROM conversation_members cm
                        WHERE cm.conversation_id = conversations.id) AS member_count
                FROM conversations WHERE invite_code = $1`;
  return query<ConversationRow>(text, [inviteCode]).then(
    (result) => result.rows[0] ?? null
  );
}

/**
 * Live membership total — the source for the 256-member cap and the
 * empty-group cleanup check. Cast to int so callers get a number, not the
 * string node-postgres parses bigint into.
 */
export async function memberCount(
  conversationId: string,
  db?: Db
): Promise<number> {
  const text =
    "SELECT count(*)::int AS member_count FROM conversation_members WHERE conversation_id = $1";
  const result = db
    ? await db.query<{ member_count: number }>(text, [conversationId])
    : await query<{ member_count: number }>(text, [conversationId]);
  return result.rows[0]?.member_count ?? 0;
}

export async function countAdmins(
  conversationId: string,
  db?: Db
): Promise<number> {
  const text =
    "SELECT count(*)::int AS cnt FROM conversation_members WHERE conversation_id = $1 AND role = 'ADMIN'";
  const result = db
    ? await db.query<{ cnt: number }>(text, [conversationId])
    : await query<{ cnt: number }>(text, [conversationId]);
  return result.rows[0]?.cnt ?? 0;
}

