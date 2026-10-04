"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Globe,
  Image as ImageIcon,
  Lock,
  MapPin,
  Users,
  Video,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Input } from "@/components/ui/Input/Input";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { apiFetch } from "@/lib/client/api";
import {
  checkFileForUpload,
  formatUploadSpeed,
  uploadDirect,
  type UploadKind,
} from "@/lib/client/upload";
import {
  POST_BODY_MAX,
  POST_MEDIA_MAX,
  VISIBILITY_LABELS,
  type PostMediaItem,
  type Visibility,
} from "@/lib/feed/constants";
import type { FeedViewer, PostWithAuthor } from "@/lib/feed/types";
import "./PostComposer.css";

export interface PostComposerProps {
  viewer: FeedViewer;
  /** Fired with the created post, so a feed can put it at the top. */
  onPostCreated?: (post: PostWithAuthor) => void;
  /** Where to go after posting. Used by `/create`; `/home` stays put. */
  redirectTo?: string;
  /** The full-page version on `/create` gets more room. */
  large?: boolean;
  className?: string;
}

const VISIBILITY_ICONS = {
  PUBLIC: Globe,
  FOLLOWERS: Users,
  PRIVATE: Lock,
} as const;

const VISIBILITY_OPTIONS: Visibility[] = ["PUBLIC", "FOLLOWERS", "PRIVATE"];

/**
 * One upload in flight, or one that failed and is waiting to be dismissed.
 *
 * Progress lives per item, not in one number for the whole composer: four files
 * uploading at different speeds against one bar would show whichever event fired
 * last and look stuck. The controller is held here so each card's cancel button
 * stops its own upload and nothing else.
 */
interface PendingUpload {
  id: string;
  fileName: string;
  kind: UploadKind;
  percent: number;
  /** Bytes per second, for the card's secondary line. */
  speed: number;
  /** Set once this one failed. The card stays until dismissed. */
  error: string | null;
  controller: AbortController;
}

/**
 * The composer. One component, used by `/home` and by `/create`.
 *
 * Media is uploaded IMMEDIATELY when the file is chosen, not when the post is
 * submitted. Uploading on submit would mean a 50MB video and a failed post leave
 * the user with an asset at the provider that no row references — and a long
 * upload freezing the Post button is a worse experience than an upload bar.
 *
 * Multiple files upload IN PARALLEL. That was the wrong call while files went
 * through our own server — each one was a two-hop request holding a server
 * buffer, and four at once really did mean four ways to time out. Now the bytes
 * go straight to Cloudinary and the server is not in the path at all, so the
 * only shared resource is the last mile, and starting all four together removes
 * three sequential signature round trips and three sequential provider
 * handshakes. Four 5MB photos on a slow link finish in about the time one did.
 *
 * The post joins the feed only once the server has it. Showing a post that failed
 * to save would leave a reader looking at something nobody else can see.
 */
