"use client";

import { useCallback, useState } from "react";
import {
  Bookmark,
  Heart,
  Link2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Card } from "@/components/ui/Card/Card";
import { Icon } from "@/components/ui/Icon/Icon";
import { CommentSection } from "@/components/feed/CommentSection/CommentSection";
import { PostMedia } from "@/components/feed/PostMedia/PostMedia";
import { ShareMenu } from "@/components/feed/ShareMenu/ShareMenu";
import { apiFetch } from "@/lib/client/api";
import type { FeedViewer, PostWithViewerState } from "@/lib/feed/types";
import { formatTimeAgo } from "@/utils/time";
import { linkifyText } from "@/utils/text";
import "./PostCard.css";

export interface PostCardProps {
  post: PostWithViewerState;
  viewer: FeedViewer;
  /** Called after the post is deleted, so the feed can drop it. */
  onDelete?: (postId: string) => void;
  /** The permalink page opens the thread; the feed does not. */
  commentsOpenByDefault?: boolean;
  className?: string;
}

interface PostCounts {
  like_count: number;
  comment_count: number;
  share_count: number;
}

/**
 * One post: who wrote it, what they said, and the four things you can do about
 * it.
 *
 * Likes and saves are optimistic — the icon flips immediately and is put back
 * exactly as it was if the request fails. That is the right trade for a tap
 * that is cheap to undo, and the wrong trade for a comment or a delete, which
 * is why those two wait for the server and show their own errors.
 *
 * Counts are reconciled from the server's response, so two people liking at
 * once still end up seeing the same number.
 */
