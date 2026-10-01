/**
 * Mobile-only welcome screen for `/` (Phase 4C).
 *
 * Noise-inspired: dark navy canvas, one large logo, one headline, one
 * primary action, one secondary sign-in link. No feature lists, no icons,
 * no paragraphs.
 *
 * Two views, both rendered here as client state (not routes):
 * - "welcome" (View A): the navy canvas. "Sign in" switches to login.
 * - "login" (View B): the standard `LoginForm` under a Back link that
 *   returns to the welcome view.
 *
 * Visibility is decided by CSS media queries in `src/app/(auth)/home.css`
 * (`display: none` below/above 768px) — never by JavaScript viewport
 * detection. `display: none` removes the hidden variant from the tab order
 * and the accessibility tree, so only one view is ever interactive.
 *
 * Client component because the view switch is `useState`. Focus moves to
 * the top of the new view inside an effect that only runs after a switch
 * (never on mount), so keyboard and screen-reader users land on the view
 * they just chose.
 */

"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm/LoginForm";
import "./HomeMobileClient.css";

export type HomeMobileView = "welcome" | "login";

export interface HomeMobileClientProps {
  className?: string;
}

export function HomeMobileClient({
  className,
}: HomeMobileClientProps): React.JSX.Element {
  const [view, setView] = React.useState<HomeMobileView>("welcome");
  const welcomeRef = React.useRef<HTMLElement>(null);
  const loginRef = React.useRef<HTMLElement>(null);
  const isFirstRender = React.useRef(true);

  // Move focus to the top of the newly shown view. Skipped on mount so the
  // page does not steal focus on load. This effect never sets state, so it
  // stays clear of the `set-state-in-effect` rule.
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const target = view === "welcome" ? welcomeRef.current : loginRef.current;
    target?.focus({ preventScroll: true });
  }, [view]);

  const classes = ["home-mobile", className ?? ""].filter(Boolean).join(" ");

  if (view === "login") {
    return (
      <div className={classes}>
        <section
          ref={loginRef}
          tabIndex={-1}
          aria-label="Sign in to noLIDA"
          className="home-mobile__view home-mobile--login"
        >
          <button
            type="button"
            onClick={() => setView("welcome")}
            className="home-mobile__back"
            aria-label="Back to welcome"
          >
            ← Back
          </button>
          <LoginForm headingLevel="h1" redirectTo="/home" />
        </section>
      </div>
    );
  }

  return (
    <div className={classes}>
      <section
        ref={welcomeRef}
        tabIndex={-1}
        aria-label="Welcome to noLIDA"
        className="home-mobile__view home-mobile--welcome"
      >
        <div className="home-mobile__collage" aria-hidden="true">
          <img
            src="/images/login-1.png"
            alt=""
            className="home-mobile__collage-img home-mobile__collage-img--1"
          />
          <img
            src="/images/login-2.png"
            alt=""
            className="home-mobile__collage-img home-mobile__collage-img--2"
          />
          <img
            src="/images/login-3.png"
            alt=""
            className="home-mobile__collage-img home-mobile__collage-img--3"
          />
          <img
            src="/images/login-4.png"
            alt=""
            className="home-mobile__collage-img home-mobile__collage-img--4"
          />
        </div>
        <div className="home-mobile__overlay" aria-hidden="true" />
        <Link href="/explore" className="home-mobile__explore">
          Explore noLIDA →
        </Link>
        <div className="home-mobile__glow" aria-hidden="true" />
        <div className="home-mobile__content">
          <Image
            src="/branding/logo-app-icon-512.png"
            alt="noLIDA"
            width={512}
            height={512}
            className="home-mobile__logo"
            priority
          />
          <h1 className="home-mobile__headline">
            Discover, request, book, and pay.
          </h1>
          <p className="home-mobile__subtitle">
            One app for everything you need.
          </p>
        </div>
        <div className="home-mobile__actions">
          <Link href="/signup" className="home-mobile__primary">
            Get started
          </Link>
          <button
            type="button"
            onClick={() => setView("login")}
            className="home-mobile__secondary"
          >
            Already have an account? Sign in
          </button>
        </div>
      </section>
    </div>
  );
}

export default HomeMobileClient;
