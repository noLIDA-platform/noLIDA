import "./SectionHeading.css";

export interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  /** Render as h3 instead of h2 when the section already owns an h2. */
  level?: 2 | 3;
  className?: string;
}

/** Shared section title + subtitle block used by every marketing section. */
export function SectionHeading({
  title,
  subtitle,
  align = "center",
  level = 2,
  className,
}: SectionHeadingProps): React.JSX.Element {
  const classes = [
    "mk-heading",
    `mk-heading--${align}`,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const Heading = level === 3 ? "h3" : "h2";

  return (
    <div className={classes}>
      <Heading className="mk-heading__title">{title}</Heading>
      {subtitle ? <p className="mk-heading__subtitle">{subtitle}</p> : null}
    </div>
  );
}

export default SectionHeading;
