"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client/api";
import "./MessagingSettings.css";

interface MessagingPrefs {
  readReceiptsEnabled: boolean;
  typingIndicatorEnabled: boolean;
}

export interface MessagingSettingsProps {
  initial: MessagingPrefs;
  className?: string;
}

type ToggleKey = keyof MessagingPrefs;

/**
 * `/settings/messaging` — the two global toggles from migration 013.
 *
 * The switch flips optimistically and reverts exactly to the previous value
 * on failure (the same contract as like/save/follow): a toggle that lies
 * about being saved is worse than one that visibly bounced back. The final
 * word is always the server's returned prefs, so a server-side normalisation
 * (it never withholds data, only side-effects) lands in the UI as-is.
 */
export function MessagingSettings({
  initial,
  className,
}: MessagingSettingsProps): React.JSX.Element {
  const [prefs, setPrefs] = useState<MessagingPrefs>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The "Saved" confirmation fades on its own; a permanent badge on an
  // already-saved state is noise.
  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const toggle = async (key: ToggleKey): Promise<void> => {
    if (saving) return;
    const previous = prefs;
    const next: MessagingPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await apiFetch<{ prefs: MessagingPrefs }>(
      "/api/profiles/me/messaging-prefs",
      {
        method: "PATCH",
        body:
          key === "readReceiptsEnabled"
            ? { readReceipts: next.readReceiptsEnabled }
            : { typingIndicator: next.typingIndicatorEnabled },
      }
    );

    setSaving(false);
    if (!result.ok) {
      setPrefs(previous);
      setError(result.error.message);
      return;
    }
    setPrefs(result.data.prefs);
    setSaved(true);
  };

  const classes = ["ms", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={["mp-page", classes].join(" ")}>
      <div>
        <h1 className="mp-title">Messaging</h1>
        <p className="mp-eyebrow">
          Choose what other people see while you chat. These apply to every
          conversation on this account.
        </p>
      </div>

      <section className="ms__card">
        <div className="ms__row">
          <span className="ms__text">
            <span className="ms__label">Read receipts</span>
            <span className="ms__hint">
              Others see when you have read their message. You will also see
              when they have read yours.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.readReceiptsEnabled}
            aria-label="Read receipts"
            className={[
              "ms__switch",
              prefs.readReceiptsEnabled ? "ms__switch--on" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={saving}
            onClick={() => void toggle("readReceiptsEnabled")}
          >
            <span className="ms__knob" aria-hidden="true" />
          </button>
        </div>

        <div className="ms__row">
          <span className="ms__text">
            <span className="ms__label">Typing indicator</span>
            <span className="ms__hint">
              Others see when you are typing a reply.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.typingIndicatorEnabled}
            aria-label="Typing indicator"
            className={[
              "ms__switch",
              prefs.typingIndicatorEnabled ? "ms__switch--on" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={saving}
            onClick={() => void toggle("typingIndicatorEnabled")}
          >
            <span className="ms__knob" aria-hidden="true" />
          </button>
        </div>
      </section>

      <p className="ms__status" aria-live="polite">
        {error ? (
          <span className="ms__error" role="alert">
            {error}
          </span>
        ) : saved ? (
          <span className="ms__saved">Saved</span>
        ) : saving ? (
          <span className="ms__saving">Saving…</span>
        ) : (
          ""
        )}
      </p>

      {/* Media and storage rows are PLACEHOLDERS — no backend yet, so they
          render as static "Coming soon" rows rather than controls that would
          silently do nothing. The blocked row points at the real settings
          screen. */}
      <section className="ms__card">
        <div className="ms__row">
          <span className="ms__text">
            <span className="ms__label">Auto-download photos</span>
            <span className="ms__hint">When to download photos automatically.</span>
          </span>
          <span className="ms__soon">Coming soon</span>
        </div>
        <div className="ms__row">
          <span className="ms__text">
            <span className="ms__label">Auto-download videos</span>
            <span className="ms__hint">When to download videos automatically.</span>
          </span>
          <span className="ms__soon">Coming soon</span>
        </div>
        <div className="ms__row">
          <span className="ms__text">
            <span className="ms__label">Save to camera roll</span>
            <span className="ms__hint">
              Save downloaded media to your device gallery.
            </span>
          </span>
          <span className="ms__soon">Coming soon</span>
        </div>
      </section>

      <section className="ms__card">
        <div className="ms__row">
          <span className="ms__text">
            <span className="ms__label">Storage usage</span>
            <span className="ms__hint">
              How much space chats and media use on this device.
            </span>
          </span>
          <span className="ms__soon">Coming soon</span>
        </div>
        <div className="ms__row">
          <span className="ms__text">
            <span className="ms__label">Blocked contacts</span>
            <span className="ms__hint">
              Manage who can no longer message you.
            </span>
          </span>
          <Link href="/settings/privacy-security" className="ms__link">
            Open
          </Link>
        </div>
        <div className="ms__row">
          <span className="ms__text">
            <span className="ms__label">Clear all chats</span>
            <span className="ms__hint">
              Remove every conversation from this account.
            </span>
          </span>
          <span className="ms__soon">Coming soon</span>
        </div>
      </section>
    </div>
  );
}
