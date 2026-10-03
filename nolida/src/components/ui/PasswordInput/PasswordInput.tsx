"use client";

import React from "react";
import { Input, type InputProps } from "@/components/ui/Input/Input";
import { EyeIcon } from "@/components/ui/Icons/EyeIcon/EyeIcon";
import { EyeOffIcon } from "@/components/ui/Icons/EyeOffIcon/EyeOffIcon";
import "./PasswordInput.css";

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  /**
   * `false` renders a permanently masked field with no toggle — for the rare
   * case where revealing is actively wrong (a "confirm your new password"
   * during a high-risk flow, say). Default `true`.
   */
  revealable?: boolean;
}

/**
 * An `Input` with a show/hide toggle (Phase 8D).
 *
 * Wraps the existing `Input` rather than reimplementing it, so every password
 * field keeps the label/hint/error wiring, the generated id and the
 * `aria-describedby` chain it had before. Passing `type` through would defeat
 * the entire component, so it is `Omit`-ed from the public props: a caller
 * cannot accidentally opt out of the masking this exists to guarantee.
 *
 * ## The toggle is a real button, not decoration
 *
 * `type="button"` matters more than it looks: inside a `<form>`, a bare
 * `<button>` defaults to `type="submit"`, so clicking "show password" would
 * submit the form — on a sign-in page, attempting to sign in with a half-typed
 * password. It carries `aria-label` and `aria-pressed`, so a screen reader
 * announces both what it does and whether it is currently on.
 *
 * ## The 40px target
 *
 * The icon itself is 20px, but the button around it is at least 40×40 — the
 * WCAG 2.5.8 minimum target size. A bare 20px icon button is comfortably
 * clickable with a mouse and awkward with a thumb on the one screen people
 * most often use it: typing a long password on a phone.
 *
 * `autoComplete` is passed straight through, because password managers key off
 * it — a field that stops offering the saved password is a worse bug than one
 * without an eye icon.
 */
export function PasswordInput({
  revealable = true,
  className,
  ...inputProps
}: PasswordInputProps): React.JSX.Element {
  const [visible, setVisible] = React.useState(false);

  const isRevealed = revealable && visible;

  return (
    <div className={["ui-password", className ?? ""].filter(Boolean).join(" ")}>
      {/* `Input` renders its own `.ui-field` wrapper, label, hint and error —
          so it is mounted whole, and only the toggle is layered on top. The
          extra right padding below keeps the text clear of the button. */}
      <Input {...inputProps} type={isRevealed ? "text" : "password"} />

      {revealable ? (
        <button
          type="button"
          className="ui-password__toggle"
          // "Show" when hidden, "Hide" when shown — the label describes the
          // action, which is what the user is about to do.
          aria-label={isRevealed ? "Hide password" : "Show password"}
          aria-pressed={isRevealed}
          aria-controls={inputProps.id}
          onClick={() => setVisible((current) => !current)}
        >
          {isRevealed ? (
            <EyeOffIcon size={20} />
          ) : (
            <EyeIcon size={20} />
          )}
        </button>
      ) : null}
    </div>
  );
}