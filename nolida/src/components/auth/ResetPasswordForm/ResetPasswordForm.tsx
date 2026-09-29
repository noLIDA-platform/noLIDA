"use client";

import React from "react";
import Link from "next/link";
import { z } from "zod";
import { AuthPanel } from "@/components/auth/AuthPanel/AuthPanel";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { readRedirectTo } from "@/lib/api/envelope";
import "./ResetPasswordForm.css";

const RESET_SCHEMA = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(128, "That is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export interface ResetPasswordFormProps {
  /**
   * Reset token from the email link. The page reads it from the query string;
   * without one the form renders a "link is invalid" state instead.
   */
  token?: string | null;
  redirectTo?: string;
  headingLevel?: "h1" | "h2";
}

export function ResetPasswordForm({
  token = null,
  redirectTo = "/",
  headingLevel = "h1",
}: ResetPasswordFormProps): React.JSX.Element {
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<
    Partial<Record<"password" | "confirmPassword", string>>
  >({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // No token means the mail client stripped it or the user typed the URL.
  // Validating on the server would be pointless — there is nothing to send.
  if (!token) {
    return (
      <AuthPanel
        title="Reset link needed"
        headingLevel={headingLevel}
        showSocial={false}
        footer={
          <p>
            <Link href="/forgot-password">Request a new link</Link>
          </p>
        }
      >
        <Alert variant="error">
          This password reset link is missing or incomplete. Please request a
          new one.
        </Alert>
      </AuthPanel>
    );
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    const parsed = RESET_SCHEMA.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const next: Partial<Record<"password" | "confirmPassword", string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "password" || key === "confirmPassword") && !next[key]) {
          next[key] = issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      // Phase 4C endpoint; expected to fail in this build.
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: parsed.data.password }),
      });

      if (!response.ok) {
        setFormError(
          "We couldn't reset your password. The link may have expired.",
        );
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

  return (
    <AuthPanel
      title="Set a new password"
      headingLevel={headingLevel}
      subtitle="Choose a password you haven't used before."
      showSocial={false}
      footer={
        <p>
          <Link href="/">Back to sign in</Link>
        </p>
      }
    >
      <form className="reset-password__form" onSubmit={handleSubmit} noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Input
          id="reset-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          disabled={submitting}
        />

        <Input
          id="reset-confirm-password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
          disabled={submitting}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Reset password
        </Button>
      </form>
    </AuthPanel>
  );
}

export default ResetPasswordForm;
