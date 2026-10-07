"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@/components/ui/Icons";
import { Icon } from "@/components/ui/Icon/Icon";
import "./VoiceNotePlayer.css";

export interface VoiceNotePlayerProps {
  url: string;
  /** Duration in milliseconds, measured by the recorder. */
  durationMs: number;
  /** Mine bubbles render on a brand surface — the bar inverts. */
  mine?: boolean;
  className?: string;
}

function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * One voice note: play/pause, a progress bar driven by real `timeupdate`
 * events, and the duration.
 *
 * The audio element loads lazily (`preload="metadata"`) so a thread with ten
 * voice notes does not fetch ten files before anyone presses play. The bar
 * clicks to seek — a drag-to-seek needs pointer tracking a voice note does not
 * earn.
 */
export function VoiceNotePlayer({
  url,
  durationMs,
  mine = false,
  className,
}: VoiceNotePlayerProps): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const classes = ["msg-voice", mine ? "msg-voice--mine" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    // A new message row mounting while this one plays: stop cleanly. The
    // element unmounts anyway; this keeps state consistent for reuse.
    return () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) audio.pause();
    };
  }, []);

  const toggle = (): void => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  };

  const seek = (event: React.MouseEvent<HTMLDivElement>): void => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setElapsed(audio.currentTime * 1000);
  };

  const progress = durationMs > 0 ? Math.min(1, elapsed / durationMs) : 0;

  return (
    <div className={classes}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setElapsed(0);
        }}
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (audio && Number.isFinite(audio.currentTime)) {
            setElapsed(audio.currentTime * 1000);
          }
        }}
      />
      <button
        type="button"
        className="msg-voice__toggle"
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        aria-pressed={playing}
      >
        <Icon as={playing ? PauseIcon : PlayIcon} size={16} />
      </button>
      <div
        className="msg-voice__track"
        onClick={seek}
        role="presentation"
        aria-hidden="true"
      >
        <span className="msg-voice__fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="msg-voice__time">
        {playing || elapsed > 0
          ? formatTime(elapsed)
          : formatTime(durationMs)}
      </span>
    </div>
  );
}
