"use client";

import React from "react";
import Link from "next/link";
import { z } from "zod";
import { AuthPanel } from "@/components/auth/AuthPanel/AuthPanel";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { apiFetch } from "@/lib/client/api";
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
      // The response body is deliberately identical whether or not an account
      // exists for this identifier — revealing the difference would leak which
      // addresses are registered. A transport failure is different from "no
      // such account", so that case alone surfaces an error.
      const result = await apiFetch<unknown>("/api/auth/forgot-password", {
        method: "POST",
        body: parsed.data,
      });

      if (!result.ok) {
        setSubmitting(false);
        setError("Something went wrong. Please try again.");
        return;
      }

      // The code itself went out by email/SMS. `/reset-password` collects that
      // code together with the new password and is what consumes it — routing
      // through /verify first would spend the code before it can be used.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full load; the reset screen consumes the code fresh
      window.location.assign(
        `/reset-password?identifier=${encodeURIComponent(parsed.data.identifier)}`,
      );
    } catch {
      setSubmitting(false);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <AuthPanel
      title="Forgot your password?"
      headingLevel={headingLevel}
      subtitle="Enter your email or phone number and we'll send you a 6-digit code to choose a new password."
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
          Send code
        </Button>
      </form>
    </AuthPanel>
  );
}

export default ForgotPasswordForm;
