import type { Metadata } from "next";
import {
  Check,
  Headset,
  MessageSquareText,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
} from "lucide-react";
import { Hero } from "@/components/marketing/Hero/Hero";
import { FeatureGrid } from "@/components/marketing/FeatureGrid/FeatureGrid";
import { Section } from "@/components/marketing/Section/Section";
import { StepsSection } from "@/components/marketing/StepsSection/StepsSection";
import { CtaSection } from "@/components/marketing/CtaSection/CtaSection";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Icon } from "@/components/ui/Icon/Icon";
import { buildWhatsAppHref } from "@/lib/support/whatsapp";
import "../pages.css";

export const metadata: Metadata = {
  title: "Explore noLIDA",
  description:
    "Discover what you can do on noLIDA: find businesses, request services, book, pay, and grow a business in one app.",
};

const TRUST_ITEMS = [
  {
    title: "Secure payments",
    text: "Payments processed through a licensed provider.",
    icon: <Icon as={ShieldCheck} size={22} />,
  },
  {
    title: "Verified businesses",
    text: "Every business is reviewed before going live.",
    icon: <Icon as={Check} size={22} />,
  },
  {
    title: "Support that responds",
    text: "Our team is one message away.",
    icon: <Icon as={Headset} size={22} />,
  },
] as const;

export default function ExplorePage() {
  const whatsappHref = buildWhatsAppHref(
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP,
  );

  return (
    <>
      <Hero
        eyebrow="Welcome to noLIDA"
        title="Everything you need, in one app."
        subtitle="noLIDA connects people and businesses across Nigeria. Discover services, request anything, book, and pay — all without leaving the app."
        primaryCta={{ label: "Get started", href: "/signup" }}
        secondaryCta={{ label: "Sign in", href: "/login" }}
      />

      <Section padding="lg">
        <FeatureGrid
          title="What you can do on noLIDA"
          subtitle="One platform for the things you do every day."
          features={[
            {
              icon: <Icon as={Search} size={22} />,
              title: "Discover",
              description: "Find businesses, services, and products near you.",
            },
            {
              icon: <Icon as={MessageSquareText} size={22} />,
              title: "Request",
              description:
                "Post what you need. Get real responses from real businesses.",
            },
            {
              icon: <Icon as={Check} size={22} />,
              title: "Book & Pay",
              description: "Schedule a service. Pay securely inside noLIDA.",
            },
            {
              icon: <Icon as={Store} size={22} />,
              title: "Sell",
              description:
                "List your business, sell products, and manage orders.",
            },
          ]}
        />
      </Section>

      <Section variant="subtle" padding="lg">
        <StepsSection
          title="How noLIDA works"
          subtitle="Four steps from idea to done."
          steps={[
            {
              number: 1,
              title: "Create your account",
              description: "Sign up in seconds with email or phone.",
            },
            {
              number: 2,
              title: "Find what you need",
              description: "Search by service, product, or location.",
            },
            {
              number: 3,
              title: "Connect and book",
              description: "Chat, get a quote, book a time.",
            },
            {
              number: 4,
              title: "Pay and review",
              description: "Pay securely and leave a review.",
            },
          ]}
        />
      </Section>

      <Section variant="navy" padding="lg">
        <div
          className="pg-split"
          style={{ alignItems: "center", minHeight: "100%" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <h2 style={{ margin: 0, color: "#ffffff" }}>Grow your business on noLIDA</h2>
            <p
              style={{
                margin: 0,
                color: "color-mix(in srgb, var(--text-inverse) 80%, transparent)",
                lineHeight: "var(--leading-relaxed)",
              }}
            >
              Reach more customers, manage bookings, and get paid on time.
            </p>
            <ul className="pg-list" style={{ margin: 0 }}>
              <li className="pg-list__item pg-list__item--inverse">
                Reach more customers
              </li>
              <li className="pg-list__item pg-list__item--inverse">
                Manage bookings and orders
              </li>
              <li className="pg-list__item pg-list__item--inverse">
                Get paid securely
              </li>
              <li className="pg-list__item pg-list__item--inverse">
                Track your earnings
              </li>
            </ul>
            <Button as="link" href="/for-business" variant="inverse" size="lg">
              List your business
            </Button>
          </div>

          <Card
            className="pg-card"
            style={{
              minHeight: "220px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.26), rgba(34, 211, 238, 0.12))",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-start",
                minHeight: "100%",
                gap: "var(--space-3)",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
                aria-hidden="true"
              >
                <Icon as={ShoppingBag} size={22} />
              </span>
              <h3 style={{ margin: 0, color: "#ffffff" }}>
                Business dashboard preview coming soon
              </h3>
            </div>
          </Card>
        </div>
      </Section>

      <Section variant="subtle" padding="lg">
        <div className="pg-grid pg-grid--three">
          {TRUST_ITEMS.map((item) => (
            <Card key={item.title} className="pg-card">
              <span className="pg-card__icon" aria-hidden="true">
                {item.icon}
              </span>
              <h3 className="pg-card__title">{item.title}</h3>
              <p className="pg-card__text">{item.text}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section padding="lg">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "var(--space-4)",
          }}
        >
          <h2 style={{ margin: 0 }}>Still have questions?</h2>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              lineHeight: "var(--leading-relaxed)",
            }}
          >
            Reach out on WhatsApp or email. We respond fast.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-4)",
            }}
          >
            {whatsappHref ? (
              <Button as="link" href={whatsappHref} size="lg">
                WhatsApp
              </Button>
            ) : (
              <Button size="lg" disabled>
                WhatsApp not configured
              </Button>
            )}
            <Button as="link" href="/help" variant="secondary" size="lg">
              Visit the Help Center
            </Button>
          </div>
        </div>
      </Section>

      <CtaSection
        title="Ready to get started?"
        subtitle="Join noLIDA today. It's free."
        primaryCta={{ label: "Create account", href: "/signup" }}
        secondaryCta={{ label: "List your business", href: "/for-business" }}
      />
    </>
  );
}
