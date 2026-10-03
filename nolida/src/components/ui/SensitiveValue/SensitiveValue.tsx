"use client";

import React from "react";
import { EyeIcon } from "@/components/ui/Icons/EyeIcon/EyeIcon";
import { EyeOffIcon } from "@/components/ui/Icons/EyeOffIcon/EyeOffIcon";
import "./SensitiveValue.css";

export interface SensitiveValueProps {
  value: string | number;
  /** Formats the revealed value, e.g. `(n) => `₦${n.toLocaleString()}``. */
  format?: (value: string | number) => string;
  /**
   * Controlled reveal state. Leave `undefined` for self-managed state — which is
   * what every current caller will want — or supply it together with
   * `onToggle` when the surrounding screen needs to persist the choice (a
   * "hide balance" preference, say).
   */
  revealed?: boolean;
  onToggle?: () => void;
  /** Shown while hidden. Bullets by default — never a zero-width string,
   * because an empty hidden value is indistinguishable from no value at all. */
  hiddenText?: string;
  /** Accessible name for the toggle, e.g. `"Show balance"`. */
  label?: string;
  className?: string;
}

const DEFAULT_HIDDEN_TEXT = "••••••";

/**
 * A number that can be hidden and revealed — wallet balances, earnings,
 * anything an owner would not want shoulder-surfed on a shared phone
 * (Phase 8D, currently unused).
 *
 * ## Built now, used later
 *
 * Nothing renders this yet: the wallet and earnings screens are placeholders,
 * and shipping a toggle nobody can see would be dead code. It exists because
 * the *pattern* was about to be duplicated — the eye icons and the button
 * semantics are identical to `PasswordInput`, and re-deriving them in the
 * wallet phase would be how they drift apart.
 *
 * ## Hidden by default
 *
 * The default is hidden, so a caller that forgets the prop shows a masked value
 * rather than leaking a balance on first paint. That is the same default the
 * password field uses, and for the same reason.
 *
 * `aria-live="polite"` on the value is deliberate: revealing changes text a
 * screen-reader user was told was masked, and it should be announced rather
 * than silently swapped.
 *
 * The toggle reuses the same markup contract as `PasswordInput` — `type="button"`,
 * an action-named `aria-label`, and `aria-pressed` — so muscle memory and
 * assistive-tech behaviour match between the two.
 */
export function SensitiveValue({
  value,
  format,
  revealed,
  onToggle,
  hiddenText = DEFAULT_HIDDEN_TEXT,
  label = "Show value",
  className,
}: SensitiveValueProps): React.JSX.Element {
  const [selfRevealed, setSelfRevealed] = React.useState(false);
  const isControlled = revealed !== undefined;
  const isRevealed = isControlled ? revealed : selfRevealed;

  const toggle = React.useCallback(() => {
    if (isControlled) {
      onToggle?.();
      return;
    }
    setSelfRevealed((current) => !current);
  }, [isControlled, onToggle]);

  const display = isRevealed
    ? (format?.(value) ?? String(value))
    : hiddenText;

  const classes = ["ui-sensitive", className ?? ""].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      <span className="ui-sensitive__value" aria-live="polite">
        {display}
      </span>

      <button
        type="button"
        className="ui-sensitive__toggle"
        aria-label={isRevealed ? `Hide ${label.toLowerCase()}` : label}
        aria-pressed={isRevealed}
        onClick={toggle}
      >
        {isRevealed ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
      </button>
    </span>
  );
}