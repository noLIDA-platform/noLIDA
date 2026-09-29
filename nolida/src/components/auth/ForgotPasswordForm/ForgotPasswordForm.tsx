"use client";

import React from "react";
import Link from "next/link";
import { z } from "zod";
import { AuthPanel } from "@/components/auth/AuthPanel/AuthPanel";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import "./ForgotPasswordForm.css";

const IDENTIFIER_SCHEMA = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your email or phone number")
    .max(254, "That is too long"),
});

export interface ForgotPasswordFormProps {
  headingLevel?: "h1" | "h2";
}

export function ForgotPasswordForm({
  headingLevel = "h1",
}: ForgotPasswordFormProps): React.JSX.Element {
  const [identifier, setIdentifier] = React.useState("");
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (submitting) return;

    const parsed = IDENTIFIER_SCHEMA.safeParse({ identifier });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter your details");
      return;
    }

    setError(undefined);
    setSubmitting(true);

    try {
      // Phase 4C endpoint; expected to fail in this build. The response is
      // ignored on purpose: revealing whether an account exists would leak
      // which addresses are registered.
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
    } catch {
      // Swallowed for the same reason — the user is told the same thing
      // whether or not the request succeeded.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <AuthPanel
        title="Check your inbox"
        headingLevel={headingLevel}
        showSocial={false}
        footer={
          <p>
            Remembered it? <Link href="/">Back to sign in</Link>
          </p>
        }
      >
        <div className="forgot-password__sent">
          <Alert variant="info">
            If an account exists for {identifier}, we&apos;ve sent a link to
            reset your password. The link expires in 30 minutes.
          </Alert>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => setSent(false)}
          >
            Use a different email or phone
          </Button>
        </div>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Forgot your password?"
      headingLevel={headingLevel}
      subtitle="Enter your email or phone number and we'll send you a reset link."
      showSocial={false}
      footer={
        <p>
          Remembered it? <Link href="/">Back to sign in</Link>
        </p>
      }
    >
      <form className="forgot-password__form" onSubmit={handleSubmit} noValidate>
        <Input
          id="forgot-identifier"
          label="Email or phone number"
          type="text"
          autoComplete="username"
          inputMode="email"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          error={error}
          disabled={submitting}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Send reset link
        </Button>
      </form>
    </AuthPanel>
  );
}

export default ForgotPasswordForm;
