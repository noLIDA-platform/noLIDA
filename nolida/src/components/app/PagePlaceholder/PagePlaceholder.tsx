import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import "./PagePlaceholder.css";

export interface PagePlaceholderProps {
  icon: LucideIcon;
  /** The real name of the screen, used as the page title. */
  title: string;
  /**
   * What this screen will do once its phase lands. Written as a statement of
   * scope, never as fake data — a placeholder showing a plausible balance
   * invites someone to design around it.
   */
  description: string;
  /** Renders a back link above the title. Used by the settings sub-routes. */
  backHref?: string;
  backLabel?: string;
  /** Optional escape hatch, e.g. "Create an account" on a signed-out surface. */
  action?: { label: string; href: string };
  className?: string;
}

/**
 * The honest "not built yet" screen.
 *
 * Every `(main)` route exists from Phase 5A so navigation never dead-ends, but
 * only `/home` and `/profile` carry real content. A placeholder states what is
 * coming instead of pretending, and keeps the frame — title, spacing, empty
 * state — identical to the finished screens so nothing shifts when real content
 * arrives.
 */
export function PagePlaceholder({
  icon,
  title,
  description,
  backHref,
  backLabel = "Back",
  action,
  className,
}: PagePlaceholderProps): React.JSX.Element {
  const classes = ["mp-page", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {backHref ? (
        <Link href={backHref} className="mp-back">
          <Icon as={ArrowLeft} size={16} />
          <span>{backLabel}</span>
        </Link>
      ) : null}

      <h1 className="mp-title">{title}</h1>

      <div className="mp-card">
        <EmptyState
          icon={<Icon as={icon} size={28} />}
          title="Coming soon"
          description={description}
          action={
            action ? (
              <Button as="link" href={action.href} size="sm">
                {action.label}
              </Button>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}