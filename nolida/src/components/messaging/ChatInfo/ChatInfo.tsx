"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  EditIcon,
  FlagIcon,
  LinkIcon,
  LogoutIcon,
  MoreVerticalIcon,
  SearchIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "@/components/ui/Icons";
import { Input } from "@/components/ui/Input/Input";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { apiFetch } from "@/lib/client/api";
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  type ReportReason,
} from "@/lib/messaging/constants";
import type {
  ConversationView,
  GroupMemberView,
} from "@/lib/messaging/types";
import type { SearchResponse, SearchUser } from "@/types/search";
import "./ChatInfo.css";

export interface ChatInfoProps {
  /** The conversation as the server loaded it — mutated locally after each action. */
  conversation: ConversationView;
  /** Group members (empty for a 1:1; the hero carries identity there). */
  members: GroupMemberView[];
  /** The viewer — excluded from the add-members picker. */
  viewerId: string;
  className?: string;
}

const SEARCH_DEBOUNCE_MS = 250;

interface Candidate {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface ConfirmSpec {
  title: string;
  body: string;
  confirmLabel: string;
  run: () => Promise<void>;
}

function candidateName(user: SearchUser): string {
  return user.display_name ?? user.full_name ?? user.username ?? "Someone";
}

function memberName(member: GroupMemberView): string {
  return member.user.displayName ?? member.user.username ?? "Someone";
}

function DialogShell({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className="chat-info__overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="chat-info__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="chat-info__dialog-head">
          <h2 className="chat-info__dialog-title">{label}</h2>
          <button
            type="button"
            className="chat-info__icon-btn"
            onClick={onClose}
            aria-label={`Close ${label}`}
          >
            <Icon as={XIcon} size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * The chat info screen: identity, description, invite code, the member list
 * with admin controls, and the destructive actions (leave, report). Opens
 * from the thread header; every mutation re-renders through `router.refresh`
 * so the member list the server hands back next time is never stale.
 */
export function ChatInfo({
  conversation: initialConversation,
  members,
  viewerId,
  className,
}: ChatInfoProps): React.JSX.Element {
  const router = useRouter();
  const [conversation, setConversation] = useState(initialConversation);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addCandidates, setAddCandidates] = useState<Candidate[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addSelectedIds, setAddSelectedIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const addDebounceRef = useRef<number | null>(null);

  const isGroup = conversation.type === "GROUP";
  const isAdmin = isGroup && conversation.viewerRole === "ADMIN";
  const memberIds = new Set(members.map((member) => member.user.id));
  const title = isGroup
    ? (conversation.name ?? "Group")
    : (conversation.otherUser.displayName ??
      conversation.otherUser.username ??
      "Conversation");
  const handle = conversation.otherUser.username
    ? `@${conversation.otherUser.username}`
    : null;

  const trimmedEditName = editName.trim();
  const trimmedEditDescription = editDescription.trim();
  const editValid =
    trimmedEditName.length >= 1 &&
    trimmedEditName.length <= 60 &&
    trimmedEditDescription.length <= 200;

  // Escape closes the top-most layer: menu first, then dialogs, then the
  // inline edit form — the same order a user would unwind them by hand.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menuOpenFor) {
        setMenuOpenFor(null);
        return;
      }
      if (addOpen) setAddOpen(false);
      else if (reportOpen) setReportOpen(false);
      else if (confirm) setConfirm(null);
      else if (editing) setEditing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpenFor, addOpen, reportOpen, confirm, editing]);

