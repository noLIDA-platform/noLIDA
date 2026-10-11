"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import { apiFetch } from "@/lib/client/api";
import "./FirstLoginTour.css";

const STEP_COUNT = 3;

/**
 * First-login tour (Phase 10.2): a 3-step modal shown once, on the user's
 * first visit to /home after registration.
 *
 * Rendered by the /home Server Component only when the profile's
 * `onboarding_completed_at` is null AND the user has never posted — so no
 * established user ever sees it retroactively. Dismissal (final step or
 * Skip) PATCHes `/api/profiles/me` with `{ onboarding_completed: true }`,
 * which stamps the column; a failed save still closes the tour rather than
 * trapping the user behind a modal they have already answered.
 *
 * Full-screen sheet on mobile, centred card on desktop. Fade + slide
 * transitions; dot pagination; Skip top-right.
 */
export function FirstLoginTour(): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  const complete = async (): Promise<void> => {
    setSaving(true);
    // Fire-and-forget against the user's patience: the tour closes whatever
    // the server says. A failed stamp means the tour may reappear once, not
    // that the user is stuck behind it now.
    await apiFetch("/api/profiles/me", {
      method: "PATCH",
      body: { onboarding_completed: true },
    });
    setDismissed(true);
  };

  if (dismissed) return <></>;

  return (
    <div
      className="tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="tour-card" key={step}>
        <button
          type="button"
          className="tour-card__skip"
          onClick={() => void complete()}
          disabled={saving}
        >
          Skip
        </button>

        {step === 0 ? (
          <div className="tour-step">
            <p className="tour-step__kicker">Step 1 of 3</p>
            <h2 id="tour-title" className="tour-step__title">
              Welcome to NOLIda
            </h2>
            <p className="tour-step__body">
              NOLIda connects you with trusted local businesses — discover
              services, post requests, and get offers from businesses near
              you.
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="tour-step">
            <p className="tour-step__kicker">Step 2 of 3</p>
            <h2 id="tour-title" className="tour-step__title">
              Ask for anything
            </h2>
            <p className="tour-step__body">
              Need a repair, a ride, or a quote? Post a request and approved
              businesses will respond with offers.
            </p>
            <Link href="/requests/new" className="tour-step__cta">
              Post your first request
            </Link>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="tour-step">
            <p className="tour-step__kicker">Step 3 of 3</p>
            <h2 id="tour-title" className="tour-step__title">
              List your business
            </h2>
            <p className="tour-step__body">
              Offer a service or sell products? Put your business in front of
              people already looking for it.
            </p>
            <Link href="/list-your-business" className="tour-step__cta">
              I have a business
            </Link>
          </div>
        ) : null}

        <div
          className="tour-card__dots"
          role="tablist"
          aria-label="Tour progress"
        >
          {Array.from({ length: STEP_COUNT }, (_, index) => (
            <span
              key={index}
              role="tab"
              aria-selected={index === step}
              aria-label={`Step ${index + 1} of ${STEP_COUNT}`}
              className={[
                "tour-card__dot",
                index === step ? "tour-card__dot--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          ))}
        </div>

        <div className="tour-card__actions">
          {step === STEP_COUNT - 1 ? (
            <>
              <Button
                variant="ghost"
                onClick={() => void complete()}
                disabled={saving}
              >
                Maybe later
              </Button>
              <Button onClick={() => void complete()} disabled={saving}>
                {saving ? "Saving…" : "Get started"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setStep(step + 1)} disabled={saving}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
