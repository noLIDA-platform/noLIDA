"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Card } from "@/components/ui/Card/Card";
import { Icon } from "@/components/ui/Icon/Icon";
import type { SearchPost } from "@/types/search";
import { formatTimeAgo } from "@/utils/time";
import "./PostResultCard.css";

export interface PostResultCardProps {
  post: SearchPost;
  className?: string;
}

/**
 * A post, as it appears in search results and discovery sections.
 *
 * Deliberately smaller than the feed's `PostCard`: no actions, no comment
 * thread. A result list can be twenty rows long, and giving each one a working
 * like button means twenty sets of optimistic state to get wrong. The whole
 * card links to `/post/[id]`, where the real card and its comments live.
 *
 * The author is not linked from here: on a phone the target of the whole card
 * is the post, and a link inside a link is not a thing to hand someone.
 */
export function PostResultCard({
  post,
  className,
}: PostResultCardProps): React.JSX.Element {
  const author = post.author;
  const authorName =
    author.display_name ?? author.full_name ?? author.username ?? "Someone";
  const classes = ["post-result", className ?? ""].filter(Boolean).join(" ");

  return (
    <Card as="article" className={classes}>
      <Link href={`/post/${post.id}`} className="post-result__link">
        <div className="post-result__head">
          <Avatar src={author.avatar_url} name={authorName} size="sm" />

          <span className="post-result__identity">
            <span className="post-result__name">{authorName}</span>
            <span className="post-result__meta">
              {author.username ? <span>@{author.username}</span> : null}
              <span aria-hidden="true">·</span>
              <time dateTime={post.created_at}>
                {formatTimeAgo(post.created_at)}
              </time>
            </span>
          </span>
        </div>

        {/* Three lines, then an ellipsis: enough to judge relevance from a
            result list, without pretending the reader has read the post. */}
        <p className="post-result__body">{post.body}</p>

        {post.location ? (
          <p className="post-result__location">{post.location}</p>
        ) : null}

        <div className="post-result__counts">
          {post.like_count > 0 ? (
            <span className="post-result__count">
              {post.like_count} {post.like_count === 1 ? "like" : "likes"}
            </span>
          ) : null}
          {post.comment_count > 0 ? (
            <span className="post-result__count">
              <Icon as={MessageCircle} size={12} />
              {post.comment_count}
            </span>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}