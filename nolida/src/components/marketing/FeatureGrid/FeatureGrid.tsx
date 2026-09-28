import { Card } from "@/components/ui/Card/Card";
import { SectionHeading } from "@/components/marketing/SectionHeading/SectionHeading";
import "./FeatureGrid.css";

export interface Feature {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
}

export interface FeatureGridProps {
  title: string;
  subtitle?: string;
  features: readonly Feature[];
  className?: string;
}

/** Responsive feature grid: one column on mobile, up to three on desktop. */
export function FeatureGrid({
  title,
  subtitle,
  features,
  className,
}: FeatureGridProps): React.JSX.Element {
  const classes = ["mk-feature-grid", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <SectionHeading title={title} subtitle={subtitle} />

      <ul className="mk-feature-grid__list">
        {features.map((feature) => (
          <li key={feature.title}>
            <Card className="mk-feature">
              <span className="mk-feature__icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3 className="mk-feature__title">{feature.title}</h3>
              <p className="mk-feature__description">{feature.description}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FeatureGrid;
