"use client";

import React from "react";
import Link from "next/link";
import { z } from "zod";
import { AuthPanel } from "@/components/auth/AuthPanel/AuthPanel";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { readRedirectTo } from "@/lib/api/envelope";
import "./LoginForm.css";

/**
 * Email-or-phone plus password.
 *
 * The identifier is not narrowed to an email pattern: noLIDA signs users in
 * with whichever they registered, so the field only rejects obviously empty or
 * overlong input and leaves real format rejection to the server.
 */
const LOGIN_SCHEMA = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your email or phone number")
    .max(254, "That is too long"),
  password: z.string().min(1, "Enter your password"),
});

type FieldErrors = Partial<Record<"identifier" | "password", string>>;

export interface LoginFormProps {
  /**
   * Absolute or app-relative path to send the user to after a successful
   * sign-in. The `/home` route is Phase 7 and 404s until then.
   */
  redirectTo?: string;
  /**
   * Heading tag for "Welcome back". Pass `"h2"` when a `HeroBlock` already
   * owns the page's `h1` (as it does on `/`).
   */
  headingLevel?: "h1" | "h2";
}

export function LoginForm({
  redirectTo = "/home",
  headingLevel = "h1",
}: LoginFormProps): React.JSX.Element {
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    const parsed = LOGIN_SCHEMA.safeParse({ identifier, password });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "identifier" || key === "password") {
          next[key] ??= issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      // The auth API is Phase 4C and does not exist yet, so this call is
      // expected to fail in the current build. It is written against the
      // agreed contract: { ok: true, data: { redirectTo } } on success.
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        setFormError("We couldn't sign you in. Please try again.");
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
      title="Welcome back"
      headingLevel={headingLevel}
      subtitle="Sign in to your noLIDA account."
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup">Create one</Link>
        </p>
      }
    >
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Input
          id="login-identifier"
          label="Email or phone number"
          type="text"
          autoComplete="username"
          inputMode="email"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          error={errors.identifier}
          disabled={submitting}
        />

        <div className="login-form__password-row">
          <Input
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            disabled={submitting}
          />

          <Link className="login-form__forgot" href="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthPanel>
  );
}

export default LoginForm;
