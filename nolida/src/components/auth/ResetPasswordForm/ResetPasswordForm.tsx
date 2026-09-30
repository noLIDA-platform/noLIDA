"use client";

import React from "react";
import Link from "next/link";
import { z } from "zod";
import { AuthPanel } from "@/components/auth/AuthPanel/AuthPanel";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { apiFetch } from "@/lib/client/api";
import "./ResetPasswordForm.css";

const CODE_LENGTH = 6;

const RESET_SCHEMA = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, `Enter the ${CODE_LENGTH}-digit code`),
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

type FieldErrors = Partial<
  Record<"code" | "password" | "confirmPassword", string>
>;

export interface ResetPasswordFormProps {
  /**
   * Email or phone the reset code was sent to. `/forgot-password` hands it over
   * on the query string; without it there is nothing to reset against.
   */
  identifier?: string | null;
  headingLevel?: "h1" | "h2";
}

export function ResetPasswordForm({
  identifier = null,
  headingLevel = "h1",
}: ResetPasswordFormProps): React.JSX.Element {
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // The identifier arrives from /forgot-password. Someone landing here
  // directly has nothing to submit, so we say so instead of firing a doomed
  // request.
  if (!identifier) {
    return (
      <AuthPanel
        title="Reset link needed"
        headingLevel={headingLevel}
        showSocial={false}
        footer={
          <p>
            <Link href="/">Back to sign in</Link>
          </p>
        }
      >
        <Alert variant="error">
          This password reset page is missing its details. Request a new code and
          we&apos;ll bring you back here with your details filled in.
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

    const parsed = RESET_SCHEMA.safeParse({ code, password, confirmPassword });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          (key === "code" || key === "password" || key === "confirmPassword") &&
          !next[key]
        ) {
          next[key] = issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const result = await apiFetch<unknown>("/api/auth/reset-password", {
        method: "POST",
        body: {
          identifier,
          code: parsed.data.code,
          newPassword: parsed.data.password,
        },
      });

      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }

      // `/` reads `?reset=1` and shows a "password reset, please log in"
      // banner. Full navigation also drops any stale client state.
      window.location.assign("/?reset=1");
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
      subtitle={`Choose a new password for ${identifier}.`}
      showSocial={false}
      footer={
        <p>
          Didn&apos;t get the code?{" "}
          <Link href="/forgot-password">Request a new one</Link>
          {" · "}
          <Link href="/">Back to sign in</Link>
        </p>
      }
    >
      <form className="reset-password__form" onSubmit={handleSubmit} noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Input
          id="reset-code"
          label="Verification code"
          type="text"
          autoComplete="one-time-code"
          inputMode="numeric"
          placeholder="000000"
          hint="The 6-digit code we just sent you."
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))
          }
          error={errors.code}
          disabled={submitting}
        />

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
