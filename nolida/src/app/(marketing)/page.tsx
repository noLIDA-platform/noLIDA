import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero/Hero";
import { FeatureGrid } from "@/components/marketing/FeatureGrid/FeatureGrid";
import { StepsSection } from "@/components/marketing/StepsSection/StepsSection";
import { Section } from "@/components/marketing/Section/Section";
import { CtaSection } from "@/components/marketing/CtaSection/CtaSection";
import { StatsRow } from "@/components/marketing/StatsRow/StatsRow";
import { SectionHeading } from "@/components/marketing/SectionHeading/SectionHeading";
import { Card } from "@/components/ui/Card/Card";
import { Button } from "@/components/ui/Button/Button";
import {
  CheckIcon,
  CommentIcon,
  MessageIcon,
  SearchIcon,
  StoreIcon,
  WalletIcon,
} from "@/components/ui/Icons";
import "./page.css";

export const metadata: Metadata = {
  description:
    "noLIDA connects people and businesses. Find what you need, offer what you do, and get paid — without leaving the app.",
};

const BUSINESS_BENEFITS: readonly string[] = [
  "Reach more customers",
  "Manage bookings",
  "Get paid on time",
  "Track your earnings",
];

const TRUST_POINTS: readonly { title: string; description: string }[] = [
  {
    title: "Secure payments",
    description: "Payments processed through a licensed provider.",
  },
  {
    title: "Verified businesses",
    description: "Every business is reviewed before going live.",
  },
  {
    title: "Support that responds",
    description: "Our team is one message away.",
  },
];

export default function LandingPage() {
  return (
    <>
      <Hero
        eyebrow="Nigeria's all-in-one platform"
        title="Discover, request, book, and pay — all in one place."
        subtitle="noLIDA connects people and businesses. Find what you need, offer what you do, and get paid — without leaving the app."
        primaryCta={{ label: "Create account", href: "/signup" }}
        secondaryCta={{ label: "Explore noLIDA", href: "/how-it-works" }}
      />

      <Section padding="lg">
        <FeatureGrid
          title="What you can do on noLIDA"
          subtitle="A social marketplace for everything you need."
          features={[
            {
              icon: <SearchIcon size={22} />,
              title: "Discover",
              description: "Find businesses, services, and products near you.",
            },
            {
              icon: <CommentIcon size={22} />,
              title: "Request",
              description: "Post what you need. Get responses from real businesses.",
            },
            {
              icon: <CheckIcon size={22} />,
              title: "Book & Pay",
              description: "Schedule a service. Pay securely inside the app.",
            },
            {
              icon: <StoreIcon size={22} />,
              title: "Sell",
              description: "List your business, sell products, manage everything.",
            },
          ]}
        />
      </Section>

      <Section variant="subtle" padding="lg">
        <StepsSection
          title="How it works"
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
        <div className="mk-home__business-grid">
          <div className="mk-home__business-copy">
            <h2 className="mk-home__business-title">
              Grow your business on noLIDA
            </h2>
            <p className="mk-home__business-text">
              List your services, answer requests from real customers, and get
              paid for the work you have already done. Everything happens in one
              place — no chasing, no guesswork.
            </p>
            <ul className="mk-home__business-list">
              {BUSINESS_BENEFITS.map((benefit) => (
                <li key={benefit} className="mk-home__business-item">
                  <span className="mk-home__business-check" aria-hidden="true">
                    <CheckIcon size={16} />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
            <Button as="link" href="/for-business" variant="inverse" size="lg">
              Grow with noLIDA
            </Button>
          </div>

          <Card className="mk-home__preview">
            <span className="mk-home__preview-badge">Coming soon</span>
            <p className="mk-home__preview-title">Business dashboard</p>
            <p className="mk-home__preview-text">
              Requests, bookings, and earnings in one view. Business dashboard
              preview coming soon.
            </p>
          </Card>
        </div>
      </Section>

      <Section padding="lg">
        <StatsRow
          stats={[
            { value: "5%", label: "Platform fee" },
            { value: "10%", label: "Business commission" },
            { value: "24/7", label: "Support" },
          ]}
        />
      </Section>

      <Section variant="subtle" padding="lg">
        <SectionHeading
          title="Built on trust"
          subtitle="The three things every noLIDA user can rely on."
        />
        <div className="mk-home__trust-grid">
          {TRUST_POINTS.map((point, index) => (
            <Card key={point.title} className="mk-home__trust-card">
              <span className="mk-home__trust-icon" aria-hidden="true">
                {index === 0 ? (
                  <WalletIcon size={22} />
                ) : index === 1 ? (
                  <StoreIcon size={22} />
                ) : (
                  <MessageIcon size={22} />
                )}
              </span>
              <h3 className="mk-home__trust-title">{point.title}</h3>
              <p className="mk-home__trust-text">{point.description}</p>
            </Card>
          ))}
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

