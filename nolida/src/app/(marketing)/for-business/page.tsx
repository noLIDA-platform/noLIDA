import type { Metadata } from "next";
import { Bell, Check, Wallet } from "lucide-react";
import { Hero } from "@/components/marketing/Hero/Hero";
import { Section } from "@/components/marketing/Section/Section";
import { SectionHeading } from "@/components/marketing/SectionHeading/SectionHeading";
import { StepsSection } from "@/components/marketing/StepsSection/StepsSection";
import { Card } from "@/components/ui/Card/Card";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { buildWhatsAppHref } from "@/lib/support/whatsapp";
import "../pages.css";

export const metadata: Metadata = {
  title: "For Business",
  description:
    "List your business on noLIDA, get more customers, manage bookings, and get paid on time.",
};

const WHY_POINTS: readonly { icon: React.ReactNode; title: string; text: string }[] = [
  {
    icon: <Icon as={Bell} size={22} />,
    title: "Requests that fit you",
    text: "See the jobs people near you actually need done, and respond to the ones you can handle.",
  },
  {
    icon: <Icon as={Check} size={22} />,
    title: "Bookings you control",
    text: "Agree the time, confirm the scope, and keep every job in one place instead of scattered notebooks.",
  },
  {
    icon: <Icon as={Wallet} size={22} />,
    title: "Paid on time",
    text: "Customers pay inside noLIDA, and payouts land in your wallet without chasing anyone.",
  },
];

export default function ForBusinessPage() {
  const whatsappHref = buildWhatsAppHref(
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP,
  );

  return (
    <>
      <Hero
        eyebrow="For business"
        title="Grow your business on noLIDA"
        subtitle="More customers, fewer no-shows, and a clear record of what you earned."
        primaryCta={
          whatsappHref
            ? { label: "Contact us on WhatsApp", href: whatsappHref }
            : null
        }
        secondaryCta={{ label: "See how it works", href: "/how-it-works" }}
      />

      <Section padding="lg">
        <SectionHeading
          title="Why noLIDA"
          subtitle="Everything a small business needs, in one place."
        />
        <div className="pg-grid pg-grid--three">
          {WHY_POINTS.map((point) => (
            <Card key={point.title} className="pg-card">
              <span className="pg-card__icon" aria-hidden="true">
                {point.icon}
              </span>
              <h3 className="pg-card__title">{point.title}</h3>
              <p className="pg-card__text">{point.text}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section variant="subtle" padding="lg">
        <StepsSection
          title="How to get listed"
          subtitle="Five steps from first message to first booking."
          steps={[
            {
              number: 1,
              title: "Contact us",
              description: "Message the noLIDA team and ask to be listed.",
            },
            {
              number: 2,
              title: "Get your code",
              description: "We send a business code for your listing.",
            },
            {
              number: 3,
              title: "Submit your details",
              description: "Tell us what you offer and where you work.",
            },
            {
              number: 4,
              title: "We review",
              description: "Our team checks everything before you go live.",
            },
            {
              number: 5,
              title: "You are live",
              description: "Customers find you, message you, and book you.",
            },
          ]}
        />
      </Section>

      <Section padding="lg">
        <SectionHeading
          title="What it costs"
          subtitle="Two simple fees. No listing fee, no monthly charge."
        />
        <div className="pg-grid">
          <Card className="pg-card">
            <h3 className="pg-card__title">5% platform fee</h3>
            <p className="pg-card__text">
              Added to what the customer pays. It covers payment processing,
              support, and running the platform.
            </p>
          </Card>
          <Card className="pg-card">
            <h3 className="pg-card__title">10% commission</h3>
            <p className="pg-card__text">
              Deducted from the service price you agreed. It covers visibility
              and the customers you receive.
            </p>
          </Card>
        </div>
      </Section>

      <Section variant="navy" padding="lg">
        <div className="pg-contact">
          <h2 className="mk-cta__title">Ready to get listed?</h2>
          <p className="pg-contact__hint">
            Message us on WhatsApp and we will walk you through it.
          </p>
          {whatsappHref ? (
            <Button as="link" href={whatsappHref} variant="inverse" size="lg">
              Contact us on WhatsApp
            </Button>
          ) : (
            <Button size="lg" disabled>
              WhatsApp not configured
            </Button>
          )}
          {!whatsappHref ? (
            <p className="pg-contact__hint">
              Our WhatsApp support number will be published here as soon as
              launch is confirmed.
            </p>
          ) : null}
        </div>
      </Section>
    </>
  );
}
