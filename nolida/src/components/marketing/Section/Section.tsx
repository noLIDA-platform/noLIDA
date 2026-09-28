import { Container } from "@/components/ui/Container/Container";
import "./Section.css";

export type SectionVariant = "default" | "subtle" | "navy";
export type SectionPadding = "sm" | "md" | "lg";

export interface SectionProps {
  variant?: SectionVariant;
  padding?: SectionPadding;
  /** When set, content is wrapped in the shared Container at this width. */
  container?: "sm" | "md" | "lg" | "full";
  id?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Full-width band with consistent vertical rhythm.
 * `navy` is the deep icon-derived surface: it sets white text for its
 * children and is used for hero-adjacent or brand moments.
 */
export function Section({
  variant = "default",
  padding = "md",
  container = "lg",
  id,
  children,
  className,
}: SectionProps): React.JSX.Element {
  const classes = [
    "mk-section",
    `mk-section--${variant}`,
    `mk-section--${padding}`,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section id={id} className={classes}>
      <Container size={container}>{children}</Container>
    </section>
  );
}

export default Section;
