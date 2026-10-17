"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { CheckIcon, SearchIcon, XIcon } from "@/components/ui/Icons";
import { ImageUploader } from "@/components/ui/ImageUploader/ImageUploader";
import { Input } from "@/components/ui/Input/Input";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { apiFetch } from "@/lib/client/api";
import type { ConversationView } from "@/lib/messaging/types";
import type { SearchResponse, SearchUser } from "@/types/search";
import "./NewGroupDialog.css";

export interface NewGroupDialogProps {
  /** The viewer — excluded from the picker, so they cannot select themselves. */
  currentUserId?: string;
  onClose: () => void;
  onCreated?: (conversation: ConversationView) => void;
  className?: string;
}

const SEARCH_DEBOUNCE_MS = 250;
/** 255 picked members + the creator = the 256 cap the service enforces. */
const MAX_PICKED_MEMBERS = 255;

interface Candidate {
  id: string;
  name: string;
  avatarUrl: string | null;
}

function candidateName(user: SearchUser): string {
  return user.display_name ?? user.full_name ?? user.username ?? "Someone";
}

function candidateFromSearch(user: SearchUser): Candidate {
  return { id: user.id, name: candidateName(user), avatarUrl: user.avatar_url };
}

/**
 * Step 1 of the group flow: pick members from a searchable directory,
 * then name the group. The picker seeds itself from `/api/discovery`
 * (people the viewer may already know) and searches `/api/search`
 * with `type=user` for everyone else. Both endpoints return the same
 * `SearchUser` shape, so one normaliser covers both.
 */
export function NewGroupDialog({
  currentUserId,
  onClose,
  onCreated,
  className,
}: NewGroupDialogProps): React.JSX.Element {
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const selectedSet = new Set(selectedIds);

  // Seed the picker with suggested people so step 1 is never an empty box.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await apiFetch<{ suggestedUsers: SearchUser[] }>(
        "/api/discovery"
      );
      if (cancelled) return;
      if (result.ok) {
        setCandidates(
          result.data.suggestedUsers
            .filter((user) => user.id !== currentUserId)
            .map(candidateFromSearch)
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  // Typing searches the people directory, debounced so every keystroke is
  // not a request. Clearing the box restores the seeded suggestions.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    debounceRef.current = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const result = await apiFetch<SearchResponse>(
          `/api/search?q=${encodeURIComponent(trimmed)}&type=user&limit=20`
        );
        if (result.ok) {
          const users = result.data.results.filter(
            (entry): entry is SearchUser => entry.type === "user"
          );
          setCandidates(
            users
              .filter((user) => user.id !== currentUserId)
              .map(candidateFromSearch)
          );
        }
        setLoading(false);
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, currentUserId]);

  const toggle = (id: string): void => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((picked) => picked !== id);
      if (prev.length >= MAX_PICKED_MEMBERS) return prev;
      return [...prev, id];
    });
  };

  // The server accepts a group of two (creator + one member — the validator
  // is .min(1)); requiring two picks here would reject a valid group.
  const canAdvance =
    selectedIds.length >= 1 && selectedIds.length <= MAX_PICKED_MEMBERS;
  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 1 && trimmedName.length <= 60;
  const descriptionValid = description.trim().length <= 200;

  const create = async (): Promise<void> => {
    if (creating || !canAdvance || !nameValid || !descriptionValid) return;
    setCreating(true);
    setError(null);
    const result = await apiFetch<{ conversation: ConversationView }>(
      "/api/conversations/group",
      {
        method: "POST",
        body: {
          name: trimmedName,
          description: description.trim() || undefined,
          avatarUrl: avatarUrl ?? undefined,
          memberIds: selectedIds,
        },
      }
    );
    if (!result.ok) {
      setError(result.error.message);
      setCreating(false);
      return;
    }
    onCreated?.(result.data.conversation);
    // Full load, not router.push: the thread must render on the server
    // with the current session cookie; a cached client transition would
    // show stale membership.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full load; the thread must render server-side with the current session cookie
    window.location.assign(`/messages/${result.data.conversation.id}`);
  };

  const selectedCandidates = candidates.filter((candidate) =>
    selectedSet.has(candidate.id)
  );
  // Selected people stay visible at the top even as the search list changes.
  const visibleCandidates = [
    ...selectedCandidates,
    ...candidates.filter((candidate) => !selectedSet.has(candidate.id)),
  ];

  return (
    <div
      className={["new-group", className ?? ""].filter(Boolean).join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={step === 1 ? "Add members" : "New group"}
    >
      <div className="new-group__header">
        <h2 className="new-group__title">
          {step === 1 ? "Add members" : "New group"}
        </h2>
        <button
          type="button"
          className="new-group__close"
          onClick={onClose}
          aria-label="Close new group dialog"
        >
          <Icon as={XIcon} size={18} />
        </button>
      </div>

      {step === 1 ? (
        <>
          <div className="new-group__search">
            <Icon as={SearchIcon} size={16} />
            <input
              type="search"
              className="new-group__search-input"
              placeholder="Search people"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search people to add"
            />
          </div>
          <p className="new-group__count" aria-live="polite">
            {selectedIds.length} selected
            {selectedIds.length >= MAX_PICKED_MEMBERS
              ? " — group limit reached"
              : ""}
          </p>
          <ul className="new-group__list">
            {loading ? (
              <li className="new-group__empty">Searching…</li>
            ) : visibleCandidates.length === 0 ? (
              <li className="new-group__empty">
                No people found. Try another name.
              </li>
            ) : (
              visibleCandidates.map((candidate) => {
                const checked = selectedSet.has(candidate.id);
                const full =
                  !checked && selectedIds.length >= MAX_PICKED_MEMBERS;
                return (
                  <li key={candidate.id} className="new-group__row">
                    <button
                      type="button"
                      className="new-group__pick"
                      onClick={() => toggle(candidate.id)}
                      disabled={full}
                      aria-pressed={checked}
                      aria-label={`${checked ? "Remove" : "Add"} ${candidate.name}`}
                    >
                      <span className="new-group__avatar">
                        <Avatar
                          src={candidate.avatarUrl}
                          name={candidate.name}
                          size="sm"
                        />
                      </span>
                      <span className="new-group__name">{candidate.name}</span>
                      <span
                        className={[
                          "new-group__check",
                          checked ? "new-group__check--on" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
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
          <div className="new-group__footer">
            <Button
              variant="primary"
              disabled={!canAdvance}
              onClick={() => setStep(2)}
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="new-group__photo">
            <ImageUploader
              value={avatarUrl}
              onChange={setAvatarUrl}
              purpose="avatar"
              aspect="square"
              label="Group photo (optional)"
            />
          </div>
          <div className="new-group__fields">
            <Input
              label="Group name"
              value={name}
              maxLength={60}
              required
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Site crew — Lekki"
              hint={`${trimmedName.length}/60`}
            />
            <Textarea
              label="Description (optional)"
              value={description}
              maxLength={200}
              rows={3}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this group for?"
              hint={`${description.trim().length}/200`}
            />
          </div>
          {error ? (
            <p className="new-group__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="new-group__footer new-group__footer--split">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              variant="primary"
              loading={creating}
              disabled={!nameValid || !descriptionValid}
              onClick={() => void create()}
            >
              Create group
            </Button>
          </div>
        </>
      )}
    </div>
  );
}



