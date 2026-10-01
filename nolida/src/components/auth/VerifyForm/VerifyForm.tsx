"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { AuthPanel } from "@/components/auth/AuthPanel/AuthPanel";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { apiFetch } from "@/lib/client/api";
import "./VerifyForm.css";

const CODE_LENGTH = 6;

const CODE_SCHEMA = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, `Enter the ${CODE_LENGTH}-digit code`),
});

/**
 * Purposes this screen understands. `RESET` is listed because old links still
 * arrive here carrying it, but it is never submitted from here: a reset code is
 * consumed by `POST /api/auth/reset-password` together with the new password, so
 * checking it here first would burn the only code the user has and leave the
 * reset page with nothing to submit. The render body hands RESET onward instead.
 */
type OtpPurpose = "REGISTER" | "RESET" | "VERIFY_CONTACT";

const VERIFIABLE_PURPOSES: readonly OtpPurpose[] = [
  "REGISTER",
  "VERIFY_CONTACT",
];

export interface VerifyFormProps {
  headingLevel?: "h1" | "h2";
}

interface VerifyResponse {
  userId: string;
}

function VerifyFormInner({
  headingLevel = "h1",
}: VerifyFormProps): React.JSX.Element {
  const searchParams = useSearchParams();
  const identifier = searchParams.get("identifier") ?? "";
  const rawPurpose = searchParams.get("purpose");
  const purpose: OtpPurpose | null = VERIFIABLE_PURPOSES.includes(
    rawPurpose as OtpPurpose,
  )
    ? (rawPurpose as OtpPurpose)
    : null;
  const isResetHandoff = rawPurpose === "RESET";

  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // The identifier and purpose arrive from /signup. Without them there is
  // nothing to verify against, so the form says so instead of firing a request
  // the server will reject.
  if (!identifier || (!purpose && !isResetHandoff)) {
    return (
      <AuthPanel
        title="Check your inbox"
        headingLevel={headingLevel}
        showSocial={false}
        footer={
          <p>
            Wrong details? <Link href="/signup">Start over</Link>
          </p>
        }
      >
        <Alert variant="error">
          This verification link is missing its details. Please request a new
          code from the sign-up page.
        </Alert>
      </AuthPanel>
    );
  }

  // `/forgot-password` sends people straight to `/reset-password`, but older
  // links carry `purpose=RESET` here. A reset code is spent along with the new
  // password on that page, so this screen only hands the user onward.
  if (!purpose) {
    return (
      <AuthPanel
        title="Set a new password"
        headingLevel={headingLevel}
        subtitle={`Enter the ${CODE_LENGTH}-digit code we sent to ${identifier}.`}
        showSocial={false}
        footer={
          <p>
            Didn&apos;t get it?{" "}
            <Link href="/forgot-password">Request a new code</Link>
          </p>
        }
      >
        <Alert variant="info">
          Password reset codes are used once, together with your new password.
        </Alert>
        <Button
          as="link"
          href={`/reset-password?identifier=${encodeURIComponent(identifier)}`}
          size="lg"
          fullWidth
        >
          Continue to reset
        </Button>
      </AuthPanel>
    );
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    const parsed = CODE_SCHEMA.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter the code");
      return;
    }

    setError(undefined);
    setSubmitting(true);

    try {
      const result = await apiFetch<VerifyResponse>("/api/auth/verify-otp", {
        method: "POST",
        body: { identifier, code: parsed.data.code, purpose },
      });

      if (!result.ok) {
        if (result.error.code === "OTP_LOCKED") {
          setFormError(
            "Too many incorrect attempts. This code is now locked — please start over or contact support.",
          );
        } else {
          setFormError(result.error.message);
        }
        return;
      }

      // Verification leaves a session cookie behind, so this is a full document
      // load rather than a push: the shell must render with that cookie, and a
      // fresh load discards any client cache built while signed out.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full load; the shell must render with the new cookie
      window.location.assign("/home");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPanel
      title="Verify your account"
      headingLevel={headingLevel}
      subtitle={`We sent a ${CODE_LENGTH}-digit code to ${identifier}.`}
      showSocial={false}
      footer={
        <p>
          Wrong details? <Link href="/signup">Start over</Link>
        </p>
      }
    >
      <form className="verify-form" onSubmit={handleSubmit} noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Input
          id="verify-code"
          label="Verification code"
          type="text"
          autoComplete="one-time-code"
          inputMode="numeric"
          placeholder="000000"
          value={code}
          onChange={(event) =>
            // Digits only: pasted codes often carry spaces or dashes.
            setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))
          }
          error={error}
          disabled={submitting}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Verify
        </Button>

        <p className="verify-form__resend">
          Didn&apos;t get the code? <Link href="/signup">Start over</Link>
        </p>
      </form>
    </AuthPanel>
  );
}

/**
 * `useSearchParams` needs a Suspense boundary for static rendering, so the
 * interactive part is split out and wrapped here.
 */
export function VerifyForm(props: VerifyFormProps): React.JSX.Element {
  return (
    <Suspense>
      <VerifyFormInner {...props} />
    </Suspense>
  );
}

export default VerifyForm;


