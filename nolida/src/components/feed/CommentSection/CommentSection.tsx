"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { apiFetch } from "@/lib/client/api";
import { COMMENT_BODY_MAX } from "@/lib/feed/constants";
import type { CommentWithAuthor, FeedViewer } from "@/lib/feed/types";
import { formatTimeAgo } from "@/utils/time";
import { linkifyText } from "@/utils/text";
import "./CommentSection.css";

export interface CommentSectionProps {
  postId: string;
  /** Seeds the list so the thread does not flash empty before it loads. */
  initialComments?: CommentWithAuthor[];
  viewer: FeedViewer;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}

interface CommentPage {
  rows: CommentWithAuthor[];
  nextCursor: string | null;
}

/**
 * The comment thread under one post.
 *
 * Loads on mount rather than with the feed: a page of twenty posts should not
 * carry twenty threads nobody has opened. Opening a thread is the signal that
 * its comments are wanted.
 *
 * Replies are stored with a `parent_id` and the schema supports nesting, but
 * this composer posts top-level comments only — a full nested thread UI belongs
 * with the messaging work, and a "Reply" that quietly posted as a top-level
 * comment would be worse than no Reply button.
 */
export function CommentSection({
  postId,
  initialComments,
  viewer,
  onCommentAdded,
  onCommentDeleted,
}: CommentSectionProps): React.JSX.Element {
  const [comments, setComments] = useState<CommentWithAuthor[]>(
    initialComments ?? []
  );
  const [loading, setLoading] = useState((initialComments ?? []).length === 0);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  /** Re-reads the thread after an error. An event handler, not an effect. */
  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    const result = await apiFetch<CommentPage>(
      `/api/posts/${postId}/comments?limit=50`
    );

    if (!result.ok) {
      setError(result.error.message);
    } else {
      setComments(result.data.rows);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    /*
     * The first load runs inline rather than through `load`. `load` sets state
     * synchronously, and an effect body must not: that costs a second render
     * pass for data which was never on screen. `cancelled` drops a response
     * that arrives after the thread has been closed.
     */
    let cancelled = false;

    void apiFetch<CommentPage>(`/api/posts/${postId}/comments?limit=50`).then(
      (result) => {
        if (cancelled) return;

        if (result.ok) {
          setComments(result.data.rows);
        } else {
          setError(result.error.message);
        }
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const submit = async (): Promise<void> => {
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      setFormError("A comment cannot be empty.");
      return;
    }
    if (trimmed.length > COMMENT_BODY_MAX) {
      setFormError(`A comment can be at most ${COMMENT_BODY_MAX} characters.`);
      return;
    }

    setFormError(null);
    setSubmitting(true);

    const result = await apiFetch<{ comment: CommentWithAuthor }>(
      `/api/posts/${postId}/comments`,
      { method: "POST", body: { body: trimmed } }
    );

    if (!result.ok) {
      setFormError(result.error.message);
    } else {
      // Appended with the server's own row, not an optimistic copy: a comment
      // that appears and then never exists is a worse lie than a brief wait.
      setComments((current) => [...current, result.data.comment]);
      setBody("");
      onCommentAdded?.();
    }
    setSubmitting(false);
  };

  const toggleLike = async (comment: CommentWithAuthor): Promise<void> => {
    const isLiked = likedIds.has(comment.id);
    const delta = isLiked ? -1 : 1;

    // Optimistic, then reconciled with the server's count.
    setLikedIds((current) => {
      const next = new Set(current);
      if (isLiked) next.delete(comment.id);
      else next.add(comment.id);
      return next;
    });
    setComments((current) =>
      current.map((item) =>
        item.id === comment.id
          ? { ...item, like_count: Math.max(0, item.like_count + delta) }
          : item
      )
    );

    const result = await apiFetch<{ likeCount: number }>(
      `/api/comments/${comment.id}/like`,
      { method: isLiked ? "DELETE" : "POST" }
    );

    if (!result.ok) {
      // Put it back exactly as it was.
      setLikedIds((current) => {
        const next = new Set(current);
        if (isLiked) next.add(comment.id);
        else next.delete(comment.id);
        return next;
      });
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id
            ? { ...item, like_count: comment.like_count }
            : item
        )
      );
      return;
    }

    setComments((current) =>
      current.map((item) =>
        item.id === comment.id
          ? { ...item, like_count: result.data.likeCount }
          : item
      )
    );
  };

  const remove = async (comment: CommentWithAuthor): Promise<void> => {
    const result = await apiFetch(`/api/comments/${comment.id}`, {
      method: "DELETE",
    });

    if (result.ok) {
      setComments((current) => current.filter((item) => item.id !== comment.id));
      onCommentDeleted?.();
    }
  };

return (
    <div className="comments">
      {loading ? (
        <div className="comments__status">
          <Spinner size="sm" />
          <span>Loading comments…</span>
        </div>
      ) : error ? (
        <div className="comments__status comments__status--error" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <p className="comments__empty">
          No comments yet. Be the first to say something.
        </p>
      ) : (
        <ul className="comments__list">
          {comments.map((comment) => {
            const name =
              comment.author.display_name ??
              comment.author.full_name ??
              comment.author.username ??
              "Someone";
            const isOwner = comment.author.id === viewer.id;
            const isLiked = likedIds.has(comment.id);

            return (
              <li key={comment.id} className="comments__item">
                <Avatar src={comment.author.avatar_url} name={name} size="sm" />

                <div className="comments__body">
                  <div className="comments__meta">
                    <span className="comments__name">{name}</span>
                    <span className="comments__time">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                  </div>

                  <p className="comments__text">{linkifyText(comment.body)}</p>

                  <div className="comments__actions">
                    <button
                      type="button"
                      className={[
                        "comments__action",
                        isLiked ? "comments__action--active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-pressed={isLiked}
                      aria-label={
                        isLiked
                          ? "Remove like from this comment"
                          : "Like this comment"
                      }
                      onClick={() => void toggleLike(comment)}
                    >
                      <Icon as={Heart} size={14} />
                      {comment.like_count > 0 ? (
                        <span>{comment.like_count}</span>
                      ) : null}
                    </button>

                    {isOwner ? (
                      <button
                        type="button"
                        className="comments__action"
                        aria-label="Delete this comment"
                        onClick={() => void remove(comment)}
                      >
                        <Icon as={Trash2} size={14} />
                        <span>Delete</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="comments__composer">
        <Avatar src={viewer.avatarUrl} name={viewer.displayName} size="sm" />
        <div className="comments__composer-body">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a comment…"
            rows={2}
            maxLength={COMMENT_BODY_MAX}
            error={formError ?? undefined}
          />
          <div className="comments__composer-actions">
            <Button
              size="sm"
              onClick={() => void submit()}
              disabled={body.trim().length === 0}
              loading={submitting}
            >
              Reply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
