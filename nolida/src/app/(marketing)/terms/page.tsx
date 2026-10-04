import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero/Hero";
import { Section } from "@/components/marketing/Section/Section";
import { CircleAlert } from "lucide-react";
import { SectionHeading } from "@/components/marketing/SectionHeading/SectionHeading";
import { Icon } from "@/components/ui/Icon/Icon";
import "../pages.css";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that will govern the use of NOlida. This page is a placeholder until the final version is written.",
};

const SECTIONS: readonly string[] = [
  "Acceptance of these terms",
  "Your account and eligibility",
  "What you can and cannot do on NOlida",
  "Requests, quotes, bookings, and cancellations",
  "Payments, fees, and refunds",
  "Ratings and reviews",
  "Business listings and verification",
  "Intellectual property",
  "Suspending or closing an account",
  "Liability and dispute resolution",
  "Changes to these terms",
  "How to contact us",
];

export default function TermsPage() {
  return (
    <>
      <Hero
        eyebrow="Legal"
        title="Terms of Service"
        subtitle="The rules that will apply to everyone using NOlida."
      />

      <Section padding="lg">
        <div className="pg-prose">
          <p>
            <strong>Last updated: September 28, 2026</strong>
          </p>

          <p className="pg-notice" role="note">
            <span className="pg-notice__icon" aria-hidden="true">
              <Icon as={CircleAlert} size={20} />
            </span>
            <span>
              <strong>Placeholder — not legal text.</strong> This page is a
              structural draft only. The final Terms of Service will be written
              and reviewed by a lawyer before NOlida opens to the public. Until
              then, nothing on this page is legally binding.
            </span>
          </p>

          <p>
            When the final version is published, it will appear here in full and
            replace this placeholder. Existing accounts will be asked to accept
            the terms before they are able to transact.
          </p>

          <SectionHeading
            title="Sections to come"
            subtitle="What the final Terms of Service will cover."
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
            Questions about the terms? Contact the team through the Help
            Center until this page is final.
          </p>
        </div>
      </Section>
    </>
  );
}
