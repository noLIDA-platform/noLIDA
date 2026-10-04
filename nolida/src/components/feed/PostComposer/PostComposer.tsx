"use client";

import { useRef, useState } from "react";
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
  uploadMediaFile,
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
 * The composer. One component, used by `/home` and by `/create`.
 *
 * Media is uploaded IMMEDIATELY when the file is chosen, not when the post is
 * submitted. Uploading on submit would mean a 50MB video and a failed post leave
 * the user with an asset at the provider that no row references — and a long
 * upload freezing the Post button is a worse experience than an upload bar.
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
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const trimmed = body.trim();
  const remaining = POST_BODY_MAX - body.length;
  const mediaFull = media.length >= POST_MEDIA_MAX;
  const canSubmit =
    trimmed.length > 0 && trimmed.length <= POST_BODY_MAX && !submitting;

  const addMedia = async (
    file: File,
    kind: UploadKind,
  ): Promise<void> => {
    setError(null);

    if (media.length >= POST_MEDIA_MAX) {
      setError(`A post can carry at most ${POST_MEDIA_MAX} photos or videos.`);
      return;
    }

    const localError = checkFileForUpload(file, kind);
    if (localError) {
      setError(localError);
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadMediaFile(file, kind, "post");
      // Re-checked after the await: the user can add another file while this one
      // is in flight, and appending unconditionally would quietly exceed the cap.
      setMedia((current) =>
        current.length >= POST_MEDIA_MAX
          ? current
          : [...current, { url: uploaded.url, type: kind }],
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That upload failed.");
    } finally {
      setUploading(false);
    }
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

      {media.length > 0 ? (
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
              // Sequential, not Promise.all: four 5MB uploads in parallel on a
              // mobile connection is how you get four timeouts.
              void (async () => {
                for (const file of files) await addMedia(file, "image");
              })();
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
              void (async () => {
                for (const file of files) await addMedia(file, "video");
              })();
            }}
          />

          <button
            type="button"
            className="post-composer__tool"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading || mediaFull}
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
            disabled={uploading || mediaFull}
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
              <span>Uploading…</span>
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
