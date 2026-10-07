"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileTextIcon,
  ImageIcon,
  SendIcon,
  XIcon,
} from "@/components/ui/Icons";
import { VoiceRecorder } from "@/components/messaging/VoiceRecorder/VoiceRecorder";
import {
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MIME_TYPES,
  MAX_ATTACHMENTS,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MESSAGE_BODY_MAX,
} from "@/lib/messaging/constants";
import { uploadDirect } from "@/lib/client/upload";
import "./MessageComposer.css";

export interface AttachmentInput {
  url: string;
  kind: "image" | "file";
  name: string;
  size: number;
}

/**
 * One file the user picked, not yet on the server.
 *
 * `objectUrl` is the LOCAL preview only. It is revoked the moment the upload
 * finishes and is never sent to the server — sending it would store a `blob:`
 * URL the other side cannot open and that fails the https-only validator.
 * `serverUrl` is the Cloudinary https URL, set on completion.
 */
interface StagedAttachment extends AttachmentInput {
  file: File;
  objectUrl: string;
  serverUrl: string | null;
  progress: number;
  uploading: boolean;
  failed: boolean;
}

export interface ComposerReplyContext {
  id: string;
  name: string;
  preview: string;
}

export interface MessageComposerProps {
  conversationId: string;
  viewerId: string;
  replyTo?: ComposerReplyContext | null;
  replyToId?: string;
  onCancelReply?: () => void;
  onSend: (payload: {
    body: string;
    attachments?: AttachmentInput[];
    voiceNote?: { url: string; duration: number };
    replyToId?: string;
  }) => Promise<void>;
  placeholder?: string;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function kindOf(file: File): "image" | "file" {
  return file.type.startsWith("image/") ? "image" : "file";
}

/** Client-side courtesy check. The signature endpoint re-checks formats. */
function validateFile(file: File): string | null {
  const kind = kindOf(file);
  if (kind === "image") {
    if (file.size > MAX_IMAGE_BYTES) {
      return `That photo is too large. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.`;
    }
    return null;
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExtensions = DOCUMENT_EXTENSIONS as readonly string[];
  if (!allowedExtensions.includes(extension)) {
    return `That file type is not supported. Allowed: ${allowedExtensions.join(", ").toUpperCase()}.`;
  }
  const allowedMimes = DOCUMENT_MIME_TYPES as readonly string[];
  if (file.type && !allowedMimes.includes(file.type)) {
    return "That file type is not supported.";
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `That file is too large. The limit is ${formatBytes(MAX_DOCUMENT_BYTES)}.`;
  }
  return null;
}

export function MessageComposer({
  conversationId,
  viewerId,
  replyTo,
  replyToId,
  onCancelReply,
  onSend,
  placeholder,
}: MessageComposerProps): React.JSX.Element {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);
  const [voiceNote, setVoiceNote] = useState<{ url: string; duration: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [body]);

  // Revoke local previews on unmount so no blob: URL leaks past this thread.
  useEffect(() => {
    return () => {
      setAttachments((current) => {
        for (const attachment of current) {
          URL.revokeObjectURL(attachment.objectUrl);
        }
        return current;
      });
    };
  }, []);

  function removeAttachment(index: number): void {
    setAttachments((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.objectUrl);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
    setError(null);
  }

  async function uploadOne(
    index: number,
    file: File,
    kind: "image" | "file",
  ): Promise<void> {
    setAttachments((current) =>
      current.map((attachment, currentIndex) =>
        currentIndex === index
          ? { ...attachment, uploading: true, failed: false }
          : attachment,
      ),
    );
    try {
      const result = await uploadDirect(file, {
        purpose: "message",
        resourceType: kind === "image" ? "image" : "raw",
        onProgress: (progress) => {
          setAttachments((current) =>
            current.map((attachment, currentIndex) =>
              currentIndex === index
                ? { ...attachment, progress: progress.percent }
                : attachment,
            ),
          );
        },
      });
      setAttachments((current) =>
        current.map((attachment, currentIndex) => {
          if (currentIndex !== index) return attachment;
          URL.revokeObjectURL(attachment.objectUrl);
          return {
            ...attachment,
            url: result.secureUrl,
            serverUrl: result.secureUrl,
            progress: 100,
            uploading: false,
            failed: false,
          };
        }),
      );
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "That file could not be uploaded.";
      setError(message);
      setAttachments((current) =>
        current.map((attachment, currentIndex) =>
          currentIndex === index
            ? { ...attachment, uploading: false, failed: true }
            : attachment,
        ),
      );
    }
  }

  /** Stage files locally, then upload each through the signed direct path. */
  function handleFilesSelected(files: FileList | null): void {
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      setError(`Maximum of ${MAX_ATTACHMENTS} attachments per message.`);
      return;
    }

    const picked = Array.from(files).slice(0, remainingSlots);
    const baseIndex = attachments.length;
    const staged: StagedAttachment[] = [];

    for (const file of picked) {
      const problem = validateFile(file);
      if (problem) {
        setError(problem);
        continue;
      }
      const fileKind = kindOf(file);
      staged.push({
        url: "",
        kind: fileKind,
        name: file.name,
        size: file.size,
        file,
        objectUrl: URL.createObjectURL(file),
        serverUrl: null,
        progress: 0,
        uploading: false,
        failed: false,
      });
    }

    if (staged.length === 0) return;

    setAttachments((current) => [...current, ...staged]);
    setError(null);
    staged.forEach((item, offset) => {
      void uploadOne(baseIndex + offset, item.file, item.kind);
    });
  }

  function retryAttachment(index: number): void {
    const target = attachments[index];
    if (!target || target.uploading) return;
    setError(null);
    void uploadOne(index, target.file, target.kind);
  }

  async function handleSend() {
    if (!canSubmit) return;
    const trimmed = body.trim();
    if (trimmed.length > MESSAGE_BODY_MAX) {
      setError(`Messages are capped at ${MESSAGE_BODY_MAX} characters.`);
      return;
    }
    if (failedCount > 0) {
      setError("One attachment failed to upload. Remove it or retry before sending.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await onSend({
        body: trimmed,
        attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
        voiceNote: voiceNote ?? undefined,
        replyToId,
      });
      setBody("");
      setAttachments([]);
      setVoiceNote(null);
      onCancelReply?.();
    } catch (err) {
      setError((err as Error).message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
      return;
    }

    if (event.key === "Escape" && replyToId) {
      onCancelReply?.();
    }
  }

  const uploadingCount = attachments.filter(
    (attachment) => attachment.uploading || (!attachment.serverUrl && !attachment.failed),
  ).length;
  const failedCount = attachments.filter((attachment) => attachment.failed).length;
  const readyAttachments = attachments
    .filter((attachment) => attachment.serverUrl !== null)
    .map((attachment) => ({
      url: attachment.serverUrl ?? "",
      kind: attachment.kind,
      name: attachment.name,
      size: attachment.size,
    }));

  const trimmedBody = body.trim();
  const canSubmit =
    !sending &&
    uploadingCount === 0 &&
    trimmedBody.length <= MESSAGE_BODY_MAX &&
    (trimmedBody.length > 0 || readyAttachments.length > 0 || voiceNote !== null);

  return (
    <div className="message-composer">
      {voiceNote ? (
        <div className="message-composer__voice-chip">
          <span>Voice note ready ({Math.round(voiceNote.duration / 1000)}s)</span>
          <button type="button" className="message-composer__voice-chip__remove" aria-label="Remove voice note" onClick={() => setVoiceNote(null)}>
            <XIcon size={12} />
          </button>
        </div>
      ) : null}

        {attachments.length > 0 ? (
        <div className="message-composer__attachments" role="list" aria-label="Attachments">
          {attachments.map((attachment, index) => (
            <div
              key={`${attachment.objectUrl}-${index}`}
              role="listitem"
              className={[
                "message-composer__attachment",
                attachment.kind === "image" ? "message-composer__attachment--image" : "",
                attachment.failed ? "message-composer__attachment--failed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {attachment.kind === "image" ? (
                // Local preview only — revoked on upload, never sent anywhere.
                // eslint-disable-next-line @next/next/no-img-element -- blob: preview, never stored or rendered elsewhere
                <img src={attachment.objectUrl} alt="" aria-hidden="true" />
              ) : null}
              <span className="message-composer__attachment__meta">
                <span className="message-composer__attachment__name">{attachment.name}</span>
                <span className="message-composer__attachment__size">
                  {formatBytes(attachment.size)}
                </span>
                {attachment.uploading ? (
                  <span className="message-composer__attachment__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={attachment.progress}>
                    <span className="message-composer__attachment__progress-fill" style={{ width: `${attachment.progress}%` }} />
                  </span>
                ) : null}
                {attachment.failed ? (
                  <button type="button" className="message-composer__attachment__retry" onClick={() => retryAttachment(index)}>
                    Retry
                  </button>
                ) : null}
              </span>
              <button type="button" className="message-composer__attachment__remove" aria-label={`Remove ${attachment.name}`} onClick={() => removeAttachment(index)}>
                <XIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="message-composer__error">{error}</div> : null}

      <div className="message-composer__toolbar">
        <input
          ref={imageInputRef}
          className="message-composer__toolbar-input"
          type="file"
          accept="image/*"
          multiple={false}
          onChange={(event) => {
            handleFilesSelected(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={fileInputRef}
          className="message-composer__toolbar-input"
          type="file"
          multiple={true}
          onChange={(event) => {
            handleFilesSelected(event.target.files);
            event.target.value = "";
          }}
        />

        <button
          type="button"
          className="message-composer__toolbar-button"
          onClick={() => imageInputRef.current?.click()}
          disabled={sending || uploadingCount > 0 || attachments.length >= MAX_ATTACHMENTS}
          aria-label="Add image"
        >
          <ImageIcon size={16} />
          <span className="message-composer__toolbar-label">Photo</span>
        </button>

        <button
          type="button"
          className="message-composer__toolbar-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || uploadingCount > 0 || attachments.length >= MAX_ATTACHMENTS}
          aria-label="Add file"
        >
          <FileTextIcon size={16} />
          <span className="message-composer__toolbar-label">File</span>
        </button>

        <VoiceRecorder
          disabled={sending || uploadingCount > 0}
          onRecorded={(note) => {
            setVoiceNote(note);
            setError(null);
          }}
        />
      </div>

      <div className="message-composer__input-row">
        {replyToId ? (
          <div className="message-composer__reply-banner">
            <span>Replying to {replyTo?.name ?? "this message"}</span>
            <button
              type="button"
              className="message-composer__reply-banner__close"
              onClick={() => onCancelReply?.()}
              aria-label="Cancel reply"
            >
              <XIcon size={14} />
            </button>
          </div>
        ) : null}

        <textarea
          ref={textareaRef}
          className="message-composer__textarea"
          value={body}
          placeholder={placeholder ?? "Message"}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={MESSAGE_BODY_MAX}
          aria-label="Message"
        />

        <button
          type="button"
          className="message-composer__send"
          onClick={() => {
            void handleSend();
          }}
          disabled={!canSubmit}
          aria-label="Send message"
        >
          <SendIcon size={18} />
        </button>
      </div>
    </div>
  );
}

