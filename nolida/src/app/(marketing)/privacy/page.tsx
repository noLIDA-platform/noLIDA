import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero/Hero";
import { Section } from "@/components/marketing/Section/Section";
import { SectionHeading } from "@/components/marketing/SectionHeading/SectionHeading";
import { AlertIcon } from "@/components/ui/Icons";
import "../pages.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "The privacy practices that will apply to noLIDA. This page is a placeholder until the final version is written.",
};

const SECTIONS: readonly string[] = [
  "What we collect",
  "Information you give us",
  "Information collected automatically",
  "How we use your information",
  "Sharing and disclosure",
  "Cookies and analytics",
  "Payment data and third-party providers",
  "Data retention",
  "Your rights and choices",
  "Security",
  "Children's privacy",
  "How to contact us about your data",
];

export default function PrivacyPage() {
  return (
    <>
      <Hero
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="What we collect, why we collect it, and what you can control."
      />

      <Section padding="lg">
        <div className="pg-prose">
          <p>
            <strong>Last updated: September 28, 2026</strong>
          </p>

          <p className="pg-notice" role="note">
            <span className="pg-notice__icon" aria-hidden="true">
              <AlertIcon size={20} />
            </span>
            <span>
              <strong>Placeholder — not legal text.</strong> This page is a
              structural draft only. The final Privacy Policy will be written
              and reviewed by a lawyer before noLIDA opens to the public. Until
              then, nothing on this page is legally binding.
            </span>
          </p>

          <p>
            When the final version is published, it will appear here in full and
            replace this placeholder. noLIDA is designed to collect the minimum
            information needed to run a marketplace, but the specifics will be
            documented here.
          </p>

          <SectionHeading
            title="Sections to come"
            subtitle="What the final Privacy Policy will cover."
            align="left"
          />

          <ul className="pg-list">
            {SECTIONS.map((section) => (
              <li key={section} className="pg-list__item">
                {section}
              </li>
            ))}
          </ul>

          <p>
            Questions about privacy? Contact the team through the Help Center
            until this page is final.
          </p>
        </div>
      </Section>
    </>
  );
}
