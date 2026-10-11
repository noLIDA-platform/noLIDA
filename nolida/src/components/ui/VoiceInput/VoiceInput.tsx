"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MicIcon } from "@/components/ui/Icons";
import { Icon } from "@/components/ui/Icon/Icon";
// Base field styling lives with the primitives. Callers pass `ui-input` or
// `ui-textarea` via `inputClassName` (plus their own class), so those classes
// must resolve no matter which primitives the caller itself imports.
import "../Input/Input.css";
import "../Textarea/Textarea.css";
import "./VoiceInput.css";

/**
 * Minimal view of the Web Speech API. It ships untyped in most lib.dom
 * versions, so this declares exactly the surface `VoiceInput` touches:
 * feature-detect, construct, configure, start/stop, and read results.
 * Nothing else is used, so nothing else is declared.
 */
interface SpeechRecognitionResultItem {
  readonly transcript: string;
  readonly isFinal: boolean;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
  /** Key handling for the multiline field — Enter-to-send et al. */
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  /** Forwarded to the textarea when `multiline`, for auto-resize effects. */
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  className?: string;
  inputClassName?: string;
}

/**
 * A text field with a mic button that dictates into it (Phase 10.2).
 *
 * Transcription is the browser's own Web Speech API — `SpeechRecognition`
 * with a `webkitSpeechRecognition` fallback — so there is no external
 * service, no key, and no audio leaves the device except to the browser's
 * own recogniser. `continuous = false` keeps each tap to one utterance;
 * `interimResults = true` shows words as they land rather than after a
 * silence.
 *
 * Where the API does not exist the mic simply does not render: a button
 * that can never work is worse than no button. The field stays a normal
 * controlled input either way, so callers wire `value`/`onChange` exactly
 * as they would for the primitives.
 */
export function VoiceInput({
  value,
  onChange,
  multiline = false,
  placeholder,
  rows = 3,
  maxLength,
  disabled = false,
  ariaLabel,
  id,
  onKeyDown,
  textareaRef,
  className,
  inputClassName,
}: VoiceInputProps): React.JSX.Element {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // The text as it was when dictation started. Interim results render as
  // `base + transcript` without ever writing into state, so stopping
  // mid-utterance keeps what was already typed and drops the half sentence.
  const baseRef = useRef("");
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Feature-detect after mount. `window` does not exist during SSR, and
  // reading it in render would also hydrate differently on a browser
  // without the API — hence `supported` starts false everywhere and only
  // flips client-side.
  useEffect(() => {
    const ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .webkitSpeechRecognition;
    if (ctor) setSupported(true);
  }, []);

  // Recognition holds an OS microphone session. Stopping it on unmount is
  // the only cleanup that matters: a lingering session keeps the mic LED
  // on after the field is gone.
  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      try {
        recognition?.abort();
      } catch {
        // Already stopped — the mic is free either way.
      }
    };
  }, []);

  const stop = useCallback((): void => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setListening(false);
    try {
      recognition?.stop();
    } catch {
      // Stopping an idle recogniser throws; the state above is the truth.
    }
  }, []);

  const start = useCallback((): void => {
    if (disabled || listening) return;
    const ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .webkitSpeechRecognition;
    if (!ctor) return;

    baseRef.current = valueRef.current;
    const recognition = new ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    try {
      recognition.lang = navigator.language || "en-NG";
    } catch {
      recognition.lang = "en-NG";
    }

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i]?.transcript ?? "";
      }
      const base = baseRef.current;
      const spacer =
        base.length > 0 && !base.endsWith(" ") && !base.endsWith("\n") ? " " : "";
      const next = `${base}${spacer}${transcript}`.slice(
        0,
        maxLength ?? Number.MAX_SAFE_INTEGER,
      );
      onChange(next);
    };
    recognition.onerror = () => {
      stop();
    };
    // `continuous = false` ends the session after one utterance. Every end
    // — natural or tapped — returns to the idle mic.
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }, [disabled, listening, maxLength, onChange, stop]);

  const classes = ["ui-voice", multiline ? "ui-voice--multiline" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  const fieldClasses = ["ui-voice__field", inputClassName ?? ""]
    .filter(Boolean)
    .join(" ");
  const label = listening ? "Stop dictating" : "Dictate with your voice";

  return (
    <span className={classes}>
      {multiline ? (
        <textarea
          id={id}
          ref={textareaRef}
          className={fieldClasses}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          aria-label={ariaLabel}
        />
      ) : (
        <input
          type="text"
          id={id}
          className={fieldClasses}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          aria-label={ariaLabel}
        />
      )}
      {supported ? (
        <button
          type="button"
          className={[
            "ui-voice__mic",
            listening ? "ui-voice__mic--listening" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => (listening ? stop() : start())}
          disabled={disabled}
          aria-label={label}
          aria-pressed={listening}
          title={label}
        >
          <Icon as={MicIcon} size={16} />
        </button>
      ) : null}
    </span>
  );
}
