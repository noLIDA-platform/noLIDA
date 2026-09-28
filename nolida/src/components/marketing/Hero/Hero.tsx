import { Button } from "@/components/ui/Button/Button";
import { Container } from "@/components/ui/Container/Container";
import "./Hero.css";

export interface HeroCta {
  readonly label: string;
  readonly href: string;
}

export interface HeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primaryCta?: HeroCta | null;
  secondaryCta?: HeroCta | null;
  className?: string;
}

/**
 * Full-bleed marketing opener on the hero gradient, with a radial navy
 * vignette layered on top for depth. Text is always inverse (white): the
 * gradient is dark enough at every stop to hold contrast.
 */
export function Hero({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  className,
}: HeroProps): React.JSX.Element {
  const classes = ["mk-hero", className ?? ""].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      <div className="mk-hero__vignette" aria-hidden="true" />
      <Container size="lg" className="mk-hero__inner">
        {eyebrow ? (
          <span className="mk-hero__eyebrow">{eyebrow}</span>
        ) : null}

        <h1 className="mk-hero__title">{title}</h1>

        {subtitle ? <p className="mk-hero__subtitle">{subtitle}</p> : null}

        {primaryCta || secondaryCta ? (
          <div className="mk-hero__actions">
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

export default Hero;
