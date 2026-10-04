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
 * Fullscreen media lightbox with a sliding track.
 *
 * Escape closes, arrows navigate, and a touch swipe moves between items. The
 * three behaviours a viewer expects without being told, all of which have to be
 * added explicitly because there is no native dialog here.
 *
 * WHY A TRACK AND NOT A SINGLE ITEM
 *
 * Rendering only the current item makes a slide impossible: there is nothing on
 * screen to slide, so the browser has to cut from A to B. Rendering every item
 * side by side and moving the strip with `translateX` is what makes the movement
 * continuous — one property changes, and CSS interpolates it.
 *
 * TWO THINGS THAT LOOK LIKE BUGS AND ARE NOT
 *
 * Navigation does NOT wrap. Going past the last item does nothing rather than
 * returning to the first, so there is no infinite carousel and the track can
 * never be translated off the end. The arrows disable at each end and say so,
 * which is also the honest answer for someone using a screen reader — a wrapped
 * carousel silently teleports you to item 1 from item 4.
 *
 * Focus goes to the close button on open, is trapped inside the overlay while it
 * is open, and returns to the thumbnail that opened it. The body scroll is locked
 * too, so the page behind does not scroll under the overlay. All are undone on
 * close.
 */

/** Must match the fade-out duration in MediaViewer.css. */
const CLOSE_ANIMATION_MS = 180;

/** CSS stops the transition entirely under reduced motion, so commit instantly. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Pixels of horizontal travel that count as intent rather than a stray tap. */
const SWIPE_THRESHOLD_PX = 50;

export function MediaViewer({
  items,
  initialIndex,
  onClose,
}: MediaViewerProps): React.JSX.Element {
  const [index, setIndex] = useState(initialIndex);
  // True from the moment Close is pressed until the parent unmounts us. CSS
  // plays the fade-out on this class; the timer is only the hand-off, not the
  // animation.
  const [closing, setClosing] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Explicitly `number | null`: useRef(0) alone infers the literal type `0`, so
  // assigning the swipe delta would not typecheck.
  const touchStartX = useRef<number | null>(null);
  // Where focus was when the viewer opened. A ref rather than state: written once
  // on mount, read on unmount, and neither should trigger a render.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const lastIndex = items.length - 1;
  const isFirst = index <= 0;
  const isLast = index >= lastIndex;
  const canNavigate = items.length > 1;

  const goPrev = useCallback((): void => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback((): void => {
    setIndex((current) => Math.min(lastIndex, current + 1));
  }, [lastIndex]);

  /**
   * Close, but let the fade-out play.
   *
   * Called by the close button, the backdrop and Escape — never by the keyboard
   * listener directly, or Escape would cut the animation off at frame zero.
   */
  const close = useCallback((): void => {
    setClosing((alreadyClosing) => {
      if (alreadyClosing) return true;
      const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
      window.setTimeout(onClose, reduced ? 0 : CLOSE_ANIMATION_MS);
      return true;
    });
  }, [onClose]);

  // Captured on mount, restored on unmount. Without the restore, closing the
  // viewer drops keyboard focus onto <body> and the next Tab starts again from
  // the top of the page rather than returning to the thumbnail that opened it.
  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      returnFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
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
  }, [close, goNext, goPrev]);

  // Lock the page behind the overlay. Restored on close, so navigating away
  // from the viewer does not leave the document unscrollable.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (items.length === 0) return <></>;

  // The only tab stops inside the overlay: the close button and the two arrows.
  // The dialog and every slide hold none, so Tab would otherwise walk straight
  // out of the overlay and into the page hidden behind it.
  const focusable = [
    closeRef.current,
    ...Array.from(document.querySelectorAll<HTMLElement>(".media-viewer__nav")),
  ].filter(
    (element): element is HTMLElement =>
      element !== null && !element.hasAttribute("disabled"),
  );

  const onDialogKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key !== "Tab" || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  };

  return (
    <div
      className={["media-viewer", closing ? "media-viewer--closing" : ""]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      onKeyDown={onDialogKeyDown}
      onClick={(event) => {
        // A click on the backdrop closes; a click on the media does not, so
        // tapping a photo to inspect it does not dismiss the whole thing.
        if (event.target === event.currentTarget) close();
      }}
    >
      <button
        ref={closeRef}
        type="button"
        className="media-viewer__close"
        onClick={close}
        aria-label="Close"
      >
        <X size={22} />
      </button>

      {canNavigate ? (
        <>
          <button
            type="button"
            className="media-viewer__nav media-viewer__nav--prev"
            onClick={goPrev}
            // Disabled rather than merely inert at each end: a visible arrow that
            // does nothing reads as a broken control, and "disabled" is also
            // something a screen reader can report.
            disabled={isFirst}
            aria-label="Previous"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            className="media-viewer__nav media-viewer__nav--next"
            onClick={goNext}
            disabled={isLast}
            aria-label="Next"
          >
            <ChevronRight size={24} />
          </button>
        </>
      ) : null}

      <div
        className="media-viewer__viewport"
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
          if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
          // One bound is always false at an end (isFirst / isLast), which is what
          // stops a swipe past the last item sliding the strip into empty space.
          if (delta > 0 && !isFirst) goPrev();
          else if (delta < 0 && !isLast) goNext();
        }}
      >
        {/* Every item is in the DOM; one is on screen. That is what makes the
            slide a real movement instead of a cut between two states. */}
        <div
          className="media-viewer__track"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {items.map((item, slideIndex) => (
            <div
              key={`${item.url}-${slideIndex}`}
              className="media-viewer__slide"
              // Off-screen slides are hidden from assistive tech as well as laid
              // out lazily: announcing all four items when one is visible is
              // noise, and the counter already reports position.
              aria-hidden={slideIndex !== index}
            >
              {item.type === "video" ? (
                // Autoplay is withheld from anything off-screen: four clips all
                // playing behind each other is a wall of noise.
                <video
                  className="media-viewer__video"
                  src={item.url}
                  controls={slideIndex === index}
                  autoPlay={slideIndex === index}
                  loop
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="media-viewer__img"
                  src={item.url}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {canNavigate ? (
        <p className="media-viewer__counter" aria-live="polite">
          {index + 1} / {items.length}
        </p>
      ) : null}
    </div>
  );
}