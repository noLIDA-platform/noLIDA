"use client";

import { useRef, useState, useEffect } from "react";
import { MicIcon, StopIcon } from "@/components/ui/Icons";
import { uploadDirect } from "@/lib/client/upload";
import { VOICE_MAX_MS } from "@/lib/messaging/constants";
import "./VoiceRecorder.css";

interface VoiceRecorderProps {
  /** Called with the recorded note once it is safely in the cloud. */
  onRecorded: (voiceNote: { url: string; duration: number }) => void;
  disabled?: boolean;
}

/**
 * One-tap voice note: record → upload → hand the server URL to the composer.
 *
 * The recorder produces a blob, we read its duration back from an audio element
 * (MediaRecorder does not report duration on all platforms), then sign and
 * upload it as a `message` purpose asset: photos as `image`, documents as `raw`,
 * voice notes as `video`. The duration the server stores is Cloudinary's
 * measured duration of the clip, not a client guess.
 */
export function VoiceRecorder({
  onRecorded,
  disabled = false,
}: VoiceRecorderProps): React.JSX.Element {
  const [status, setStatus] = useState<"idle" | "recording" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
    recorderRef.current = null;
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
    }
    abortRef.current?.abort();
  }, []);

  const startRecording = async (): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const mimeType = recorder.mimeType || "audio/webm";
        const file = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        if (streamRef.current) {
          for (const track of streamRef.current.getTracks()) track.stop();
          streamRef.current = null;
        }
        recorderRef.current = null;
        probeAndUpload(file);
      });
      recorder.start(250);
      setStatus("recording");
      setElapsed(0);

      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 250;
          if (next >= VOICE_MAX_MS) {
            recorder.stop();
          }
          return next;
        });
      }, 250);
    } catch {
      setError("Microphone access was denied. Allow it in your browser settings and try again.");
      setStatus("idle");
    }
  };

  const probeAndUpload = (file: Blob): void => {
    // A second pass so the audio element always has valid metadata to read.
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    probe.preload = "metadata";
    probe.src = url;
    probe.addEventListener("loadedmetadata", () => {
      const duration = Number.isFinite(probe.duration)
        ? Math.round(probe.duration * 1000)
        : elapsed;
      URL.revokeObjectURL(url);
      void upload(file, duration > 0 ? duration : elapsed);
    });
    probe.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      void upload(file, elapsed);
    });
  };

  const stopRecording = (): void => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus("idle");
  };

  const upload = async (file: Blob, fallbackDuration: number): Promise<void> => {
    if (disabled) return;
    setStatus("uploading");
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const extension = file.type.includes("mp4") ? "m4a" : "webm";
      const uploadFile = new File([file], `voice-note.${extension}`, {
        type: file.type || "audio/webm",
      });
      const result = await uploadDirect(uploadFile, {
        purpose: "message",
        resourceType: "video",
        signal: controller.signal,
      });
      // Cloudinary measures seconds; the composer counts milliseconds.
      const measuredMs =
        typeof result.duration === "number" && Number.isFinite(result.duration)
          ? Math.round(result.duration * 1000)
          : fallbackDuration;
      onRecorded({ url: result.secureUrl, duration: measuredMs });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError("The voice note could not be uploaded. Check your connection and try again.");
    } finally {
      setStatus("idle");
    }
  };

  const cancel = (): void => {
    abortRef.current?.abort();
    setStatus("idle");
    chunksRef.current = [];
  };

  const formatMs = (ms: number): string => {
    const total = Math.floor(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  };

  return (
    <div className="voice-recorder">
      {status === "idle" ? (
        <button
          type="button"
          className="voice-recorder__button"
          onClick={startRecording}
          disabled={disabled}
          aria-label="Record a voice note"
        >
          <MicIcon size={20} />
        </button>
      ) : status === "recording" ? (
        <div className="voice-recorder__row">
          <button
            type="button"
            className="voice-recorder__cancel"
            onClick={cancel}
            aria-label="Cancel recording"
          >
            <StopIcon size={16} />
          </button>
          <span className="voice-recorder__timer" aria-live="off">
            {formatMs(elapsed)}
          </span>
          <span className="voice-recorder__dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </div>
      ) : (
        <div className="voice-recorder__row">
          <button
            type="button"
            className="voice-recorder__cancel"
            onClick={cancel}
            aria-label="Cancel upload"
          >
            <StopIcon size={16} />
          </button>
          <span className="voice-recorder__timer" aria-live="off">
            {status === "uploading" ? "Uploading…" : "Upload failed"}
          </span>
        </div>
      )}

      {error ? <p className="voice-recorder__error">{error}</p> : null}
    </div>
  );
}
