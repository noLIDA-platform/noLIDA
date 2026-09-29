import { FannedStack } from "@/components/layout/FannedStack/FannedStack";
import "./AuthSplitShell.css";

/**
 * `form-right` puts the gradient visual on the left and the form on the right —
 * the Phase 4B orientation. `form-left` is the mirror image.
 */
export type AuthSplitOrientation = "form-right" | "form-left";

export interface AuthSplitShellProps {
  /** The form / interactive content. Always rendered last in the DOM. */
  children: React.ReactNode;
  /**
   * Which side the form sits on. Defaults to `form-right` because every
   * screen in this phase uses it; `form-left` exists for a future mirrored
   * layout and is the reason this is a prop rather than a constant.
   */
  orientation?: AuthSplitOrientation;
  /**
   * Extra content rendered beneath the FannedStack inside the visual panel —
   * the `HeroBlock` on `/`. When null the stack stays vertically centred.
   */
  beneathStack?: React.ReactNode | null;
  className?: string;
}

/**
 * Two-panel auth layout: a branded gradient panel carrying the product fan,
 * and the form beside it.
 *
 * Server Component. It renders no interactive element of its own, so the form
 * stays a client component and this shell does not.
 *
 * On mobile (<768px) the visual panel is removed entirely and the form takes
 * the full width, so a phone never has to scroll past a decoration to reach it.
 */
export function AuthSplitShell({
  children,
  orientation = "form-right",
  beneathStack = null,
  className,
}: AuthSplitShellProps): React.JSX.Element {
  const classes = [
    "auth-split",
    `auth-split--${orientation}`,
    beneathStack ? "auth-split--stacked" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="auth-split__panel">
        <div className="auth-split__glow" aria-hidden="true" />

        <div className="auth-split__visual">
          <FannedStack />

          {beneathStack ? (
            <div className="auth-split__beneath">{beneathStack}</div>
          ) : null}
        </div>
      </div>

      <div className="auth-split__form">
        <div className="auth-split__form-inner">{children}</div>
      </div>
    </div>
  );
}

export default AuthSplitShell;
