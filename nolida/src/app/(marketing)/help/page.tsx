import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero/Hero";
import { Section } from "@/components/marketing/Section/Section";
import { Accordion } from "@/components/marketing/Accordion/Accordion";
import type { AccordionItem } from "@/components/marketing/Accordion/Accordion";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton/WhatsAppButton";
import "../pages.css";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Answers to the questions NOlida users ask most, plus direct contact with our team.",
};

interface FaqGroup {
  readonly title: string;
  readonly items: readonly AccordionItem[];
}

const FAQ_GROUPS: readonly FaqGroup[] = [
  {
    title: "Getting started",
    items: [
      {
        question: "How do I create an account?",
        answer:
          "Tap Create account and sign up with your email address or phone number. It takes a few seconds, and searching is free once you are in.",
      },
      {
        question: "What can I post?",
        answer:
          "Anything you need done, or something you want to sell — a service, a product, or a repair. Add photos and your location so the right businesses can find it.",
      },
    ],
  },
  {
    title: "For businesses",
    items: [
      {
        question: "How do I get my business listed?",
        answer:
          "Contact the NOlida team. We send you a business code, you submit your details, we review them, and your listing goes live.",
      },
      {
        question: "What does it cost to be listed?",
        answer:
          "Nothing. Listing is free. We only take a 10% commission on completed jobs, plus the 5% platform fee the customer pays at booking.",
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        question: "When do I get paid?",
        answer:
          "Once a job is complete and confirmed by both sides, the balance is released to the business wallet for payout.",
      },
      {
        question: "Are payments safe?",
        answer:
          "Payments are processed through a licensed provider. Money only moves when both sides have agreed, and support can step in if a job is disputed.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <Hero
        eyebrow="Help Center"
        title="Answers, all in one place"
        subtitle="The questions we get asked most — and a way to reach a human when you still need one."
      />

      <Section padding="lg">
        <div className="pg-stack">
          {FAQ_GROUPS.map((group) => (
            <section key={group.title} className="pg-faq-group">
              <h2 className="pg-faq-group__title">{group.title}</h2>
              <Accordion items={group.items} />
            </section>
          ))}
        </div>
      </Section>

      <Section variant="navy" padding="lg">
        <div className="pg-contact" id="contact">
          <h2 className="mk-cta__title">Still need help?</h2>
          <p className="pg-contact__hint">
            Our team is one message away. Send us a WhatsApp message and we will
            get back to you.
          </p>
          <div className="pg-contact__whatsapp">
            <WhatsAppButton
              inverse
              label="Get account help on WhatsApp"
              message="Hi NOlida, I need help with my account."
            />
            <span>Message our support team</span>
          </div>
        </div>
      </Section>
    </>
  );
}
