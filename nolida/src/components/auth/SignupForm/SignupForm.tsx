"use client";

import React from "react";
import Link from "next/link";
import { z } from "zod";
import { AuthPanel } from "@/components/auth/AuthPanel/AuthPanel";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { apiFetch } from "@/lib/client/api";
import "./SignupForm.css";

/** Nigerian mobile numbers in local (0…) or international (+234…) form. */
const PHONE_PATTERN = /^(?:\+?234|0)[789]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignupMethod = "email" | "phone";

const CONTACT_SCHEMA = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your email or phone number")
    .max(254, "That is too long"),
});

const PASSWORD_SCHEMA = z.object({
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(128, "That is too long"),
  acceptTerms: z
    .boolean()
    .refine((value) => value, "You must accept the terms to continue"),
});

type ContactError = string | undefined;
type PasswordErrors = Partial<Record<"password" | "acceptTerms", string>>;

export interface SignupFormProps {
  headingLevel?: "h1" | "h2";
}

interface RegisterResponse {
  userId: string;
  identifier: string;
  identifierType: "EMAIL" | "PHONE";
}

function methodOf(identifier: string, method: SignupMethod): boolean {
  return method === "email"
    ? EMAIL_PATTERN.test(identifier)
    : PHONE_PATTERN.test(identifier);
}

export function SignupForm({
  headingLevel = "h1",
}: SignupFormProps): React.JSX.Element {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [method, setMethod] = React.useState<SignupMethod>("email");
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [contactError, setContactError] = React.useState<ContactError>(undefined);
  const [passwordErrors, setPasswordErrors] = React.useState<PasswordErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const identifierLabel =
    method === "email" ? "Email address" : "Phone number";

  const handleMethodChange = (next: SignupMethod): void => {
    setMethod(next);
    setContactError(undefined);
    setFormError(null);
  };

  const handleStep1Next = (): void => {
    setFormError(null);

    const parsed = CONTACT_SCHEMA.safeParse({ identifier });
    if (!parsed.success) {
      setContactError(
        parsed.error.issues[0]?.message ?? "Enter your email or phone number",
      );
      return;
    }

    const trimmed = parsed.data.identifier.trim();
    if (!methodOf(trimmed, method)) {
      setContactError(
        method === "email"
          ? "Enter a valid email address"
          : "Enter a valid Nigerian phone number",
      );
      return;
    }

    setContactError(undefined);
    setIdentifier(trimmed);
    setStep(2);
  };

  const handleStep2Submit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    const parsed = PASSWORD_SCHEMA.safeParse({ password, acceptTerms });
    if (!parsed.success) {
      const next: PasswordErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "password" || key === "acceptTerms") && !next[key]) {
          next[key] = issue.message;
        }
      }
      setPasswordErrors(next);
      return;
    }

    setPasswordErrors({});
    setSubmitting(true);

    try {
      const body =
        method === "email"
          ? { email: identifier, password: parsed.data.password }
          : { phone: identifier, password: parsed.data.password };

      const result = await apiFetch<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body,
      });

      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }

      window.location.assign(
        `/verify?identifier=${encodeURIComponent(identifier)}&purpose=REGISTER`,
      );
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <AuthPanel
        title="Create your account"
        headingLevel={headingLevel}
        subtitle="Sign up in seconds."
        footer={
          <p>
            Already have an account? <Link href="/">Sign in</Link>
          </p>
        }
      >
        <div className="signup-form">
          {formError ? <Alert variant="error">{formError}</Alert> : null}

          <div
            className="signup-form__methods"
            role="group"
            aria-label="Sign up with"
          >
            <button
              type="button"
              className={
                method === "email"
                  ? "signup-form__method signup-form__method--active"
                  : "signup-form__method"
              }
              aria-pressed={method === "email"}
              onClick={() => handleMethodChange("email")}
            >
              Email
            </button>
            <button
              type="button"
              className={
                method === "phone"
                  ? "signup-form__method signup-form__method--active"
                  : "signup-form__method"
              }
              aria-pressed={method === "phone"}
              onClick={() => handleMethodChange("phone")}
            >
              Phone
            </button>
          </div>

          <Input
            id="signup-identifier"
            label={identifierLabel}
            type={method === "email" ? "email" : "tel"}
            autoComplete={method === "email" ? "email" : "tel"}
            inputMode="email"
            placeholder={
              method === "email" ? "you@example.com" : "+234 800 000 0000"
            }
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value);
              setContactError(undefined);
            }}
            error={contactError}
            disabled={submitting}
          />

          <Button type="button" size="lg" fullWidth onClick={handleStep1Next}>
            Continue
          </Button>
        </div>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Choose a password"
      headingLevel={headingLevel}
      subtitle={`For ${identifier}`}
      footer={
        <p>
          Already have an account? <Link href="/">Sign in</Link>
        </p>
      }
    >
      <form className="signup-form" onSubmit={handleStep2Submit} noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <p className="signup-form__edit">
          <button
            type="button"
            className="signup-form__edit-btn"
            onClick={() => setStep(1)}
            disabled={submitting}
          >
            Use a different {method === "email" ? "email" : "phone number"}
          </button>
        </p>

        <Input
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={passwordErrors.password}
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
              aria-invalid={passwordErrors.acceptTerms ? "true" : undefined}
              aria-describedby={
                passwordErrors.acceptTerms ? "signup-terms-error" : undefined
              }
            />
            <span>
              I agree to the <Link href="/terms">Terms</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </span>
          </label>

          {passwordErrors.acceptTerms ? (
            <span
              id="signup-terms-error"
              role="alert"
              className="signup-form__terms-error"
            >
              {passwordErrors.acceptTerms}
            </span>
          ) : null}
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Create account
        </Button>

        <Button
          type="button"
          variant="ghost"
          fullWidth
          disabled={submitting}
          onClick={() => setStep(1)}
        >
          Back
        </Button>
      </form>
    </AuthPanel>
  );
}

export default SignupForm;
