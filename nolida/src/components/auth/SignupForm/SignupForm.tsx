"use client";

import React from "react";
import Link from "next/link";
import { z } from "zod";
import { AuthPanel } from "@/components/auth/AuthPanel/AuthPanel";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { readRedirectTo } from "@/lib/api/envelope";
import "./SignupForm.css";

/** Nigerian mobile numbers in local (0…) or international (+234…) form. */
const PHONE_PATTERN = /^(?:\+?234|0)[789]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The server is the authority on all of this (Phase 4C). These rules exist so
 * an obvious mistake is caught without a round trip. The 8-character minimum
 * matches the documented password policy.
 */
const SIGNUP_SCHEMA = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name")
      .max(120, "That is too long"),
    identifier: z
      .string()
      .trim()
      .min(1, "Enter your email or phone number")
      .max(254, "That is too long")
      .refine(
        (value) => EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value),
        "Enter a valid email or Nigerian phone number",
      ),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(128, "That is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    // The checkbox is part of the schema so that one `safeParse` owns every
    // rule and the error lands on the right field like any other.
    acceptTerms: z
      .boolean()
      .refine((value) => value, "You must accept the terms to continue"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FieldErrors = Partial<
  Record<
    "fullName" | "identifier" | "password" | "confirmPassword" | "acceptTerms",
    string
  >
>;

export interface SignupFormProps {
  /** Where to send the user once the account exists. */
  redirectTo?: string;
  headingLevel?: "h1" | "h2";
}

export function SignupForm({
  redirectTo = "/verify",
  headingLevel = "h1",
}: SignupFormProps): React.JSX.Element {
  const [values, setValues] = React.useState({
    fullName: "",
    identifier: "",
    password: "",
    confirmPassword: "",
  });
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const setField =
    (field: keyof typeof values) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const next = event.target.value;
      setValues((current) => ({ ...current, [field]: next }));
    };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    const parsed = SIGNUP_SCHEMA.safeParse({ ...values, acceptTerms });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in next)) {
          next[key as keyof FieldErrors] = issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      // Phase 4C endpoint, written against the agreed contract. It does not
      // exist yet, so this is expected to report a failure in this build.
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: parsed.data.fullName,
          identifier: parsed.data.identifier,
          password: parsed.data.password,
        }),
      });

      if (!response.ok) {
        setFormError("We couldn't create your account. Please try again.");
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
      title="Create your account"
      headingLevel={headingLevel}
      subtitle="Join noLIDA. It's free."
      footer={
        <p>
          Already have an account? <Link href="/">Sign in</Link>
        </p>
      }
    >
      <form className="signup-form" onSubmit={handleSubmit} noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Input
          id="signup-name"
          label="Full name"
          type="text"
          autoComplete="name"
          value={values.fullName}
          onChange={setField("fullName")}
          error={errors.fullName}
          disabled={submitting}
        />

        <Input
          id="signup-identifier"
          label="Email or phone number"
          type="text"
          autoComplete="username"
          inputMode="email"
          hint="We'll send a verification code here."
          value={values.identifier}
          onChange={setField("identifier")}
          error={errors.identifier}
          disabled={submitting}
        />

        <Input
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={values.password}
          onChange={setField("password")}
          error={errors.password}
          disabled={submitting}
        />

        <Input
          id="signup-confirm-password"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={setField("confirmPassword")}
          error={errors.confirmPassword}
          disabled={submitting}
        />

        <div className="signup-form__terms">
          <label className="signup-form__check">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              disabled={submitting}
              className="signup-form__checkbox"
              aria-invalid={errors.acceptTerms ? "true" : undefined}
              aria-describedby={
                errors.acceptTerms ? "signup-terms-error" : undefined
              }
            />
            <span>
              I agree to the <Link href="/terms">Terms</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </span>
          </label>

          {errors.acceptTerms ? (
            <span
              id="signup-terms-error"
              role="alert"
              className="signup-form__terms-error"
            >
              {errors.acceptTerms}
            </span>
          ) : null}
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthPanel>
  );
}

export default SignupForm;
