import "./TypingIndicator.css";

export interface TypingIndicatorProps {
  /** What to say, e.g. "Ada is typing…" — the caller knows the name. */
  label: string;
  className?: string;
}

/**
 * Three animated dots. Purely decorative beside the label: screen readers get
 * the live region from `label`, not the dots, and `aria-hidden` keeps the
 * animation out of the announcement.
 */
export function TypingIndicator({
  label,
  className,
}: TypingIndicatorProps): React.JSX.Element {
  const classes = ["msg-typing", className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <span className="msg-typing__dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="msg-typing__label" role="status">
        {label}
      </span>
    </div>
  );
}
