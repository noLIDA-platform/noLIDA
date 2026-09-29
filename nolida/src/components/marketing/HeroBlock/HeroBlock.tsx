import { Button } from "@/components/ui/Button/Button";
import "./HeroBlock.css";

export type HeroBlockAlign = "center" | "left";
export type HeroBlockSize = "md" | "lg";

export interface HeroBlockCta {
  readonly label: string;
  readonly href: string;
}

export interface HeroBlockProps {
  eyebrow?: string;
  /** Rendered as the page's single `h1`. */
  title: string;
  subtitle?: string;
  primaryCta?: HeroBlockCta | null;
  secondaryCta?: HeroBlockCta | null;
  align?: HeroBlockAlign;
  size?: HeroBlockSize;
  className?: string;
}

/**
 * Compact marketing copy block for the gradient panel of the auth split.
 *
 * Distinct from the full-bleed `Hero` (which stays on the marketing pages):
 * this one is text-only, sits on an already-gradient parent, and so inherits
 * that parent's inverse text colour instead of painting its own background.
 *
 * Server Component — it renders links and buttons, nothing interactive.
 */
export function HeroBlock({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  align = "center",
  size = "md",
  className,
}: HeroBlockProps): React.JSX.Element {
  const classes = [
    "hero-block",
    `hero-block--${align}`,
    `hero-block--${size}`,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      {eyebrow ? <p className="hero-block__eyebrow">{eyebrow}</p> : null}

      <h1 className="hero-block__title">{title}</h1>

      {subtitle ? <p className="hero-block__subtitle">{subtitle}</p> : null}

      {primaryCta || secondaryCta ? (
        <div className="hero-block__actions">
          {primaryCta ? (
            <Button as="link" href={primaryCta.href} variant="inverse">
              {primaryCta.label}
            </Button>
          ) : null}

          {secondaryCta ? (
            <Button
              as="link"
              href={secondaryCta.href}
              variant="outline-inverse"
            >
              {secondaryCta.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default HeroBlock;
