"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Globe,
  Image as ImageIcon,
  Lock,
  MapPin,
  Users,
  Video,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Input } from "@/components/ui/Input/Input";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { apiFetch } from "@/lib/client/api";
import {
  POST_BODY_MAX,
  VISIBILITY_LABELS,
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
 * Media buttons are present but disabled. That is deliberate rather than an
 * omission: the control's *position* is a design decision already made, while
 * the thing behind it needs Cloudinary, which does not exist. A hidden button
 * would make the composer look finished when it is not; a disabled one shows
 * where photo and video will go and what is missing.
 *
 * The post joins the feed only once the server has it. Showing a post that
 * failed to save would leave a reader looking at something nobody else can see.
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

  const trimmed = body.trim();
  const remaining = POST_BODY_MAX - body.length;
  const canSubmit =
    trimmed.length > 0 && trimmed.length <= POST_BODY_MAX && !submitting;
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

    setError(null);
    setSubmitting(true);

    const result = await apiFetch<{ post: PostWithAuthor }>("/api/posts", {
      method: "POST",
      body: {
        body: trimmed,
        visibility,
        location: location.trim() ? location.trim() : null,
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
          <button
            type="button"
            className="post-composer__tool"
            disabled
            title="Photo uploads arrive when Cloudinary is configured"
          >
            <Icon as={ImageIcon} size={18} />
            <span>Photo</span>
          </button>
          <button
            type="button"
            className="post-composer__tool"
            disabled
            title="Video uploads arrive when Cloudinary is configured"
          >
            <Icon as={Video} size={18} />
            <span>Video</span>
          </button>
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
