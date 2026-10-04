"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/Input/Input";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { apiFetch } from "@/lib/client/api";
import "./BusinessRequestFlow.css";

/**
 * The floor on the loading stage, in milliseconds.
 *
 * The API returns in well under a second, so without this the code would flash
 * on screen almost instantly and the step would be invisible. Three seconds is
 * long enough that the transition reads as "something happened" and short
 * enough that nobody is waiting on a fake spinner.
 *
 * It is a presentation decision made entirely in the browser: the server does
 * not wait, and nothing is faked about the work — the code genuinely exists
 * before this timer starts. See docs/BUSINESS-REQUEST.md for why it is here.
 */
const MIN_DELAY_MS = 3000;

type Stage = "form" | "loading" | "success" | "error";

interface RequestResponse {
  code: string;
  businessId: string;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


/**
 * The whole /list-your-business experience (Phase 7E).
 *
 * A four-stage state machine — form, loading, success, error — rather than a
 * redirect to a confirmation page. The code is the payoff of this screen, so it
 * belongs *on* this screen: navigating away and back to show it would mean
 * storing it somewhere (URL, state, a refetch) for no benefit.
 *
 * The code is a receipt, not a credential: the server has already attached it
 * to the user's business. Copying is offered because people expect to, but the
 * copy text says plainly that it is saved to their account and they do not need
 * to write it down. Nothing later in the flow reads it.
 */
export function BusinessRequestFlow(): React.JSX.Element {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("form");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Guards against setState after unmount: the user can navigate away
  // mid-flight, and React warns for every state update that lands after the
  // component is gone.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const name = businessName.trim();
    if (name.length < 2) {
      setError("Enter your business name (at least 2 characters).");
      return;
    }

    setError(null);
    setStage("loading");
    const startedAt = Date.now();

    const result = await apiFetch<RequestResponse>("/api/businesses/request", {
      method: "POST",
      body: { businessName: name, category, contactEmail, description },
    });

    // The floor is enforced regardless of what the server said. A slow response
    // only extends the wait; it is never shortened.
    await wait(Math.max(0, MIN_DELAY_MS - (Date.now() - startedAt)));
    if (!mounted.current) return;

    if (result.ok) {
      setCode(result.data.code);
      setStage("success");
      return;
    }

    setError(result.error.message);
    setStage("error");
  }

  async function handleCopy(): Promise<void> {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => {
        if (mounted.current) setCopied(false);
      }, 2000);
    } catch {
      // The Clipboard API needs a secure context and can be denied outright.
      // The code is on screen *and* already saved to their account, so a failed
      // copy is a no-op rather than an error — saying so is better than an
      // alert about something the user does not need.
      setCopied(false);
    }
  }

  if (stage === "loading") {
    return (
      <div className="biz-request biz-request--centered">
        <Spinner size="lg" />
        <h1 className="biz-request__title">Generating your code…</h1>
        <p className="biz-request__lede">Please hold on while we prepare your code.</p>
        {/* Decorative only: a CSS animation over a fixed duration, not real
            progress. `aria-hidden` so a screen reader is not told a percentage
            that means nothing. */}
        <div className="biz-request__progress" aria-hidden="true">
          <span className="biz-request__progress-bar" />
        </div>
      </div>
    );
  }

  if (stage === "success" && code) {
    return (
      <div className="biz-request biz-request--centered">
        <h1 className="biz-request__title">Your code is ready</h1>

        <Card className="biz-request__code-card">
          <code className="biz-request__code">{code}</code>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleCopy()}
            ariaLabel={copied ? "Code copied" : "Copy code"}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </Card>

        <p className="biz-request__lede">
          We&apos;ve saved this to your account. You don&apos;t need to write it
          down — just continue.
        </p>

        <Button
          type="button"
          fullWidth
          onClick={() => router.push("/my-business/submit")}
        >
          Continue to business details
        </Button>
      </div>
    );
  }

  return (
    <div className="biz-request">
      <h1 className="biz-request__title">List your business on noLIDA</h1>
      <p className="biz-request__lede">
        Tell us a few things about your business. You&apos;ll get an
        authorization code right away.
      </p>

      <Card className="biz-request__card">
        <form className="biz-request__form" onSubmit={handleSubmit} noValidate>
          <Input
            id="biz-request-name"
            label="Business name"
            required
            maxLength={120}
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
          />

          <Input
            id="biz-request-category"
            label="Category"
            placeholder="e.g. Photography"
            maxLength={60}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />

          <Input
            id="biz-request-email"
            label="Contact email"
            type="email"
            placeholder="you@example.com"
            maxLength={320}
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />

          <Textarea
            id="biz-request-description"
            label="Brief description"
            placeholder="What does your business do?"
            maxLength={500}
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          {error ? (
            <p className="biz-request__error" role="alert">
              {error}
            </p>
          ) : null}

          {stage === "error" ? (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => {
                setStage("form");
                setError(null);
              }}
            >
              Try again
            </Button>
          ) : null}

          <Button type="submit" fullWidth>
            Request code
          </Button>
        </form>
      </Card>
    </div>
  );
}

