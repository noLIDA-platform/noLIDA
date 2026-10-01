"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { PostCard } from "@/components/feed/PostCard/PostCard";
import { PostComposer } from "@/components/feed/PostComposer/PostComposer";
import { apiFetch } from "@/lib/client/api";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import type {
  FeedKind,
  FeedViewer,
  PostWithAuthor,
  PostWithViewerState,
} from "@/lib/feed/types";
import "./Feed.css";

export interface FeedProps {
  /** Pre-fetched on the server so the first paint has posts in it. */
  initialPosts: PostWithViewerState[];
  initialCursor: string | null;
  feedType?: FeedKind;
  /** Required when `feedType` is `"user"`. */
  userId?: string;
  viewer: FeedViewer;
  /** `/home` embeds the composer; `/favorites` does not. */
  showComposer?: boolean;
  className?: string;
}

interface FeedPage {
  posts: PostWithViewerState[];
  nextCursor: string | null;
}

const EMPTY_COPY: Record<FeedKind, { title: string; description: string }> = {
  home: {
    title: "Nothing here yet",
    description:
      "Your feed fills up as the people you follow post. Be the first.",
  },
  user: {
    title: "No posts yet",
    description: "When this person posts, their posts will appear here.",
  },
  saved: {
    title: "Nothing saved",
    description:
      "Tap the bookmark on any post to keep it here for later.",
  },
};

/** Where the next page comes from. Depends only on which list we are paging. */
function nextPageUrl(feedType: FeedKind, userId: string | undefined): string {
  if (feedType === "user") {
    return `/api/feed/user/${userId ?? ""}`;
  }
  if (feedType === "saved") return "/api/feed/saved";
  return "/api/feed";
}

/**
 * A paged list of posts with infinite scroll.
 *
 * The first page arrives as a prop from the server, so the feed is never empty
 * on first paint; only pages two onward are fetched from the browser.
 *
 * Scrolling is IntersectionObserver rather than a scroll listener: the browser
 * already knows when a sentinel is on screen, and a listener would run a
 * calculation on every scroll event all day to learn the same thing.
 */
export function Feed({
  initialPosts,
  initialCursor,
  feedType = "home",
  userId,
  viewer,
  showComposer = false,
  className,
}: FeedProps): React.JSX.Element {
  const [posts, setPosts] = useState<PostWithViewerState[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [newPosts, setNewPosts] = useState<PostWithViewerState[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const classes = ["feed", className ?? ""].filter(Boolean).join(" ");
  const hasMore = cursor !== null;

  // The sentinel going out of view between pages means nothing: only a page
  // that exists is fetched, and only while one is not already in flight.
  const loadMore = useCallback(async (): Promise<void> => {
    if (loadingMore || cursor === null) return;

    setLoadingMore(true);
    setLoadError(null);

    const query = `?limit=${FEED_PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`;
    const result = await apiFetch<FeedPage>(
      `${nextPageUrl(feedType, userId)}${query}`
    );

    if (!result.ok) {
      setLoadError(result.error.message);
    } else {
      setPosts((current) => [...current, ...result.data.posts]);
      setCursor(result.data.nextCursor);
    }
    setLoadingMore(false);
  }, [cursor, feedType, loadingMore, userId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loadMore]);

  /**
   * A post just created by the composer above. It is a real row from the
   * server — `POST /api/posts` returns it with its author — so it can be shown
   * straight away instead of waiting for a reload, and it carries
   * `liked: false, saved: false` because nobody has liked their own new post yet.
   */
  const handlePostCreated = useCallback((post: PostWithAuthor): void => {
    setNewPosts((current) => [
      { ...post, liked: false, saved: false },
      ...current,
    ]);
  }, []);

  const handleDelete = useCallback((postId: string): void => {
    setNewPosts((current) => current.filter((post) => post.id !== postId));
    setPosts((current) => current.filter((post) => post.id !== postId));
  }, []);

  const visiblePosts = [...newPosts, ...posts];
  const empty = visiblePosts.length === 0 && loadError === null;

return (
    <div className={classes}>
      {showComposer ? (
        <div className="feed__composer">
          <PostComposer viewer={viewer} onPostCreated={handlePostCreated} />
        </div>
      ) : null}

      {loadError && empty ? (
        <div className="feed__error" role="alert">
          <p className="feed__error-text">{loadError}</p>
          <Button size="sm" variant="secondary" onClick={() => void loadMore()}>
            Try again
          </Button>
        </div>
      ) : empty ? (
        <div className="feed__empty">
          <EmptyState
            icon={<Icon as={Sparkles} size={28} />}
            title={EMPTY_COPY[feedType].title}
            description={EMPTY_COPY[feedType].description}
          />
        </div>
      ) : (
        <>
          <ul className="feed__list">
            {visiblePosts.map((post) => (
              <li key={post.id} className="feed__item">
                <PostCard
                  post={post}
                  viewer={viewer}
                  onDelete={handleDelete}
                />
              </li>
            ))}
          </ul>

          {loadError ? (
            <div className="feed__error" role="alert">
              <p className="feed__error-text">{loadError}</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void loadMore()}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {/* Watches for the bottom of the list; never drawn. */}
          <div ref={sentinelRef} aria-hidden="true" />

          {loadingMore ? (
            <div className="feed__loading" role="status">
              <Spinner size="sm" />
              <span>Loading more posts…</span>
            </div>
          ) : null}

          {!hasMore && visiblePosts.length > 0 ? (
            <p className="feed__end">You have reached the end.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
