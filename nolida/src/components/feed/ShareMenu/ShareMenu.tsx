"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { apiFetch } from "@/lib/client/api";
import type { ShareChannel } from "@/lib/feed/constants";
import "./ShareMenu.css";

export interface ShareMenuProps {
  postId: string;
  onClose: () => void;
  /** Fired after a share is recorded, so the card can bump its own count. */
  onShared: () => void;
}

/**
 * The share sheet: copy a link, or hand the post to WhatsApp.
 *
 * The actual sharing happens in the browser — the clipboard, a new tab. This
 * component then *tells the server* that a share happened, which is the only
 * reason `POST /api/posts/[id]/share` exists: without it `share_count` would be
 * decoration. A share still counts as shared if that call fails; the reader has
 * already got their link, and pretending otherwise would be a lie about what
 * happened on their screen.
 *
 * "Send to conversation" is rendered disabled: direct messages are a later
 * phase, and a menu item that silently does nothing is worse than one that says
 * so.
 */
export function ShareMenu({
  postId,
  onClose,
  onShared,
}: ShareMenuProps): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const overflowBefore = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    panelRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowBefore;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  const postUrl = (): string =>
    `${window.location.origin}/post/${postId}`;

  /** Records the share. Best effort — see the note above. */
  const recordShare = async (channel: ShareChannel): Promise<void> => {
    await apiFetch(`/api/posts/${postId}/share`, {
      method: "POST",
      body: { channel },
    });
    onShared();
  };

  const handleCopy = async (): Promise<void> => {
    setBusy(true);
    try {
      await navigator.clipboard.writeText(postUrl());
      await recordShare("COPY_LINK");
      setMessage("Link copied to your clipboard.");
      window.setTimeout(onClose, 700);
    } catch {
      setMessage("Could not copy the link. Copy it from the address bar instead.");
    } finally {
      setBusy(false);
    }
  };

  const handleWhatsApp = async (): Promise<void> => {
    setBusy(true);
    try {
      const text = encodeURIComponent(`Have a look at this on NOlida: ${postUrl()}`);
      window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
      await recordShare("WHATSAPP");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="share-menu" role="dialog" aria-modal="true" aria-label="Share this post">
      <button
        type="button"
        className="share-menu__scrim"
        aria-label="Close share options"
        onClick={onClose}
      />

      <div ref={panelRef} className="share-menu__panel">
        <div className="share-menu__head">
          <h2 className="share-menu__title">Share this post</h2>
          <button
            type="button"
            className="share-menu__close"
            aria-label="Close share options"
            onClick={onClose}
          >
            <Icon as={X} size={18} />
          </button>
        </div>

        <ul className="share-menu__list">
          <li>
            <button
              type="button"
              className="share-menu__option"
              onClick={handleCopy}
              disabled={busy}
            >
              <Icon as={Link2} size={18} />
              <span>Copy link</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="share-menu__option"
              onClick={handleWhatsApp}
              disabled={busy}
            >
              <Icon as={MessageCircle} size={18} />
              <span>Share to WhatsApp</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="share-menu__option"
              disabled
              title="Direct messages arrive in a later phase"
            >
              <Icon as={MessageCircle} size={18} />
              <span>Send to conversation</span>
              <span className="share-menu__soon">Soon</span>
            </button>
          </li>
        </ul>

        {message ? (
          <p className="share-menu__message" role="status">
            {message}
          </p>
        ) : null}

        <Button variant="ghost" size="sm" fullWidth onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}