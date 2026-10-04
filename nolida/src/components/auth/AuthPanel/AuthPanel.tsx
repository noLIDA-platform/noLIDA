import "./AuthPanel.css";

export interface AuthPanelProps {
  /** Rendered as the panel heading — `h1` unless a hero already owns it. */
  title: string;
  /**
   * Heading tag for `title`. Defaults to `"h1"`. Pages whose visual panel
   * carries a `HeroBlock` pass `"h2"` so the document has exactly one `h1`.
   */
  headingLevel?: "h1" | "h2";
  subtitle?: string;
  children: React.ReactNode;
  /** Rendered under a divider, e.g. a "New to NOlida? Sign up" line. */
  footer?: React.ReactNode;
  /** Set false to omit the "or continue with" divider and social buttons. */
  showSocial?: boolean;
  className?: string;
}

/**
 * Shared chrome for every auth form: heading, subtitle, an optional social
 * block, and a footer line.
 *
 * Server Component — it renders only presentational markup plus the disabled
 * social buttons, so the individual forms stay the only client components.
 *
 * The social buttons are intentionally inert. Google/Apple sign-in is Phase 4C
 * and depends on credentials that do not exist yet; a button that looks
 * enabled but does nothing is worse than one that is visibly unavailable.
 */
export function AuthPanel({
  title,
  headingLevel = "h1",
  subtitle,
  children,
  footer,
  showSocial = true,
  className,
}: AuthPanelProps): React.JSX.Element {
  const classes = ["auth-panel", className ?? ""].filter(Boolean).join(" ");
  const Heading = headingLevel;

  return (
    <div className={classes}>
      <header className="auth-panel__header">
        <Heading className="auth-panel__title">{title}</Heading>
        {subtitle ? <p className="auth-panel__subtitle">{subtitle}</p> : null}
      </header>

      {children}

      {showSocial ? (
        <>
          <div className="auth-panel__divider">
            <span className="auth-panel__divider-line" aria-hidden="true" />
            <span className="auth-panel__divider-text">or continue with</span>
            <span className="auth-panel__divider-line" aria-hidden="true" />
          </div>

          <div className="auth-panel__social">
            <button
              type="button"
              className="auth-panel__social-btn"
              disabled
              aria-describedby="auth-social-note"
            >
              <span className="auth-panel__social-mark" aria-hidden="true">
                G
              </span>
              Continue with Google
            </button>

            <button
              type="button"
              className="auth-panel__social-btn"
              disabled
              aria-describedby="auth-social-note"
            >
              <span className="auth-panel__social-mark" aria-hidden="true">
                {"\uF8FF"}
              </span>
              Continue with Apple
            </button>

            <p id="auth-social-note" className="auth-panel__social-note">
              Social sign-in is not available yet.
            </p>
          </div>
        </>
      ) : null}

      {footer ? <div className="auth-panel__footer">{footer}</div> : null}
    </div>
  );
}

export default AuthPanel;
