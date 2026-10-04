"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { AuthPanel } from "@/components/auth/AuthPanel/AuthPanel";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { PasswordInput } from "@/components/ui/PasswordInput/PasswordInput";
import { apiFetch } from "@/lib/client/api";
import "./LoginForm.css";

/**
 * Email-or-phone plus password.
 *
 * The identifier is not narrowed to an email pattern: NOlida signs users in
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
   * sign-in. Defaults to `/home`, which renders the signed-in app shell.
   */
  redirectTo?: string;
  /**
   * Heading tag for "Welcome back". Pass `"h2"` when a `HeroBlock` already
   * owns the page's `h1` (as it does on `/`).
   */
  headingLevel?: "h1" | "h2";
}

interface LoginResponse {
  userId: string;
  expiresAt: string;
}

function LoginFormInner({
  redirectTo = "/home",
  headingLevel = "h1",
}: LoginFormProps): React.JSX.Element {
  const searchParams = useSearchParams();
  const resetParam = searchParams.get("reset");
  // Phase 7F: set by the signup page when the dev OTP bypass created the
  // account but the automatic sign-in failed. Distinct from `reset`, which means
  // a password was just changed.
  const registeredParam = searchParams.get("registered");
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const showResetBanner = resetParam === "1";
  const showRegisteredBanner = registeredParam === "1";

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
      const trimmed = parsed.data.identifier.trim();
      const body = trimmed.includes("@")
        ? { email: trimmed, password: parsed.data.password }
        : { phone: trimmed, password: parsed.data.password };

      const result = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body,
      });

      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }

      // A full document load, not router.push: the first request after a login
      // must re-render the shell on the server with the new session cookie.
      window.location.assign(redirectTo);
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
      subtitle="Sign in to your NOlida account."
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup">Create one</Link>
        </p>
      }
    >
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        {showResetBanner ? (
          <Alert variant="success">
            Password reset. Please log in with your new password.
          </Alert>
        ) : null}
        {showRegisteredBanner ? (
          <Alert variant="success">
            Account created. Please log in.
          </Alert>
        ) : null}
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
          <PasswordInput
            id="login-password"
            label="Password"
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

export function LoginForm(props: LoginFormProps): React.JSX.Element {
  return (
    <Suspense>
      <LoginFormInner {...props} />
    </Suspense>
  );
}

export default LoginForm;

