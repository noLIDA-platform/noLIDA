import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero/Hero";
import { Section } from "@/components/marketing/Section/Section";
import { SectionHeading } from "@/components/marketing/SectionHeading/SectionHeading";
import { Accordion } from "@/components/marketing/Accordion/Accordion";
import { CtaSection } from "@/components/marketing/CtaSection/CtaSection";
import { Card } from "@/components/ui/Card/Card";
import { UserIcon, StoreIcon } from "@/components/ui/Icons";
import "../pages.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for noLIDA customers and businesses. 5% platform fee, 10% business commission.",
};

/** Worked example, using the service price the platform advertises. */
const EXAMPLE = [
  { label: "Service price", value: "₦100,000", total: false },
  { label: "Customer pays (incl. 5% platform fee)", value: "₦105,000", total: false },
  { label: "Business commission (10% of service price)", value: "− ₦10,000", total: false },
  { label: "Business receives", value: "₦90,000", total: true },
  { label: "noLIDA revenue", value: "₦15,000", total: true },
] as const;

const FAQ = [
  {
    question: "What does it cost me as a customer?",
    answer:
      "Nothing to create an account. When you book a service, a 5% platform fee is added on top of the price you agreed with the business.",
  },
  {
    question: "Do I pay to list my business?",
    answer:
      "No. Listing a business is free. We only take a commission when you complete a paid job.",
  },
  {
    question: "What is the 10% commission for?",
    answer:
      "It covers the visibility your listing gets — appearing in search and in the feeds of customers near you who are looking for what you do.",
  },
  {
    question: "When does the business get paid?",
    answer:
      "Once the job is complete and confirmed by both sides, the balance is released to the business wallet. Payment is never released unilaterally.",
  },
  {
    question: "Are the fees refundable?",
    answer:
      "Refund rules depend on the job and are agreed between both parties inside the app before money moves. Support can step in if a job is disputed.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Hero
        eyebrow="Pricing"
        title="Simple, transparent pricing"
        subtitle="No listing fees. No monthly charge. You only pay when something happens."
      />

      <Section padding="lg">
        <div className="pg-grid">
          <Card className="pg-card">
            <span className="pg-card__icon" aria-hidden="true">
              <UserIcon size={22} />
            </span>
            <h3 className="pg-card__title">For customers</h3>
            <p className="pg-card__text">
              Creating an account is free, and searching is free. When you book a
              service, a 5% platform fee is added to the agreed price so the
              business can be paid reliably.
            </p>
          </Card>
          <Card className="pg-card">
            <span className="pg-card__icon" aria-hidden="true">
              <StoreIcon size={22} />
            </span>
            <h3 className="pg-card__title">For businesses</h3>
            <p className="pg-card__text">
              Listing your business is free. We charge a 10% commission on the
              service price for each completed job, and nothing at all when no
              work is done.
            </p>
          </Card>
        </div>
      </Section>

      <Section variant="subtle" padding="lg">
        <div className="pg-prose">
          <SectionHeading
            title="A worked example"
            subtitle="What happens to a ₦100,000 job."
          />
          <Card className="pg-example">
            {EXAMPLE.map((row) => (
              <div
                key={row.label}
                className={
                  row.total
                    ? "pg-example__row pg-example__row--total"
                    : "pg-example__row"
                }
              >
                <span className="pg-example__label">{row.label}</span>
                <span className="pg-example__value">{row.value}</span>
              </div>
            ))}
          </Card>
          <p className="pg-card__text">
            The customer is charged once, at the moment of booking. From that
            single payment, the business receives ₦90,000 and noLIDA retains
            ₦15,000 as platform fee and commission.
          </p>
        </div>
      </Section>

      <Section padding="lg">
        <div className="pg-faq-group">
          <SectionHeading title="Questions" subtitle="The five we hear most." />
          <div className="pg-faq-accordion">
            <Accordion items={FAQ} />
          </div>
        </div>
      </Section>

      <CtaSection
        title="Get started"
        subtitle="Free to join. You only pay when something happens."
        primaryCta={{ label: "Create account", href: "/signup" }}
        secondaryCta={{ label: "List your business", href: "/for-business" }}
      />
    </>
  );
}
