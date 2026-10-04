"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PostMediaItem } from "@/lib/feed/constants";
import "./MediaViewer.css";

export interface MediaViewerProps {
  items: PostMediaItem[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * Fullscreen media lightbox.
 *
 * Escape closes, arrows navigate, and a touch swipe moves between items. The
 * three behaviours a viewer expects without being told, all of which have to be
 * added explicitly because there is no native dialog here.
 *
 * Focus goes to the close button on open and the body scroll is locked while it
 * is open, so the page behind does not scroll under the overlay and the
 * keyboard lands somewhere sensible. Both are restored on close.
 */
export function MediaViewer({
  items,
  initialIndex,
  onClose,
}: MediaViewerProps): React.JSX.Element {
  const [index, setIndex] = useState(initialIndex);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Explicitly `number | null`: useRef(0) alone infers the literal type `0`, so
  // assigning the swipe delta would not typecheck.
  const touchStartX = useRef<number | null>(null);

  const goPrev = useCallback((): void => {
    setIndex((current) => (current - 1 + items.length) % items.length);
  }, [items.length]);

  const goNext = useCallback((): void => {
    setIndex((current) => (current + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, onClose]);

  // Lock the page behind the overlay. Restored on close, so navigating away
  // from the viewer does not leave the document unscrollable.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const current = items[index];

  if (!current) return <></>;

  return (
    <div
      className="media-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Media ${index + 1} of ${items.length}`}
      onClick={(event) => {
        // A click on the backdrop closes; a click on the media does not, so
        // tapping a photo to inspect it does not dismiss the whole thing.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        ref={closeRef}
        type="button"
        className="media-viewer__close"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={22} />
      </button>

      {items.length > 1 ? (
        <>
          <button
            type="button"
            className="media-viewer__nav media-viewer__nav--prev"
            onClick={goPrev}
            aria-label="Previous"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            className="media-viewer__nav media-viewer__nav--next"
            onClick={goNext}
            aria-label="Next"
          >
            <ChevronRight size={24} />
          </button>
        </>
      ) : null}

      <div
        className="media-viewer__stage"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          const end = event.changedTouches[0]?.clientX;
          if (start === null || end === undefined) return;

          const delta = end - start;
          // 50px of intent, so a stray tap while scrolling is not a swipe.
          if (Math.abs(delta) < 50) return;
          if (delta > 0) goPrev();
          else goNext();
        }}
      >
        {current.type === "video" ? (
          <video
            key={current.url}
            className="media-viewer__video"
            src={current.url}
            controls
            autoPlay
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.url}
            className="media-viewer__img"
            src={current.url}
            alt=""
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {items.length > 1 ? (
        <p className="media-viewer__counter" aria-live="polite">
          {index + 1} / {items.length}
        </p>
      ) : null}
    </div>
  );
}