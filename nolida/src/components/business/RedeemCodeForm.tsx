"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RedeemCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/businesses/redeem-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message ?? "Unable to redeem your business code.");
      }

      router.push("/my-business/submit");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to redeem your business code.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, maxWidth: 560 }}>
      <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
        Business authorization code
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="NLDA-ABCD-EFGH"
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(99, 102, 241, 0.3)",
            fontSize: 16,
            background: "rgba(15, 23, 42, 0.02)",
          }}
        />
      </label>

      {error ? (
        <div style={{ color: "#DC2626", fontSize: 14 }}>{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !code.trim()}
        style={{
          padding: "12px 18px",
          borderRadius: 12,
          border: "none",
          background: "#6366F1",
          color: "#fff",
          fontWeight: 700,
          cursor: isSubmitting ? "wait" : "pointer",
          opacity: isSubmitting || !code.trim() ? 0.7 : 1,
        }}
      >
        {isSubmitting ? "Checking code…" : "Redeem code"}
      </button>
    </form>
  );
}