export function PostComposer({
  viewer,
  onPostCreated,
  redirectTo,
  large = false,
  className,
}: PostComposerProps): React.JSX.Element {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [media, setMedia] = useState<PostMediaItem[]>([]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // A failed upload holds its slot until the user dismisses it, so "still in
  // flight" means pending and not yet failed.
  const inFlight = pending.filter((item) => item.error === null).length;
  const uploading = inFlight > 0;

  const trimmed = body.trim();
  const remaining = POST_BODY_MAX - body.length;
  // Counts BOTH saved and in-flight: four picks landing while two are still
  // uploading must not add up to six items.
  const mediaFull = media.length + inFlight >= POST_MEDIA_MAX;
  const canSubmit =
    trimmed.length > 0 &&
    trimmed.length <= POST_BODY_MAX &&
    !submitting &&
    !uploading;

  // Held in a ref so the unmount cleanup can reach the live list without
  // re-running on every progress tick.
  const pendingRef = useRef<PendingUpload[]>([]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // Navigating away with uploads in flight would otherwise leave up to four
  // requests running against a component that no longer exists.
  useEffect(() => {
    return () => {
      for (const item of pendingRef.current) item.controller.abort();
    };
  }, []);

  /**
   * Upload one file, updating only its own card.
   *
   * Declared before `addMediaFiles` so the dispatch below reads in one
   * direction.
   */
  const runUpload = async (
    id: string,
    file: File,
    kind: UploadKind,
    controller: AbortController,
  ): Promise<void> => {
    const patch = (changes: Partial<PendingUpload>): void => {
      setPending((current) =>
        current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
      );
    };

    // Progress fires many times a second PER FILE. With four in flight that is
    // enough state churn to make typing in the textarea stutter, so paints are
    // coalesced to roughly ten per second — smoother than a progress bar needs,
    // and a fraction of the work. 100% always goes through, so a finished upload
    // never sits at 96% while the response is being parsed.
    let lastPaint = 0;

    try {
      const uploaded = await uploadDirect(file, {
        purpose: "post",
        resourceType: kind,
        signal: controller.signal,
        onProgress: (update) => {
          const now = Date.now();
          if (update.percent !== 100 && now - lastPaint < 100) return;
          lastPaint = now;
          patch({ percent: update.percent, speed: update.bytesPerSecond });
        },
      });

      // Re-checked after the await: the user can add another file while this one
      // is in flight, and appending unconditionally would quietly exceed the cap.
      setMedia((current) =>
        current.length >= POST_MEDIA_MAX
          ? current
          : [...current, { url: uploaded.secureUrl, type: kind }],
      );
      setPending((current) => current.filter((item) => item.id !== id));
    } catch (caught) {
      if (controller.signal.aborted) {
        // Cancelled by the user: drop the card rather than leaving a tombstone
        // for something they deliberately stopped.
        setPending((current) => current.filter((item) => item.id !== id));
        return;
      }
      patch({
        error: caught instanceof Error ? caught.message : "That upload failed.",
      });
    }
  };

  /**
   * Send every chosen file at once.
   *
   * Validation runs BEFORE anything is uploaded, so four rejected files produce
   * a message and no network traffic rather than four doomed requests. Room is
   * counted against what is saved AND what is still in flight, so several quick
   * picks cannot add up past the cap.
   */
  const addMediaFiles = (files: File[], kind: UploadKind): void => {
    setError(null);

    const room = POST_MEDIA_MAX - media.length - inFlight;
    if (room <= 0) {
      setError(`A post can carry at most ${POST_MEDIA_MAX} photos or videos.`);
      return;
    }

    const accepted = files.slice(0, room);
    if (accepted.length < files.length) {
      setError(
        `A post can carry at most ${POST_MEDIA_MAX} items, so only the first ${accepted.length} were added.`,
      );
    }

    const queued: { id: string; file: File; controller: AbortController }[] = [];
    for (const file of accepted) {
      const localError = checkFileForUpload(file, kind);
      if (localError) {
        setError(localError);
        continue;
      }
      queued.push({
        // Unique per pick: a file name alone collides the moment someone selects
        // two images from different folders with the same name.
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        controller: new AbortController(),
      });
    }

    if (queued.length === 0) return;

    setPending((current) => [
      ...current,
      ...queued.map(({ id, file, controller }) => ({
        id,
        fileName: file.name,
        kind,
        percent: 0,
        speed: 0,
        error: null,
        controller,
      })),
    ]);

    // Started together, not chained with `for … await`: awaiting each one would
    // serialise four independent uploads behind each other for no reason.
    for (const { id, file, controller } of queued) {
      void runUpload(id, file, kind, controller);
    }
  };

  const cancelUpload = (id: string): void => {
    pending.find((item) => item.id === id)?.controller.abort();
  };

  const dismissPending = (id: string): void => {
    setPending((current) => current.filter((item) => item.id !== id));
  };

  const removeMedia = (index: number): void => {
    // The asset itself is left at the provider. Nothing references it now, but a
    // cleanup job can reclaim it later — deleting it here would be a round trip
    // the user is waiting on for no visible benefit.
    setMedia((current) => current.filter((_, i) => i !== index));
  };

  const classes = [
    "post-composer",
    large ? "post-composer--large" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const submit = async (): Promise<void> => {
    if (trimmed.length === 0) {
      setError("A post cannot be empty.");
      return;
    }

    // Refuses to send half a post: an upload still in flight would be left
    // orphaned at the provider with no row referencing it.
    if (uploading) {
      setError("Wait for your upload to finish.");
      return;
    }

    setError(null);
    setSubmitting(true);

    const result = await apiFetch<{ post: PostWithAuthor }>("/api/posts", {
      method: "POST",
      body: {
        body: trimmed,
        visibility,
        location: location.trim() ? location.trim() : null,
        // Omitted entirely when empty, so a text-only post stores exactly what it
        // always did rather than an explicit empty array.
        ...(media.length > 0 ? { media } : {}),
      },
    });

    if (!result.ok) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }

    setBody("");
    setLocation("");
    setShowLocation(false);
    setMedia([]);
    setLocation("");
    setShowLocation(false);
    setVisibilityOpen(false);
    setSubmitting(false);

    onPostCreated?.(result.data.post);
    if (redirectTo) router.push(redirectTo);
  };

  const VisibilityIcon = VISIBILITY_ICONS[visibility];

return (
    <section className={classes} aria-label="Create a post">
      <div className="post-composer__row">
        <Avatar src={viewer.avatarUrl} name={viewer.displayName} size="md" />
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            large ? "What do you want to tell people?" : "What's on your mind?"
          }
          rows={large ? 6 : 3}
          maxLength={POST_BODY_MAX}
          className="post-composer__input"
        />
      </div>

      {media.length > 0 || pending.length > 0 ? (
        <div className="post-composer__media">
          {media.map((item, index) => (
            <div key={`${item.url}-${index}`} className="post-composer__media-item">
              {item.type === "video" ? (
                <video
                  src={item.url}
                  className="post-composer__media-file"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.url}
                  alt=""
                  className="post-composer__media-file"
                  referrerPolicy="no-referrer"
                />
              )}
              <button
                type="button"
                className="post-composer__media-remove"
                onClick={() => removeMedia(index)}
                aria-label={`Remove ${item.type} ${index + 1}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* One card per upload in flight, each with its OWN bar. A single
              shared bar would show whichever file's event fired last. */}
          {pending.map((item) =>
            item.error ? (
              <div
                key={item.id}
                className="post-composer__media-item post-composer__media-item--failed"
              >
                <p className="post-composer__media-error" role="alert">
                  {item.error}
                </p>
                <button
                  type="button"
                  className="post-composer__media-remove"
                  onClick={() => dismissPending(item.id)}
                  aria-label={`Dismiss the failed upload of ${item.fileName}`}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                key={item.id}
                className="post-composer__media-item post-composer__media-item--pending"
              >
                <div
                  className="post-composer__media-progress"
                  role="progressbar"
                  aria-valuenow={item.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Uploading ${item.fileName}`}
                >
                  <span
                    className="post-composer__media-progress-fill"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <span className="post-composer__media-percent">
                  {item.percent}%
                  {formatUploadSpeed(item.speed) ? (
                    <span className="post-composer__media-speed">
                      {formatUploadSpeed(item.speed)}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="post-composer__media-remove"
                  onClick={() => cancelUpload(item.id)}
                  aria-label={`Cancel the upload of ${item.fileName}`}
                >
                  <X size={12} />
                </button>
              </div>
            ),
          )}
        </div>
      ) : null}

      {showLocation ? (
        <div className="post-composer__location">
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Where are you?"
            maxLength={200}
            ariaLabel="Location"
          />
        </div>
      ) : null}

      {error ? (
        <p className="post-composer__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="post-composer__footer">
        <div className="post-composer__tools">
          {/* Hidden inputs rather than a button wrapping an input: the button is
              the visible control, the input is only its mechanism. */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="post-composer__file-input"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              // Parallel: the bytes go straight to Cloudinary, so the only
              // shared resource is the connection itself.
              addMediaFiles(files, "image");
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            multiple
            className="post-composer__file-input"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              addMediaFiles(files, "video");
            }}
          />

          <button
            type="button"
            className="post-composer__tool"
            onClick={() => imageInputRef.current?.click()}
            disabled={mediaFull}
            title={
              mediaFull
                ? `A post can carry at most ${POST_MEDIA_MAX} items`
                : "Add photos"
            }
            aria-label="Add photos"
          >
            <Icon as={ImageIcon} size={18} />
            <span>Photo</span>
          </button>
          <button
            type="button"
            className="post-composer__tool"
            onClick={() => videoInputRef.current?.click()}
            disabled={mediaFull}
            title={
              mediaFull
                ? `A post can carry at most ${POST_MEDIA_MAX} items`
                : "Add a video"
            }
            aria-label="Add a video"
          >
            <Icon as={Video} size={18} />
            <span>Video</span>
          </button>
          {uploading ? (
            <span className="post-composer__uploading">
              <Spinner size="sm" />
              <span>
                Uploading {inFlight} {inFlight === 1 ? "file" : "files"}…
              </span>
            </span>
          ) : null}
          <button
            type="button"
            className={[
              "post-composer__tool",
              showLocation ? "post-composer__tool--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-expanded={showLocation}
            onClick={() => setShowLocation((open) => !open)}
          >
            <Icon as={MapPin} size={18} />
            <span>Location</span>
          </button>
        </div>

        <div className="post-composer__submit">
          <span
            className={[
              "post-composer__counter",
              remaining < 500 ? "post-composer__counter--near" : "",
              remaining < 0 ? "post-composer__counter--over" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {body.length} / {POST_BODY_MAX}
          </span>

          <div className="post-composer__visibility">
            <button
              type="button"
              className="post-composer__visibility-button"
              aria-haspopup="menu"
              aria-expanded={visibilityOpen}
              onClick={() => setVisibilityOpen((open) => !open)}
            >
              <Icon as={VisibilityIcon} size={16} />
              <span>{VISIBILITY_LABELS[visibility]}</span>
              <Icon as={ChevronDown} size={14} />
            </button>

            {visibilityOpen ? (
              <div className="post-composer__visibility-menu" role="menu">
                {VISIBILITY_OPTIONS.map((option) => {
                  const OptionIcon = VISIBILITY_ICONS[option];
                  return (
                    <button
                      key={option}
                      type="button"
                      role="menuitemradio"
                      aria-checked={visibility === option}
                      className={[
                        "post-composer__visibility-option",
                        visibility === option
                          ? "post-composer__visibility-option--selected"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        setVisibility(option);
                        setVisibilityOpen(false);
                      }}
                    >
                      <Icon as={OptionIcon} size={16} />
                      <span>{VISIBILITY_LABELS[option]}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <Button
            size="sm"
            onClick={() => void submit()}
            disabled={!canSubmit}
            loading={submitting}
          >
            Post
          </Button>
        </div>
      </div>
    </section>
  );
}
