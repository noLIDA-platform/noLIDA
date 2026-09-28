import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero/Hero";
import { Section } from "@/components/marketing/Section/Section";
import { SectionHeading } from "@/components/marketing/SectionHeading/SectionHeading";
import { StepsSection } from "@/components/marketing/StepsSection/StepsSection";
import { CtaSection } from "@/components/marketing/CtaSection/CtaSection";
import "../pages.css";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How noLIDA works for customers and for businesses — from finding a service to getting paid.",
};

export default function HowItWorksPage() {
  return (
    <>
      <Hero
        eyebrow="How noLIDA works"
        title="Post it, book it, pay it."
        subtitle="Two journeys, one app — depending on whether you need something done or you do the work."
      />

      <Section padding="lg">
        <StepsSection
          title="For customers"
          subtitle="Four steps from wanting something to it being done."
          steps={[
            {
              number: 1,
              title: "Create your account",
              description: "Sign up in seconds with your email or phone number.",
            },
            {
              number: 2,
              title: "Post what you need",
              description:
                "Describe the job or product, add photos, and say where you are.",
            },
            {
              number: 3,
              title: "Compare and choose",
              description:
                "Businesses respond with a price. Chat, ask questions, pick one.",
            },
            {
              number: 4,
              title: "Pay and review",
              description:
                "Pay securely in the app, then rate the business afterwards.",
            },
          ]}
        />
      </Section>

      <Section variant="subtle" padding="lg">
        <StepsSection
          title="For businesses"
          subtitle="Five steps to get your business live on noLIDA."
          steps={[
            {
              number: 1,
              title: "Contact us",
              description: "Reach the noLIDA team and ask to be listed.",
            },
            {
              number: 2,
              title: "Get your code",
              description: "We send you a business code to link your listing.",
            },
            {
              number: 3,
              title: "Submit your details",
              description:
                "Share what you offer, your prices, and how customers reach you.",
            },
            {
              number: 4,
              title: "We review",
              description:
                "Our team checks the information before anything goes live.",
            },
            {
              number: 5,
              title: "You are live",
              description:
                "Customers can find you, message you, and book you.",
            },
          ]}
        />
      </Section>

      <Section variant="navy" padding="lg">
        <div className="pg-stack">
          <SectionHeading
            title="Still not sure?"
            subtitle="The Help Center answers the questions we get asked most."
          />
          <ul className="pg-list">
            <li className="pg-list__item pg-list__item--inverse">
              Booking, payments, and how the two fees work.
            </li>
            <li className="pg-list__item pg-list__item--inverse">
              Getting a business reviewed and taken live.
            </li>
          </ul>
        </div>
      </Section>

      <CtaSection
        title="Questions? We can help."
        subtitle="Read the Help Center, or message us directly."
        primaryCta={{ label: "Visit Help Center", href: "/help" }}
        secondaryCta={{ label: "Create account", href: "/signup" }}
      />
    </>
  );
}
