"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { MediaViewer } from "@/components/feed/MediaViewer/MediaViewer";
import { parsePostMedia, type PostMediaItem } from "@/lib/feed/constants";
import "./PostMedia.css";

export interface PostMediaProps {
  /** Raw `posts.media` from the database. Parsed here, once. */
  media: unknown;
  className?: string;
}

/**
 * A post's attachments, in the grid that fits how many there are.
 *
 * Layouts, which are also the reason the cap is four:
 *
 *   1  → one wide panel
 *   2  → two side by side
 *   3  → one full-width, two beneath
 *   4  → 2x2
 *
 * Videos are ALWAYS full width whatever the count. A 9:16 clip forced into a
 * grid cell renders as a postage stamp, and it is the one item a user most
 * wants to actually watch — so a post with any video drops the grid entirely
 * rather than compromising it.
 *
 * Images use `object-fit: cover` and a fixed aspect ratio, so a mix of portrait
 * and landscape crops to a tidy block instead of making the card ragged.
 */
export function PostMedia({ media, className }: PostMediaProps): React.JSX.Element | null {
  const items: PostMediaItem[] = parsePostMedia(media);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  const hasVideo = items.some((item) => item.type === "video");
  const single = items.length === 1;

  return (
    <div
      className={[
        "post-media",
        `post-media--${items.length}`,
        hasVideo ? "post-media--has-video" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item, index) => (
        <button
          key={`${item.url}-${index}`}
          type="button"
          className={[
            "post-media__item",
            // The lead item of a trio is the only one that spans the row.
            items.length === 3 && index === 0 ? "post-media__item--lead" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setViewerIndex(index)}
          aria-label={`Open ${item.type} ${index + 1} of ${items.length}`}
        >
          {item.type === "video" ? (
            <>
              <video
                src={item.url}
                className="post-media__video"
                muted
                playsInline
                preload="metadata"
              />
              <span className="post-media__play" aria-hidden="true">
                <Play size={18} />
              </span>
            </>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.url}
              alt=""
              className="post-media__img"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}
        </button>
      ))}

      {viewerIndex !== null ? (
        <MediaViewer
          items={items}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </div>
  );
}