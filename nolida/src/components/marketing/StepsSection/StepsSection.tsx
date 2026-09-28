import { SectionHeading } from "@/components/marketing/SectionHeading/SectionHeading";
import "./StepsSection.css";

export interface Step {
  readonly number: number;
  readonly title: string;
  readonly description: string;
}

export interface StepsSectionProps {
  title: string;
  subtitle?: string;
  steps: readonly Step[];
  className?: string;
}

/**
 * Ordered how-it-works timeline: vertical on mobile, horizontal on desktop.
 * The numerals are one of the sanctioned brand-gradient moments.
 */
export function StepsSection({
  title,
  subtitle,
  steps,
  className,
}: StepsSectionProps): React.JSX.Element {
  const classes = ["mk-steps-section", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <SectionHeading title={title} subtitle={subtitle} />

      <ol className="mk-steps">
        {steps.map((step) => (
          <li key={step.number} className="mk-step">
            <span className="mk-step__number" aria-hidden="true">
              {step.number}
            </span>
            <span className="sr-only">Step {step.number}: </span>
            <div className="mk-step__body">
              <h3 className="mk-step__title">{step.title}</h3>
              <p className="mk-step__description">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default StepsSection;
