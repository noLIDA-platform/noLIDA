import Link from "next/link";
import { Logo } from "@/components/brand/Logo/Logo";
import { Container } from "@/components/ui/Container/Container";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton/WhatsAppButton";
import "./SiteFooter.css";

interface FooterLink {
  readonly label: string;
  readonly href: string;
}

interface FooterColumn {
  readonly title: string;
  readonly links: readonly FooterLink[];
}

const COLUMNS: readonly FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "How It Works", href: "/how-it-works" },
      { label: "For Business", href: "/for-business" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Help Center", href: "/help" },
      { label: "Contact", href: "/help#contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <Container size="lg" className="site-footer__inner">
        <div className="site-footer__brand">
          <Logo size="sm" />
          <p className="site-footer__tagline">
            Discover, request, book, and pay — all in one place.
          </p>
          <p className="site-footer__copyright">© 2026 noLIDA</p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} className="site-footer__column" aria-label={column.title}>
            <h2 className="site-footer__heading">{column.title}</h2>
            <ul className="site-footer__list">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="site-footer__link">
                    {link.label}
                  </Link>
                </li>
              ))}
              {column.title === "Company" ? (
                <li>
                  <WhatsAppButton
                    size="sm"
                    label="Contact noLIDA on WhatsApp"
                    message="Hi noLIDA, I have a question."
                  />
                </li>
              ) : null}
            </ul>
          </nav>
        ))}
      </Container>
    </footer>
  );
}
