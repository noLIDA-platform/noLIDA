"use client";

import React from "react";
import Link from "next/link";
import { z } from "zod";
import { AuthPanel } from "@/components/auth/AuthPanel/AuthPanel";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { readRedirectTo } from "@/lib/api/envelope";
import "./VerifyForm.css";

const CODE_LENGTH = 6;

const CODE_SCHEMA = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, `Enter the ${CODE_LENGTH}-digit code`),
});

export interface VerifyFormProps {
  /**
   * Where the code was sent. This phase has no session yet, so the value is
   * only used for display copy; Phase 4C will read it from the session.
   */
  identifier?: string | null;
  /** Where to send the user once the code is accepted. */
  redirectTo?: string;
  headingLevel?: "h1" | "h2";
}

export function VerifyForm({
  identifier = null,
  redirectTo = "/home",
  headingLevel = "h1",
}: VerifyFormProps): React.JSX.Element {
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setNotice(null);

    const parsed = CODE_SCHEMA.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter the code");
      return;
    }

    setError(undefined);
    setSubmitting(true);

    try {
      // Phase 4C endpoint; expected to fail in this build.
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        setFormError("That code didn't work. Check it and try again.");
        return;
      }

      const payload: unknown = await response.json();
      window.location.assign(readRedirectTo(payload, redirectTo));
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (resending) return;

    setFormError(null);
    setNotice(null);
    setResending(true);

    try {
      // Phase 4C endpoint; expected to fail in this build.
      const response = await fetch("/api/auth/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      setNotice(
        response.ok
          ? "A new code is on its way."
          : "We couldn't send a new code. Please try again.",
      );
    } catch {
      setNotice("We couldn't send a new code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthPanel
      title="Verify your account"
      headingLevel={headingLevel}
      subtitle={
        identifier
          ? `We sent a ${CODE_LENGTH}-digit code to ${identifier}.`
          : `Enter the ${CODE_LENGTH}-digit code we sent you.`
      }
      showSocial={false}
      footer={
        <p>
          Wrong details? <Link href="/signup">Start over</Link>
        </p>
      }
    >
      <form className="verify-form" onSubmit={handleSubmit} noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        {notice ? <Alert variant="info">{notice}</Alert> : null}

        <Input
          id="verify-code"
          label="Verification code"
          type="text"
          autoComplete="one-time-code"
          inputMode="numeric"
          value={code}
          onChange={(event) =>
            // Digits only: the field is numeric and pasted codes often carry
            // spaces or dashes.
            setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))
          }
          error={error}
          disabled={submitting}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Verify
        </Button>

        {!submitting ? (
          <Button
            type="button"
            variant="ghost"
            fullWidth
            loading={resending}
            onClick={() => {
              void handleResend();
            }}
          >
            Resend code
          </Button>
        ) : null}
      </form>
    </AuthPanel>
  );
}

export default VerifyForm;
