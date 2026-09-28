import { Button } from "@/components/ui/Button/Button";
import { Container } from "@/components/ui/Container/Container";
import type { HeroCta } from "@/components/marketing/Hero/Hero";
import "./CtaSection.css";

export interface CtaSectionProps {
  title: string;
  subtitle?: string;
  primaryCta?: HeroCta | null;
  secondaryCta?: HeroCta | null;
  className?: string;
}

/**
 * Closing call-to-action band. Unlike the hero this uses a soft navy wash
 * with a faint gradient bleed at the edges — a quiet brand moment, never a
 * full-bleed gradient.
 */
export function CtaSection({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  className,
}: CtaSectionProps): React.JSX.Element {
  const classes = ["mk-cta", className ?? ""].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      <div className="mk-cta__glow" aria-hidden="true" />
      <Container size="md" className="mk-cta__inner">
        <h2 className="mk-cta__title">{title}</h2>
        {subtitle ? <p className="mk-cta__subtitle">{subtitle}</p> : null}

        {primaryCta || secondaryCta ? (
          <div className="mk-cta__actions">
            {primaryCta ? (
              <Button as="link" href={primaryCta.href} variant="inverse" size="lg">
                {primaryCta.label}
              </Button>
            ) : null}
            {secondaryCta ? (
              <Button
                as="link"
                href={secondaryCta.href}
                variant="outline-inverse"
                size="lg"
              >
                {secondaryCta.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Container>
    </section>
  );
}

export default CtaSection;
