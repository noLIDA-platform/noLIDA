import React from "react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container/Container";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { Card } from "@/components/ui/Card/Card";
import { Badge } from "@/components/ui/Badge/Badge";
import { Alert } from "@/components/ui/Alert/Alert";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { Link } from "@/components/ui/Link/Link";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import {
  House,
  Search,
  CirclePlus,
  MessageSquare,
  User,
  Bell,
  ShoppingCart,
  Heart,
  Share2,
  MessageCircle,
  Bookmark,
  Settings,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  CircleAlert,
  Wallet,
  Store,
  LogOut,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon/Icon";
import { InteractiveDemo } from "./InteractiveDemo";
import { Logo } from "@/components/brand/Logo/Logo";
import "./page.css";

export const metadata: Metadata = {
  title: "Design System — noLIDA",
  description: "Internal design primitives showcase and token verification",
  robots: { index: false, follow: false },
};


export default function DesignPage(): React.JSX.Element {
  return (
    <main className="design-page">
      <Container size="lg">
        {/* Dev only banner */}
        <div className="design-banner">
          <Icon as={CircleAlert} size={18} />
          <span>
            <strong>Dev-Only Showcase:</strong> This route is for internal design token and UI primitive verification. It is not linked anywhere in the consumer navigation.
          </span>
        </div>

        <header className="design-header">
          <h1 className="design-title">Design System & Primitives</h1>
          <p className="design-subtitle">
            Phase 1 UI primitives for noLIDA — responsive, accessible, dark/light theme ready.
          </p>
        </header>

        {/* 1. Color Palette */}
        <section className="design-section" id="colors">
          <h2 className="design-section__title">1. Color Tokens & Palette</h2>
          <p className="design-section__desc">
            Single-sourced semantic tokens mapping to locked design foundations.
          </p>
          <div className="design-grid-swatches">
            <div className="design-swatch">
              <div className="design-swatch__color" style={{ backgroundColor: "var(--brand-primary)" }} />
              <div className="design-swatch__info">
                <p className="design-swatch__name">brand-primary / color-primary</p>
                <p className="design-swatch__val">#6366f1 (Indigo)</p>
              </div>
            </div>
            <div className="design-swatch">
              <div className="design-swatch__color" style={{ backgroundColor: "var(--brand-secondary)" }} />
              <div className="design-swatch__info">
                <p className="design-swatch__name">brand-secondary</p>
                <p className="design-swatch__val">#8b5cf6 (Violet)</p>
              </div>
            </div>
            <div className="design-swatch">
              <div className="design-swatch__color" style={{ backgroundColor: "var(--brand-accent)" }} />
              <div className="design-swatch__info">
                <p className="design-swatch__name">brand-accent</p>
                <p className="design-swatch__val">#ec4899 (Pink)</p>
              </div>
            </div>
            <div className="design-swatch">
              <div className="design-swatch__color" style={{ backgroundColor: "var(--color-bg)" }} />
              <div className="design-swatch__info">
                <p className="design-swatch__name">bg-primary / color-bg</p>
                <p className="design-swatch__val">#0f172a</p>
              </div>
            </div>
            <div className="design-swatch">
              <div className="design-swatch__color" style={{ backgroundColor: "var(--color-bg-subtle)" }} />
              <div className="design-swatch__info">
                <p className="design-swatch__name">bg-secondary / subtle</p>
                <p className="design-swatch__val">#1e293b</p>
              </div>
            </div>
            <div className="design-swatch">
              <div className="design-swatch__color" style={{ backgroundColor: "var(--color-border)" }} />
              <div className="design-swatch__info">
                <p className="design-swatch__name">border-subtle / color-border</p>
                <p className="design-swatch__val">#334155</p>
              </div>
            </div>
            <div className="design-swatch">
              <div className="design-swatch__color" style={{ backgroundColor: "var(--color-success)" }} />
              <div className="design-swatch__info">
                <p className="design-swatch__name">color-success</p>
                <p className="design-swatch__val">#16a34a</p>
              </div>
            </div>
            <div className="design-swatch">
              <div className="design-swatch__color" style={{ backgroundColor: "var(--color-warning)" }} />
              <div className="design-swatch__info">
                <p className="design-swatch__name">color-warning</p>
                <p className="design-swatch__val">#f59e0b</p>
              </div>
            </div>
            <div className="design-swatch">
              <div className="design-swatch__color" style={{ backgroundColor: "var(--color-error)" }} />
              <div className="design-swatch__info">
                <p className="design-swatch__name">color-error</p>
                <p className="design-swatch__val">#dc2626</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Typography Scale */}
        <section className="design-section" id="typography">
          <h2 className="design-section__title">2. Typography Scale</h2>
          <div className="design-type-scale">
            <div className="design-type-row">
              <span className="design-type-meta">--text-5xl (3rem)</span>
              <span style={{ fontSize: "var(--text-5xl)", fontWeight: "var(--weight-extrabold)" }}>Headline 5XL</span>
            </div>
            <div className="design-type-row">
              <span className="design-type-meta">--text-4xl (2.25rem)</span>
              <span style={{ fontSize: "var(--text-4xl)", fontWeight: "var(--weight-bold)" }}>Display 4XL</span>
            </div>
            <div className="design-type-row">
              <span className="design-type-meta">--text-3xl (1.875rem)</span>
              <span style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)" }}>Heading 3XL</span>
            </div>
            <div className="design-type-row">
              <span className="design-type-meta">--text-2xl (1.5rem)</span>
              <span style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)" }}>Heading 2XL</span>
            </div>
            <div className="design-type-row">
              <span className="design-type-meta">--text-xl (1.25rem)</span>
              <span style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>Heading XL</span>
            </div>
            <div className="design-type-row">
              <span className="design-type-meta">--text-lg (1.125rem)</span>
              <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-medium)" }}>Subhead LG</span>
            </div>
            <div className="design-type-row">
              <span className="design-type-meta">--text-base (1rem)</span>
              <span style={{ fontSize: "var(--text-base)" }}>Body Regular Base</span>
            </div>
            <div className="design-type-row">
              <span className="design-type-meta">--text-sm (0.875rem)</span>
              <span style={{ fontSize: "var(--text-sm)" }}>Body Small SM</span>
            </div>
            <div className="design-type-row">
              <span className="design-type-meta">--text-xs (0.75rem)</span>
              <span style={{ fontSize: "var(--text-xs)" }}>Caption XS</span>
            </div>
          </div>
        </section>

        {/* 3. Spacing Scale */}
        <section className="design-section" id="spacing">
          <h2 className="design-section__title">3. Spacing Scale</h2>
          <div className="design-spacing-table">
            <div className="design-spacing-row">
              <span className="design-spacing-label">--space-1 (4px)</span>
              <div className="design-spacing-bar" style={{ width: "var(--space-1)" }} />
            </div>
            <div className="design-spacing-row">
              <span className="design-spacing-label">--space-2 (8px)</span>
              <div className="design-spacing-bar" style={{ width: "var(--space-2)" }} />
            </div>
            <div className="design-spacing-row">
              <span className="design-spacing-label">--space-3 (12px)</span>
              <div className="design-spacing-bar" style={{ width: "var(--space-3)" }} />
            </div>
            <div className="design-spacing-row">
              <span className="design-spacing-label">--space-4 (16px)</span>
              <div className="design-spacing-bar" style={{ width: "var(--space-4)" }} />
            </div>
            <div className="design-spacing-row">
              <span className="design-spacing-label">--space-5 (20px)</span>
              <div className="design-spacing-bar" style={{ width: "var(--space-5)" }} />
            </div>
            <div className="design-spacing-row">
              <span className="design-spacing-label">--space-6 (24px)</span>
              <div className="design-spacing-bar" style={{ width: "var(--space-6)" }} />
            </div>
            <div className="design-spacing-row">
              <span className="design-spacing-label">--space-8 (32px)</span>
              <div className="design-spacing-bar" style={{ width: "var(--space-8)" }} />
            </div>
          </div>
        </section>

        {/* 4. Shadows & Radii */}
        <section className="design-section" id="shadows-radii">
          <h2 className="design-section__title">4. Shadows & Radii</h2>
          <div className="design-row">
            <div className="design-shadow-card" style={{ boxShadow: "var(--shadow-sm)", borderRadius: "var(--radius-sm)" }}>
              <strong>Shadow SM</strong>
              <div>radius-sm (4px)</div>
            </div>
            <div className="design-shadow-card" style={{ boxShadow: "var(--shadow-md)", borderRadius: "var(--radius-md)" }}>
              <strong>Shadow MD</strong>
              <div>radius-md (8px)</div>
            </div>
            <div className="design-shadow-card" style={{ boxShadow: "var(--shadow-lg)", borderRadius: "var(--radius-lg)" }}>
              <strong>Shadow LG</strong>
              <div>radius-lg (16px)</div>
            </div>
          </div>
        </section>

        {/* 5. Buttons */}
        <section className="design-section" id="buttons">
          <h2 className="design-section__title">5. Buttons</h2>
          <p className="design-section__desc">Variants and states</p>
          <div className="design-row">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button variant="primary" loading>Loading</Button>
          </div>
          <p className="design-section__desc" style={{ marginTop: "var(--space-2)" }}>Sizes</p>
          <div className="design-row">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        {/* 6. Inputs & Form Controls */}
        <section className="design-section" id="inputs">
          <h2 className="design-section__title">6. Input & Textarea</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--space-4)" }}>
            <Input label="Default Input" placeholder="Enter full name" />
            <Input label="With Helper Hint" hint="We will not share your email." placeholder="user@nolida.io" />
            <Input label="Error State" error="This username is already taken" defaultValue="taken_handle" />
            <Input label="Disabled State" disabled defaultValue="locked_value" />
          </div>
          <div style={{ marginTop: "var(--space-4)" }}>
            <Textarea
              label="Product Description"
              hint="Describe condition, size, and shipping terms"
              placeholder="Start typing..."
              rows={3}
            />
          </div>
        </section>

        {/* 7. Cards */}
        <section className="design-section" id="cards">
          <h2 className="design-section__title">7. Cards</h2>
          <div className="design-row" style={{ alignItems: "stretch" }}>
            <Card variant="default" style={{ flex: 1, minWidth: "260px" }}>
              <h4 style={{ margin: "0 0 var(--space-2) 0" }}>Default Bordered Card</h4>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                Uses 1px solid border and clean surface background.
              </p>
            </Card>
            <Card variant="elevated" style={{ flex: 1, minWidth: "260px" }}>
              <h4 style={{ margin: "0 0 var(--space-2) 0" }}>Elevated Shadow Card</h4>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                Applies standard box shadow for depth and elevation.
              </p>
            </Card>
          </div>
        </section>

        {/* 8. Badges */}
        <section className="design-section" id="badges">
          <h2 className="design-section__title">8. Badges</h2>
          <div className="design-row">
            <Badge variant="default">Default Neutral</Badge>
            <Badge variant="brand">Brand Active</Badge>
            <Badge variant="success">Verified Purchase</Badge>
            <Badge variant="warning">Low Stock</Badge>
            <Badge variant="error">Sold Out</Badge>
          </div>
        </section>

        {/* 9. Spinners */}
        <section className="design-section" id="spinners">
          <h2 className="design-section__title">9. Spinners</h2>
          <div className="design-row" style={{ alignItems: "center" }}>
            <Spinner size="sm" />
            <span>Small (16px)</span>
            <Spinner size="md" />
            <span>Medium (24px)</span>
            <Spinner size="lg" />
            <span>Large (32px)</span>
          </div>
        </section>

        {/* 10. Links */}
        <section className="design-section" id="links">
          <h2 className="design-section__title">10. Links</h2>
          <div className="design-row">
            <Link href="#colors" variant="default">Primary Link (#colors)</Link>
            <Link href="#typography" variant="muted">Muted Link (#typography)</Link>
          </div>
        </section>

        {/* 11. Icon Set (20 Lucide icons, rendered through the Icon primitive) */}
        <section className="design-section" id="icons">
          <h2 className="design-section__title">11. Icon Set (20 Lucide Icons)</h2>
          <p className="design-section__desc">Rendered through the Icon primitive at stroke-width 1.75, inherits current text color.</p>
          <div className="design-grid-icons">
            <div className="design-icon-card"><Icon as={House} size={24} /><span className="design-icon-name">House</span></div>
            <div className="design-icon-card"><Icon as={Search} size={24} /><span className="design-icon-name">Search</span></div>
            <div className="design-icon-card"><Icon as={CirclePlus} size={24} /><span className="design-icon-name">CirclePlus</span></div>
            <div className="design-icon-card"><Icon as={MessageSquare} size={24} /><span className="design-icon-name">MessageSquare</span></div>
            <div className="design-icon-card"><Icon as={User} size={24} /><span className="design-icon-name">User</span></div>
            <div className="design-icon-card"><Icon as={Bell} size={24} /><span className="design-icon-name">Bell</span></div>
            <div className="design-icon-card"><Icon as={ShoppingCart} size={24} /><span className="design-icon-name">ShoppingCart</span></div>
            <div className="design-icon-card"><Icon as={Heart} size={24} /><span className="design-icon-name">Heart</span></div>
            <div className="design-icon-card"><Icon as={Share2} size={24} /><span className="design-icon-name">Share2</span></div>
            <div className="design-icon-card"><Icon as={MessageCircle} size={24} /><span className="design-icon-name">MessageCircle</span></div>
            <div className="design-icon-card"><Icon as={Bookmark} size={24} /><span className="design-icon-name">Bookmark</span></div>
            <div className="design-icon-card"><Icon as={Settings} size={24} /><span className="design-icon-name">Settings</span></div>
            <div className="design-icon-card"><Icon as={ChevronRight} size={24} /><span className="design-icon-name">ChevronRight</span></div>
            <div className="design-icon-card"><Icon as={ChevronDown} size={24} /><span className="design-icon-name">ChevronDown</span></div>
            <div className="design-icon-card"><Icon as={Check} size={24} /><span className="design-icon-name">Check</span></div>
            <div className="design-icon-card"><Icon as={X} size={24} /><span className="design-icon-name">X</span></div>
            <div className="design-icon-card"><Icon as={CircleAlert} size={24} /><span className="design-icon-name">CircleAlert</span></div>
            <div className="design-icon-card"><Icon as={Wallet} size={24} /><span className="design-icon-name">Wallet</span></div>
            <div className="design-icon-card"><Icon as={Store} size={24} /><span className="design-icon-name">Store</span></div>
            <div className="design-icon-card"><Icon as={LogOut} size={24} /><span className="design-icon-name">LogOut</span></div>
          </div>
        </section>

        {/* 12. Composite Primitives & Interactive Demo */}
        <section className="design-section" id="composite">
          <h2 className="design-section__title">12. Composite Primitives & Interactive Test</h2>
          <Card variant="default">
            <EmptyState
              icon={<Icon as={Store} size={44} />}
              title="No Listings Found"
              description="Your shop is currently empty. Create your first product listing to start selling across the marketplace."
              action={<Button variant="primary">Create First Listing</Button>}
            />
          </Card>

          <div style={{ marginTop: "var(--space-6)" }}>
            <h3 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-3)" }}>Live Interactive Playground</h3>
            <InteractiveDemo />
          </div>
        </section>

        {/* 13. Brand Logo */}
        <section className="design-section" id="logo">
          <h2 className="design-section__title">13. Brand Logo</h2>
          <p className="design-section__desc">
            <code>&lt;Logo /&gt;</code> from <code>@/components/brand/Logo/</code>. Sizes
            sm/md/lg, variants default/mono-light/mono-dark.
          </p>

          <h3 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-3)" }}>Sizes</h3>
          <div className="design-row" style={{ alignItems: "flex-end" }}>
            <Logo size="sm" />
            <Logo size="md" />
            <Logo size="lg" />
          </div>

          <h3 style={{ fontSize: "var(--text-lg)", margin: "var(--space-6) 0 var(--space-3)" }}>Variants</h3>
          <div className="design-row">
            <Logo size="md" variant="default" />
            <Logo size="md" variant="mono-dark" />
          </div>
          <div className="design-swatch-band" style={{ marginTop: "var(--space-4)" }}>
            <Logo size="md" variant="mono-light" />
            <Logo size="sm" variant="mono-light" />
          </div>

          <h3 style={{ fontSize: "var(--text-lg)", margin: "var(--space-6) 0 var(--space-3)" }}>Icon only</h3>
          <div className="design-row">
            <Logo size="sm" showWordmark={false} />
            <Logo size="md" showWordmark={false} />
            <Logo size="lg" showWordmark={false} />
          </div>
        </section>

        {/* 14. Gradients */}
        <section className="design-section" id="gradients">
          <h2 className="design-section__title">14. Gradients</h2>
          <p className="design-section__desc">
            <code>--color-gradient</code> (brand flow) and{" "}
            <code>--color-gradient-hero</code> (darkened). Gradients are reserved
            for brand moments — never for buttons, inputs, or daily UI.
          </p>

          <h3 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-3)" }}>Brand gradient</h3>
          <div className="design-gradient-band">cyan → indigo → violet → magenta</div>

          <h3 style={{ fontSize: "var(--text-lg)", margin: "var(--space-6) 0 var(--space-3)" }}>Hero gradient</h3>
          <div className="design-gradient-band design-gradient-band--hero">deep teal → indigo → violet → magenta</div>

          <h3 style={{ fontSize: "var(--text-lg)", margin: "var(--space-6) 0 var(--space-3)" }}>Gradient glow</h3>
          <div className="design-row">
            <div className="design-gradient-chip">--shadow-glow</div>
            <div className="design-gradient-chip design-gradient-chip--radial">radial glow</div>
          </div>
        </section>

        {/* 15. Navy surfaces */}
        <section className="design-section" id="navy">
          <h2 className="design-section__title">15. Navy Surfaces & Inverse Buttons</h2>
          <p className="design-section__desc">
            <code>--color-navy</code> is the icon background and the dark-mode page
            surface. <code>inverse</code> and <code>outline-inverse</code> button
            variants are the only approved controls on top of it.
          </p>

          <div className="design-navy-panel">
            <p className="design-navy-panel__label" style={{ color: "var(--text-inverse)" }}>
              --color-navy · #0a0e27
            </p>
            <div className="design-row" style={{ marginTop: "var(--space-4)" }}>
              <Button variant="inverse">Inverse</Button>
              <Button variant="outline-inverse">Outline inverse</Button>
              <Button as="link" href="#navy" variant="inverse" size="sm">
                Inverse link
              </Button>
            </div>
          </div>

          <h3 style={{ fontSize: "var(--text-lg)", margin: "var(--space-6) 0 var(--space-3)" }}>
            Navy subtle
          </h3>
          <div className="design-navy-panel design-navy-panel--subtle">
            <p className="design-navy-panel__label">--color-navy-subtle · #0f1535</p>
          </div>
        </section>
        {/* 16. Alert */}
        <section className="design-section" id="alert">
          <h2 className="design-section__title">16. Alert</h2>
          <p className="design-section__desc">
            Inline message banner for form-level errors, confirmations and
            notices. Colours come from the semantic tint tokens, so dark mode is
            handled centrally. Errors default to <code>role=&quot;alert&quot;</code>;
            the other variants default to <code>role=&quot;status&quot;</code>.
          </p>

          <div className="design-stack">
            <Alert variant="error">
              We couldn&apos;t sign you in. Please try again.
            </Alert>
            <Alert variant="success">
              Your password has been updated.
            </Alert>
            <Alert variant="info">
              If an account exists for that address, we&apos;ve sent a reset
              link.
            </Alert>
          </div>
        </section>
      </Container>
    </main>
  );
}