export function PostCard({
  post,
  viewer,
  onDelete,
  commentsOpenByDefault = false,
  className,
}: PostCardProps): React.JSX.Element {
  const [liked, setLiked] = useState(post.liked);
  const [saved, setSaved] = useState(post.saved);
  const [counts, setCounts] = useState<PostCounts>({
    like_count: post.like_count,
    comment_count: post.comment_count,
    share_count: post.share_count,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(commentsOpenByDefault);
  const [shareOpen, setShareOpen] = useState(false);
  const [likingBusy, setLikingBusy] = useState(false);
  const [savingBusy, setSavingBusy] = useState(false);
  const [menuNote, setMenuNote] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const author = post.author;
  const authorName =
    author.display_name ?? author.full_name ?? author.username ?? "Someone";
  const isOwner = author.id === viewer.id;
  const classes = ["post-card", className ?? ""].filter(Boolean).join(" ");

  const toggleLike = useCallback(async (): Promise<void> => {
    if (likingBusy) return;
    const wasLiked = liked;
    const delta = wasLiked ? -1 : 1;

    setLiked(!wasLiked);
    setCounts((current) => ({
      ...current,
      like_count: Math.max(0, current.like_count + delta),
    }));
    setLikingBusy(true);
    setActionError(null);

    const result = await apiFetch<PostCounts>(`/api/posts/${post.id}/like`, {
      method: wasLiked ? "DELETE" : "POST",
    });

    if (!result.ok) {
      setLiked(wasLiked);
      setCounts((current) => ({
        ...current,
        like_count: Math.max(0, current.like_count - delta),
      }));
      setActionError(result.error.message);
    } else {
      setCounts(result.data);
    }
    setLikingBusy(false);
  }, [liked, likingBusy, post.id]);

  const toggleSave = useCallback(async (): Promise<void> => {
    if (savingBusy) return;
    const wasSaved = saved;

    setSaved(!wasSaved);
    setSavingBusy(true);
    setActionError(null);

    const result = await apiFetch(`/api/posts/${post.id}/save`, {
      method: wasSaved ? "DELETE" : "POST",
    });

    if (!result.ok) {
      setSaved(wasSaved);
      setActionError(result.error.message);
    }
    setSavingBusy(false);
  }, [post.id, saved, savingBusy]);

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/post/${post.id}`
      );
      setMenuNote("Link copied to your clipboard.");
    } catch {
      setMenuNote("Could not copy the link.");
    }
  };

  const remove = async (): Promise<void> => {
    setMenuOpen(false);
    const result = await apiFetch(`/api/posts/${post.id}`, { method: "DELETE" });

    if (!result.ok) {
      // A failed delete is not reversible by guessing, so the feed is left
      // showing the post instead of pretending it is gone.
      setActionError(result.error.message);
      return;
    }
    onDelete?.(post.id);
  };

return (
    <Card as="article" className={classes}>
      <header className="post-card__head">
        <Avatar src={author.avatar_url} name={authorName} size="md" />

        <div className="post-card__identity">
          <span className="post-card__name">{authorName}</span>
          <span className="post-card__meta">
            {author.username ? <span>@{author.username}</span> : null}
            <span aria-hidden="true">·</span>
            <time dateTime={post.created_at}>
              {formatTimeAgo(post.created_at)}
            </time>
          </span>
        </div>

        <div className="post-card__menu-wrap">
          <button
            type="button"
            className="post-card__menu-button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Post options"
            onClick={() => {
              setMenuOpen((open) => !open);
              setMenuNote(null);
            }}
          >
            <Icon as={MoreHorizontal} size={18} />
          </button>

          {menuOpen ? (
            <div className="post-card__menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="post-card__menu-item"
                onClick={() => void copyLink()}
              >
                <Icon as={Link2} size={16} />
                <span>Copy link</span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="post-card__menu-item"
                disabled
                title="Reporting arrives with moderation"
              >
                <Icon as={Send} size={16} />
                <span>Report</span>
                <span className="post-card__soon">Soon</span>
              </button>

              {isOwner ? (
                <button
                  type="button"
                  role="menuitem"
                  className="post-card__menu-item post-card__menu-item--danger"
                  onClick={() => void remove()}
                >
                  <Icon as={Trash2} size={16} />
                  <span>Delete</span>
                </button>
              ) : null}

              {menuNote ? (
                <p className="post-card__menu-note" role="status">
                  {menuNote}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className="post-card__body">
        <p className="post-card__text">{linkifyText(post.body)}</p>

        {post.location ? (
          <p className="post-card__location">
            <Icon as={MapPin} size={14} />
            <span>{post.location}</span>
          </p>
        ) : null}
      </div>

      <PostMedia media={post.media} />

      {actionError ? (
        <p className="post-card__error" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="post-card__actions">
        <button
          type="button"
          className={["post-card__action", liked ? "post-card__action--liked" : ""]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={liked}
          aria-label={liked ? "Unlike this post" : "Like this post"}
          disabled={likingBusy}
          onClick={() => void toggleLike()}
        >
          <Icon as={Heart} size={18} />
          {counts.like_count > 0 ? <span>{counts.like_count}</span> : null}
        </button>

        <button
          type="button"
          className={[
            "post-card__action",
            commentsOpen ? "post-card__action--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-expanded={commentsOpen}
          aria-label="Show comments"
          onClick={() => setCommentsOpen((open) => !open)}
        >
          <Icon as={MessageCircle} size={18} />
          {counts.comment_count > 0 ? (
            <span>{counts.comment_count}</span>
          ) : null}
        </button>

        <button
          type="button"
          className="post-card__action"
          aria-label="Share this post"
          onClick={() => setShareOpen(true)}
        >
          <Icon as={Share2} size={18} />
          {counts.share_count > 0 ? (
            <span>{counts.share_count}</span>
          ) : null}
        </button>

        <button
          type="button"
          className={["post-card__action", "post-card__action--save", saved ? "post-card__action--saved" : ""]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save this post"}
          disabled={savingBusy}
          onClick={() => void toggleSave()}
        >
          <Icon as={Bookmark} size={18} />
        </button>
      </div>

      {commentsOpen ? (
        <CommentSection
          postId={post.id}
          viewer={viewer}
          onCommentAdded={() =>
            setCounts((current) => ({
              ...current,
              comment_count: current.comment_count + 1,
            }))
          }
          onCommentDeleted={() =>
            setCounts((current) => ({
              ...current,
              comment_count: Math.max(0, current.comment_count - 1),
            }))
          }
        />
      ) : null}

      {shareOpen ? (
        <ShareMenu
          postId={post.id}
          onClose={() => setShareOpen(false)}
          onShared={() =>
            setCounts((current) => ({
              ...current,
              share_count: current.share_count + 1,
            }))
          }
        />
      ) : null}
    </Card>
  );
}