  // Seed the picker from the same directory the group-creation dialog uses,
  // so both pickers always resolve the same people. Runs when the dialog
  // opens; the dependency list is the dialog identity, not the member rows.
  useEffect(() => {
    if (!addOpen) return;
    let cancelled = false;
    void (async () => {
      setAddLoading(true);
      const result = await apiFetch<{ suggestedUsers: SearchUser[] }>(
        "/api/discovery"
      );
      if (cancelled) return;
      if (result.ok) {
        setAddCandidates(
          result.data.suggestedUsers
            .filter((user) => user.id !== viewerId && !memberIds.has(user.id))
            .map((user) => ({
              id: user.id,
              name: candidateName(user),
              avatarUrl: user.avatar_url,
            }))
        );
      }
      setAddLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOpen, viewerId]);

  // Typing searches the people directory, debounced so every keystroke is
  // not a request. Clearing the box restores the seeded suggestions.
  useEffect(() => {
    if (!addOpen) return;
    if (addDebounceRef.current) window.clearTimeout(addDebounceRef.current);
    const trimmed = addQuery.trim();
    if (trimmed.length < 2) return;
    addDebounceRef.current = window.setTimeout(() => {
      void (async () => {
        setAddLoading(true);
        const result = await apiFetch<SearchResponse>(
          `/api/search?q=${encodeURIComponent(trimmed)}&type=user&limit=20`
        );
        if (result.ok) {
          const users = result.data.results.filter(
            (entry): entry is SearchUser => entry.type === "user"
          );
          setAddCandidates(
            users
              .filter((user) => user.id !== viewerId && !memberIds.has(user.id))
              .map((user) => ({
                id: user.id,
                name: candidateName(user),
                avatarUrl: user.avatar_url,
              }))
          );
        }
        setAddLoading(false);
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (addDebounceRef.current) window.clearTimeout(addDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addQuery, addOpen, viewerId]);

  const startEdit = (): void => {
    setEditName(conversation.name ?? "");
    setEditDescription(conversation.description ?? "");
    setEditError(null);
    setEditing(true);
  };

  const saveEdit = async (): Promise<void> => {
    if (savingEdit || !editValid) return;
    setSavingEdit(true);
    setEditError(null);
    const result = await apiFetch<{ conversation: ConversationView }>(
      `/api/conversations/${conversation.id}/group`,
      {
        method: "PATCH",
        body: {
          name: trimmedEditName,
          description: trimmedEditDescription,
        },
      }
    );
    setSavingEdit(false);
    if (!result.ok) {
      setEditError(result.error.message);
      return;
    }
    setConversation(result.data.conversation);
    setEditing(false);
  };

  const copyInvite = async (): Promise<void> => {
    if (!conversation.inviteCode) return;
    try {
      await navigator.clipboard.writeText(conversation.inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the code stays visible for a manual copy.
    }
  };

  const applyConversation = (next: ConversationView): void => {
    setConversation(next);
    // The member list itself is server-rendered: re-run the page so the
    // rows (roles, count) come back fresh instead of being patched twice.
    router.refresh();
  };

  const removeMember = async (targetId: string): Promise<void> => {
    setActionError(null);
    const result = await apiFetch<{ conversation: ConversationView }>(
      `/api/conversations/${conversation.id}/members?userId=${targetId}`,
      { method: "DELETE" }
    );
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    applyConversation(result.data.conversation);
  };

  const promoteMember = async (targetId: string): Promise<void> => {
    setActionError(null);
    const result = await apiFetch<{ conversation: ConversationView }>(
      `/api/conversations/${conversation.id}/members/promote`,
      { method: "POST", body: { userId: targetId } }
    );
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    applyConversation(result.data.conversation);
  };

  const leaveGroup = async (): Promise<void> => {
    setActionError(null);
    const result = await apiFetch<{ left: true; deleted: boolean }>(
      `/api/conversations/${conversation.id}/leave`,
      { method: "POST" }
    );
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    // Full load, not router.push: membership just changed, so /messages must
    // render on the server with the current session cookie — a cached client
    // transition would still show this conversation as joined.
    window.location.href = "/messages";
  };

  const openLeaveConfirm = (): void => {
    setConfirm({
      title: "Leave group?",
      body: `You will stop receiving messages from “${title}”. An admin can add you back later.`,
      confirmLabel: "Leave group",
      run: leaveGroup,
    });
  };

  const openRemoveConfirm = (member: GroupMemberView): void => {
    setConfirm({
      title: "Remove member?",
      body: `${memberName(member)} will lose access to this group. They can be added again later.`,
      confirmLabel: "Remove",
      run: () => removeMember(member.user.id),
    });
  };

  const runConfirm = async (): Promise<void> => {
    if (!confirm || confirmBusy) return;
    setConfirmBusy(true);
    try {
      await confirm.run();
      setConfirm(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const submitReport = async (): Promise<void> => {
    if (reporting) return;
    setReporting(true);
    setReportError(null);
    const result = await apiFetch<{ reported: true }>(
      `/api/conversations/${conversation.id}/report`,
      {
        method: "POST",
        body: {
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        },
      }
    );
    setReporting(false);
    if (!result.ok) {
      setReportError(result.error.message);
      return;
    }
    setReportOpen(false);
    setReportDetails("");
    setReportReason("SPAM");
    setReported(true);
  };

  const toggleAdd = (id: string): void => {
    setAddSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((picked) => picked !== id)
        : [...prev, id]
    );
  };

  const closeAdd = (): void => {
    setAddOpen(false);
    setAddQuery("");
    setAddCandidates([]);
    setAddSelectedIds([]);
    setAddError(null);
  };

  const addMembers = async (): Promise<void> => {
    if (adding || addSelectedIds.length === 0) return;
    setAdding(true);
    setAddError(null);
    const result = await apiFetch<{ conversation: ConversationView }>(
      `/api/conversations/${conversation.id}/members`,
      { method: "POST", body: { memberIds: addSelectedIds } }
    );
    setAdding(false);
    if (!result.ok) {
      setAddError(result.error.message);
      return;
    }
    applyConversation(result.data.conversation);
    closeAdd();
  };

  // Selection stays on screen even as the underlying search list changes.
  const selectedCandidates = addCandidates.filter((candidate) =>
    addSelectedIds.includes(candidate.id)
  );
  const visibleCandidates = [
    ...selectedCandidates,
    ...addCandidates.filter(
      (candidate) => !addSelectedIds.includes(candidate.id)
    ),
  ];

  const classes = ["chat-info", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <div className="chat-info__topbar">
        <Link
          href={`/messages/${conversation.id}`}
          className="chat-info__back"
          aria-label="Back to conversation"
        >
          <Icon as={ArrowLeftIcon} size={20} />
        </Link>
        <span className="chat-info__topbar-title">
          {isGroup ? "Group info" : "Contact info"}
        </span>
      </div>

      <div className="chat-info__scroll">
        <section className="chat-info__hero">
          <Avatar
            src={
              isGroup
                ? conversation.avatarUrl
                : conversation.otherUser.avatarUrl
            }
            name={title}
            size="xl"
          />
          <h1 className="chat-info__hero-name">{title}</h1>
          <p className="chat-info__hero-sub">
            {isGroup
              ? `${conversation.memberCount} member${conversation.memberCount === 1 ? "" : "s"}`
              : (handle ?? "")}
          </p>
        </section>

        {editing ? (
          <section className="chat-info__section">
            <Input
              label="Group name"
              value={editName}
              maxLength={60}
              required
              onChange={(event) => setEditName(event.target.value)}
              hint={`${trimmedEditName.length}/60`}
            />
            <Textarea
              label="Description (optional)"
              value={editDescription}
              maxLength={200}
              rows={3}
              onChange={(event) => setEditDescription(event.target.value)}
              hint={`${trimmedEditDescription.length}/200`}
              placeholder="What is this group for?"
            />
            {editError ? (
              <p className="chat-info__error" role="alert">
                {editError}
              </p>
            ) : null}
            <div className="chat-info__edit-actions">
              <Button
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={savingEdit}
                disabled={!editValid}
                onClick={() => void saveEdit()}
              >
                Save
              </Button>
            </div>
          </section>
        ) : isGroup && conversation.description ? (
          <section className="chat-info__section">
            <h2 className="chat-info__section-title">Description</h2>
            <p className="chat-info__description">{conversation.description}</p>
          </section>
        ) : isGroup && isAdmin ? (
          <section className="chat-info__section">
            <Button variant="ghost" onClick={startEdit}>
              <Icon as={EditIcon} size={16} /> Add group description
            </Button>
          </section>
        ) : null}

        {isGroup && conversation.inviteCode ? (
          <section className="chat-info__section">
            <div className="chat-info__invite">
              <span className="chat-info__invite-icon" aria-hidden="true">
                <Icon as={LinkIcon} size={16} />
              </span>
              <div className="chat-info__invite-text">
                <span className="chat-info__invite-label">Invite code</span>
                <code className="chat-info__invite-code">
                  {conversation.inviteCode}
                </code>
              </div>
              <button
                type="button"
                className="chat-info__icon-btn"
                onClick={() => void copyInvite()}
                aria-label={copied ? "Invite code copied" : "Copy invite code"}
              >
                <Icon as={copied ? CheckIcon : CopyIcon} size={16} />
              </button>
            </div>
            <p className="chat-info__invite-hint" aria-live="polite">
              {copied
                ? "Copied."
                : "Share this code so people can find the group."}
            </p>
          </section>
        ) : null}

        {isGroup ? (
          <section className="chat-info__section chat-info__section--members">
            <div className="chat-info__section-head">
              <h2 className="chat-info__section-title">
                <Icon as={UsersIcon} size={16} aria-hidden="true" />{" "}
                {conversation.memberCount} member
                {conversation.memberCount === 1 ? "" : "s"}
              </h2>
              {isAdmin ? (
                <button
                  type="button"
                  className="chat-info__add-btn"
                  onClick={() => setAddOpen(true)}
                >
                  <Icon as={UserPlusIcon} size={15} />
                  Add
                </button>
              ) : null}
            </div>
            <ul className="chat-info__members">
              {members.map((member) => {
                const name = memberName(member);
                const canManage = isAdmin && !member.isSelf;
                const menuOpen = menuOpenFor === member.user.id;
                return (
                  <li key={member.user.id} className="chat-info__member">
                    <span className="chat-info__member-avatar">
                      <Avatar
                        src={member.user.avatarUrl}
                        name={name}
                        size="sm"
                      />
                    </span>
                    <span className="chat-info__member-text">
                      <span className="chat-info__member-name">
                        {name}
                        {member.isSelf ? " (you)" : ""}
                      </span>
                      {member.user.username ? (
                        <span className="chat-info__member-handle">
                          @{member.user.username}
                        </span>
                      ) : null}
                    </span>
                    {member.role === "ADMIN" ? (
                      <span className="chat-info__admin-badge">Admin</span>
                    ) : null}
                    {canManage ? (
                      <>
                        <div className="chat-info__row-menu-wrap">
                          <button
                            type="button"
                            className="chat-info__row-menu-btn"
                            aria-label={`Actions for ${name}`}
                            aria-expanded={menuOpen}
                            onClick={() =>
                              setMenuOpenFor(menuOpen ? null : member.user.id)
                            }
                          >
                            <Icon as={MoreVerticalIcon} size={16} />
                          </button>
                          {menuOpen ? (
                            <div className="chat-info__row-menu" role="menu">
                              {member.role === "MEMBER" ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setMenuOpenFor(null);
                                    void promoteMember(member.user.id);
                                  }}
                                >
                                  Make admin
                                </button>
                              ) : null}
                              <button
                                type="button"
                                role="menuitem"
                                className="chat-info__row-menu-danger"
                                onClick={() => {
                                  setMenuOpenFor(null);
                                  openRemoveConfirm(member);
                                }}
                              >
                                Remove member
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {menuOpen ? (
                          <button
                            type="button"
                            className="chat-info__menu-backdrop"
                            aria-label="Close menu"
                            onClick={() => setMenuOpenFor(null)}
                          />
                        ) : null}
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {reported ? (
          <p className="chat-info__note" role="status">
            Report received. Our team will review it.
          </p>
        ) : null}
        {actionError ? (
          <p className="chat-info__error" role="alert">
            {actionError}
          </p>
        ) : null}

        <section className="chat-info__section chat-info__section--actions">
          {isGroup && isAdmin ? (
            <button
              type="button"
              className="chat-info__action"
              onClick={startEdit}
            >
              <Icon as={EditIcon} size={18} />
              <span>Edit group info</span>
            </button>
          ) : null}
          {isGroup ? (
            <button
              type="button"
              className="chat-info__action chat-info__action--danger"
              onClick={openLeaveConfirm}
            >
              <Icon as={LogoutIcon} size={18} />
              <span>Leave group</span>
            </button>
          ) : null}
          <button
            type="button"
            className="chat-info__action chat-info__action--danger"
            onClick={() => setReportOpen(true)}
          >
            <Icon as={FlagIcon} size={18} />
            <span>Report conversation</span>
          </button>
        </section>
      </div>

      {addOpen ? (
        <DialogShell label="Add members" onClose={closeAdd}>
          <div className="chat-info__search">
            <Icon as={SearchIcon} size={16} />
            <input
              type="search"
              className="chat-info__search-input"
              placeholder="Search people"
              value={addQuery}
              onChange={(event) => setAddQuery(event.target.value)}
              aria-label="Search people to add"
            />
          </div>
          <p className="chat-info__count" aria-live="polite">
            {addSelectedIds.length} selected
          </p>
          <ul className="chat-info__candidates">
            {addLoading ? (
              <li className="chat-info__empty">Searching…</li>
            ) : visibleCandidates.length === 0 ? (
              <li className="chat-info__empty">
                No people found. Try another name.
              </li>
            ) : (
              visibleCandidates.map((candidate) => {
                const checked = addSelectedIds.includes(candidate.id);
                return (
                  <li key={candidate.id} className="chat-info__candidate">
                    <button
                      type="button"
                      className="chat-info__pick"
                      onClick={() => toggleAdd(candidate.id)}
                      aria-pressed={checked}
                      aria-label={`${checked ? "Remove" : "Add"} ${candidate.name}`}
                    >
                      <Avatar
                        src={candidate.avatarUrl}
                        name={candidate.name}
                        size="sm"
                      />
                      <span className="chat-info__pick-name">
                        {candidate.name}
                      </span>
                      <span
                        className={
                          checked
                            ? "chat-info__pick-check chat-info__pick-check--on"
                            : "chat-info__pick-check"
                        }
                        aria-hidden="true"
                      >
                        {checked ? <Icon as={CheckIcon} size={14} /> : null}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {addError ? (
            <p className="chat-info__error" role="alert">
              {addError}
            </p>
          ) : null}
          <div className="chat-info__dialog-actions">
            <Button variant="ghost" onClick={closeAdd} disabled={adding}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={adding}
              disabled={addSelectedIds.length === 0}
              onClick={() => void addMembers()}
            >
              Add{addSelectedIds.length > 0 ? ` ${addSelectedIds.length}` : ""}
            </Button>
          </div>
        </DialogShell>
      ) : null}

      {reportOpen ? (
        <DialogShell
          label="Report conversation"
          onClose={() => setReportOpen(false)}
        >
          <p className="chat-info__dialog-hint">
            Reports go to our trust and safety team. The other person is never
            told who reported them.
          </p>
          <label className="chat-info__field-label" htmlFor="chat-info-reason">
            Reason
          </label>
          <select
            id="chat-info-reason"
            className="chat-info__select"
            value={reportReason}
            onChange={(event) =>
              setReportReason(event.target.value as ReportReason)
            }
          >
            {REPORT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {REPORT_REASON_LABELS[reason]}
              </option>
            ))}
          </select>
          <Textarea
            label="Details (optional)"
            value={reportDetails}
            maxLength={2000}
            rows={3}
            onChange={(event) => setReportDetails(event.target.value)}
            placeholder="Anything we should know?"
          />
          {reportError ? (
            <p className="chat-info__error" role="alert">
              {reportError}
            </p>
          ) : null}
          <div className="chat-info__dialog-actions">
            <Button
              variant="ghost"
              onClick={() => setReportOpen(false)}
              disabled={reporting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={reporting}
              onClick={() => void submitReport()}
            >
              Submit report
            </Button>
          </div>
        </DialogShell>
      ) : null}

      {confirm ? (
        <DialogShell label={confirm.title} onClose={() => setConfirm(null)}>
          <p className="chat-info__dialog-hint">{confirm.body}</p>
          <div className="chat-info__dialog-actions">
            <Button
              variant="ghost"
              onClick={() => setConfirm(null)}
              disabled={confirmBusy}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={confirmBusy}
              onClick={() => void runConfirm()}
            >
              {confirm.confirmLabel}
            </Button>
          </div>
        </DialogShell>
      ) : null}
    </div>
  );
}

