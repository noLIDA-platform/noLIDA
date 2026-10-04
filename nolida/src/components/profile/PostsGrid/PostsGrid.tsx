import Link from "next/link";
import { Image as ImageIcon, MessageSquare, Play, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import { parsePostMedia } from "@/lib/feed/constants";
import type { ProfilePostTile } from "@/lib/profile/types";
import "./PostsGrid.css";

export interface PostsGridProps {
  posts: ProfilePostTile[];
  /** Wording is the page's, not this component's: "you have not posted yet" and
   *  "they have not posted yet" are different sentences. */
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

/**
 * The posts tab: a three-column grid of square thumbnails.
 *
 * A Server Component. A grid of links needs no state and no JavaScript, and
 * rendering it on the server means the whole profile is one HTML document.
 *
 * Three columns at every width, deliberately. The Instagram layout does not
 * change column count on a phone — a two-column grid on mobile makes each tile
 * big enough to be mistaken for a feed post, and the density is the point.
 *
 * `media` is read through `parsePostMedia`, not trusted as an array: the column
 * is JSONB and predates this grid, so a legacy or hand-edited row must not be
 * able to render a broken tile.
 */
export function PostsGrid({
  posts,
  emptyTitle = "No posts yet",
  emptyDescription = "Posts will appear here once there are some.",
  className,
}: PostsGridProps): React.JSX.Element {
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<Icon as={ImageIcon} size={28} />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <ul
      className={["posts-grid", className ?? ""].filter(Boolean).join(" ")}
    >
      {posts.map((post) => {
        const media = parsePostMedia(post.media);
        const firstImage = media.find((item) => item.type === "image");
        const hasVideo = media.some((item) => item.type === "video");
        const isTextOnly = !firstImage && !hasVideo;

        return (
          <li key={post.id} className="posts-grid__cell">
            <Link
              href={`/post/${post.id}`}
              className="posts-grid__link"
              // The tile itself carries the meaning; the alt text would otherwise
              // be read on top of it.
              aria-label={post.body ? `Post: ${post.body.slice(0, 80)}` : "Post"}
            >
              {firstImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={firstImage.url}
                  alt=""
                  className="posts-grid__image"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : isTextOnly ? (
                <span className="posts-grid__text">{post.body}</span>
              ) : (
                <span className="posts-grid__video">
                  <Icon as={Play} size={24} />
                </span>
              )}

              {hasVideo ? (
                <span
                  className="posts-grid__badge"
                  // Decorative: the cell's own label already says what it is.
                  aria-hidden="true"
                >
                  <Icon as={Play} size={12} />
                </span>
              ) : null}

              {post.comment_count && post.comment_count > 0 ? (
                <span
                  className="posts-grid__comments"
                  aria-hidden="true"
                >
                  <Icon as={MessageSquare} size={14} />
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}