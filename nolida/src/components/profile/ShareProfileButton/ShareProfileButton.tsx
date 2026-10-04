"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import "./ShareProfileButton.css";

export interface ShareProfileButtonProps {
  /** Path to share, e.g. `/user/ada`. Resolved against the current origin. */
  path: string;
  size?: "sm" | "md";
  className?: string;
}

/** How long the "Copied" confirmation stays up before reverting. */
const CONFIRM_MS = 2000;

/**
 * Share a profile link.
 *
 * Uses the native share sheet where the browser has one — on a phone that is the
 * thing people actually want, because it puts WhatsApp and friends one tap away —
 * and falls back to the clipboard.
 *
 * The clipboard write is allowed to fail. It fails on insecure origins and
 * whenever the user has denied permission, and a share button that silently does
 * nothing is worse than one that says the link could not be copied.
 */
export function ShareProfileButton({
  path,
  size = "md",
  className,
}: ShareProfileButtonProps): React.JSX.Element {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  // Resolved at click time and kept, so the fallback can show a real absolute
  // URL. `window.location.origin` cannot be read during render — this is a
  // Server-rendered component first — so it is captured on the failure path.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const share = async (): Promise<void> => {
    const url = `${window.location.origin}${path}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title: "A profile on NOlida" });
        return;
      } catch {
        // Dismissed by the user, or the sheet was unavailable. Not an error worth
        // reporting — fall through to the clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      window.setTimeout(() => setState("idle"), CONFIRM_MS);
    } catch {
      setFailedUrl(url);
      setState("failed");
    }
  };

  return (
    <span
      className={["share-profile", className ?? ""].filter(Boolean).join(" ")}
    >
      <Button
        size={size}
        variant="secondary"
        onClick={() => void share()}
        ariaLabel="Share this profile"
      >
        {state === "copied" ? <Check size={16} /> : <Link2 size={16} />}
        <span>{state === "copied" ? "Copied" : "Share"}</span>
      </Button>

      {state === "failed" && failedUrl ? (
        <span className="share-profile__hint" role="status">
          Copy this link: <span className="share-profile__url">{failedUrl}</span>
        </span>
      ) : null}
    </span>
  );
}