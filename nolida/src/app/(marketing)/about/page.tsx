import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero/Hero";
import { Section } from "@/components/marketing/Section/Section";
import { SectionHeading } from "@/components/marketing/SectionHeading/SectionHeading";
import { CtaSection } from "@/components/marketing/CtaSection/CtaSection";
import { Card } from "@/components/ui/Card/Card";
import { HeartIcon, SearchIcon, UserIcon } from "@/components/ui/Icons";
import "../pages.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "noLIDA is a social marketplace that connects people and businesses across Nigeria.",
};

const BELIEFS: readonly { icon: React.ReactNode; title: string; text: string }[] = [
  {
    icon: <SearchIcon size={22} />,
    title: "Simplicity",
    text: "Finding work and hiring help should take minutes, not days. Every screen in noLIDA is built to be obvious.",
  },
  {
    icon: <HeartIcon size={22} />,
    title: "Trust",
    text: "Verified businesses, transparent prices, and payments that only move when both sides agree.",
  },
  {
    icon: <UserIcon size={22} />,
    title: "Opportunity",
    text: "We want the small business down the road to have the same reach as the biggest name in the country.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Hero
        eyebrow="About noLIDA"
        title="One platform for everyone."
        subtitle="noLIDA is a social marketplace built in Nigeria, for the people who live here."
      />

      <Section padding="lg">
        <div className="pg-prose">
          <p>
            noLIDA started with a simple frustration: finding someone to fix a
            generator, paint a flat, or deliver a package meant asking around,
            calling numbers, and hoping for the best.
          </p>
          <p>
            We built one place where people can post what they need, businesses
            can respond, and both sides can agree on a price and a time.
          </p>
          <p>
            The platform is social by design. You are not browsing a catalogue —
            you are talking to real businesses, in a feed, with history you can
            come back to.
          </p>
          <p>
            Payments happen inside the app, so both sides know exactly what was
            agreed, what was paid, and what is still owed.
          </p>
          <p>
            We are early. We are building in public, and everything we ship
            starts with what users tell us is missing.
          </p>
        </div>
      </Section>

      <Section variant="subtle" padding="lg">
        <SectionHeading
          title="What we believe"
          subtitle="Three principles behind every decision we make."
        />
        <div className="pg-grid pg-grid--three">
          {BELIEFS.map((belief) => (
            <Card key={belief.title} className="pg-card">
              <span className="pg-card__icon" aria-hidden="true">
                {belief.icon}
              </span>
              <h3 className="pg-card__title">{belief.title}</h3>
              <p className="pg-card__text">{belief.text}</p>
            </Card>
          ))}
        </div>
      </Section>

      <CtaSection
        title="Come build it with us."
        subtitle="Join noLIDA today. It's free for customers and for businesses."
        primaryCta={{ label: "Create account", href: "/signup" }}
        secondaryCta={{ label: "List your business", href: "/for-business" }}
      />
    </>
  );
}
