"use client";

import { useId, useRef, useState } from "react";
import { Image as ImageIcon, Plus, X } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import {
  checkFileForUpload,
  clientMaxLabel,
  uploadMediaFile,
  type UploadKind,
} from "@/lib/client/upload";
import "./ImageUploader.css";

export type UploadAspect = "square" | "wide" | "free";
export type UploadPurposeName = "avatar" | "post" | "business" | "product";

export interface ImageUploaderProps {
  /** The current asset URL, for edit mode. Null renders the empty drop zone. */
  value?: string | null;
  /** Fired with the new URL, or null when the user removes the asset. */
  onChange: (url: string | null) => void;
  kind?: UploadKind;
  purpose: UploadPurposeName;
  aspect?: UploadAspect;
  /** Overrides the size ceiling shown in the hint. Server limit still wins. */
  maxSizeMB?: number;
  /** Replaces the default "Click to upload or drag and drop" caption. */
  label?: string;
  className?: string;
}

/**
 * One image or video slot: drop zone, preview, progress, errors.
 *
 * The component OWNS the upload; the parent owns the value. `onChange` fires once
 * the file is stored at the provider, never before — so a caller can treat it as
 * "this is now saved", not "the user picked something". A failure leaves the
 * previous value untouched, which is why the error is shown inline beside the
 * preview instead of replacing it.
 *
 * `fetch` cannot report upload progress, so this uses `XMLHttpRequest` via
 * `uploadMediaFile`. The bar is real bytes-sent, capped at 90% until the server
 * confirms — the last 10% is validation and provider storage, which the client
 * genuinely cannot see, and pretending otherwise would be a lie that snaps back.
 */
export function ImageUploader({
  value,
  onChange,
  kind = "image",
  purpose,
  aspect = "free",
  maxSizeMB,
  label,
  className,
}: ImageUploaderProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const generatedId = useId();
  const inputId = `${generatedId}-file`;

  const accept =
    kind === "image"
      ? "image/jpeg,image/png,image/webp,image/gif"
      : "video/mp4,video/webm,video/quicktime";
  const sizeHint = maxSizeMB ? `${maxSizeMB} MB` : clientMaxLabel(kind);

  const classes = [
    "ui-uploader",
    `ui-uploader--${aspect}`,
    value ? "ui-uploader--filled" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleFile = async (file: File): Promise<void> => {
    setError(null);

    const localError = checkFileForUpload(file, kind);
    if (localError) {
      setError(localError);
      return;
    }

    setBusy(true);
    setProgress(0);

    try {
      const uploaded = await uploadMediaFile(file, kind, purpose, setProgress);
      // `secureUrl`, never `url`. Cloudinary's `url` field is `http://` on many
      // accounts while `secure_url` is always https, and every media schema in
      // the app is https-only — passing `url` here was the Phase 5C.1 bug that
      // reported "Media must be an https URL" after a perfectly good upload.
      onChange(uploaded.secureUrl);
      setError(null);
    } catch (caught) {
      // The previous value is deliberately still in place: a failed upload must
      // not silently clear the photo the user already had.
      setError(caught instanceof Error ? caught.message : "That upload failed.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const openPicker = (): void => {
    if (busy) return;
    inputRef.current?.click();
  };

  const handleRemove = (): void => {
    setError(null);
    // Removing is local state only. The asset itself is deleted by the service
    // that owns the row, which knows whether anyone else still references it.
    onChange(null);
  };

  return (
    <div className={classes}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="ui-uploader__input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset first: picking the same file twice must still fire onChange.
          event.target.value = "";
          if (file) void handleFile(file);
        }}
        disabled={busy}
      />

      {value ? (
        <div className="ui-uploader__preview">
          {/* A plain img, not next/image: the src is a runtime Cloudinary URL of
              unknown dimensions, and next/image cannot optimise a remote host we
              have not configured for it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="ui-uploader__img"
            referrerPolicy="no-referrer"
          />

          <div className="ui-uploader__overlay">
            <button
              type="button"
              className="ui-uploader__action"
              onClick={openPicker}
              disabled={busy}
            >
              <ImageIcon size={14} />
              <span>Replace</span>
            </button>
            <button
              type="button"
              className="ui-uploader__action ui-uploader__action--danger"
              onClick={handleRemove}
              disabled={busy}
              aria-label="Remove this photo"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={[
            "ui-uploader__dropzone",
            dragging ? "ui-uploader__dropzone--dragging" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={openPicker}
          disabled={busy}
          aria-label={label ?? "Upload a photo"}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (busy) return;
            // A drop can carry several files; the component is one slot, so the
            // first one wins rather than silently uploading the extras.
            const file = event.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
        >
          <Plus size={22} />
          <span className="ui-uploader__caption">
            {label ?? "Click to upload or drag and drop"}
          </span>
          <span className="ui-uploader__hint">
            {kind === "image" ? "JPG, PNG, WebP or GIF" : "MP4, WebM or MOV"} ·{" "}
            {sizeHint} max
          </span>
        </button>
      )}

      {/* Progress and errors are announced, not just drawn: a screen reader
          otherwise hears nothing while a 50MB video uploads for half a minute. */}
      <div className="ui-uploader__status" aria-live="polite">
        {busy ? (
          <>
            <div
              className="ui-uploader__progress"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="ui-uploader__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="ui-uploader__status-text">
              <Spinner size="sm" /> Uploading… {progress}%
            </p>
          </>
        ) : error ? (
          <p className="ui-uploader__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}