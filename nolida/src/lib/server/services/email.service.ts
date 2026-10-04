import { Resend } from "resend";

export type OtpPurpose = "REGISTER" | "LOGIN" | "RESET" | "VERIFY_CONTACT";

const SUBJECTS: Record<OtpPurpose, string> = {
  REGISTER: "Verify your NOlida account",
  VERIFY_CONTACT: "Verify your NOlida account",
  RESET: "Reset your NOlida password",
  LOGIN: "Your NOlida login code",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(code: string, purpose: OtpPurpose, expiryMinutes: number): string {
  const safeCode = escapeHtml(code);
  const line =
    purpose === "RESET"
      ? "Use this code to reset your password. It expires soon."
      : "Use this code to verify it is really you. It expires soon.";
  return `<!doctype html>
<html><body style="font-family:sans-serif;line-height:1.6;color:#111">
<p style="font-weight:800;letter-spacing:-0.03em">NOlida</p>
<p>${line}</p>
<p style="font-family:monospace;font-size:2rem;font-weight:700;letter-spacing:0.2em">${safeCode}</p>
<p style="color:#6b7280;font-size:0.875rem">Expires in ${expiryMinutes} minutes. If you did not request this, ignore this email.</p>
</body></html>`;
}

export async function sendOtpEmail(input: {
  to: string;
  code: string;
  purpose: OtpPurpose;
  expiryMinutes?: number;
}): Promise<{ sent: boolean; devFallback: boolean }> {
  const expiryMinutes = input.expiryMinutes ?? 10;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    // Dev fallback: no mail provider configured. Log the full body so the
    // test script can read the code. NEVER runs in production, where the
    // code below refuses to print the OTP itself.
    if (process.env.NODE_ENV === "production") {
      console.log(
        `=== DEV EMAIL === to=${input.to} purpose=${input.purpose} (code withheld in production)`
      );
    } else {
      console.log(`=== DEV EMAIL === to=${input.to} purpose=${input.purpose}`);
      console.log(`code=${input.code} expires_in_min=${expiryMinutes}`);
    }
    return { sent: false, devFallback: true };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: SUBJECTS[input.purpose],
    html: buildHtml(input.code, input.purpose, expiryMinutes),
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
  return { sent: true, devFallback: false };
}
