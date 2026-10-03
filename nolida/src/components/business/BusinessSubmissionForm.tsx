"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type BusinessFormMode = "submit" | "edit";

export interface BusinessSubmissionFormProps {
  /**
   * `"submit"` (default) is the Phase 7 flow: save the draft, then queue it for
   * review and go to the pending screen.
   *
   * `"edit"` is the Phase 8C dashboard flow for an already-APPROVED business:
   * save the profile and stay put. No submission is queued, because re-entering
   * review on every typo would mean an approved business could never be
   * corrected without waiting on an admin again.
   */
  mode?: BusinessFormMode;
  /** Prefill from the stored business; without it the form starts empty. */
  initialValues?: {
    name?: string | null;
    category?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    location?: string | null;
    description?: string | null;
  };
}

export function BusinessSubmissionForm({
  mode = "submit",
  initialValues,
}: BusinessSubmissionFormProps): React.JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initialValues?.name ?? "",
    category: initialValues?.category ?? "",
    phone: initialValues?.phone ?? "",
    email: initialValues?.email ?? "",
    website: initialValues?.website ?? "",
    location: initialValues?.location ?? "",
    description: initialValues?.description ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const saveResponse = await fetch("/api/businesses/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          phone: form.phone,
          email: form.email,
          website: form.website,
          location: form.location,
          description: form.description,
        }),
      });

      const savePayload = await saveResponse.json();
      if (!saveResponse.ok || !savePayload.ok) {
        throw new Error(savePayload?.error?.message ?? "Unable to save your business details.");
      }

      // Edit mode stops here. The save above already persisted the change, and
      // an approved business must not drop back into PENDING_REVIEW — the
      // public profile stays live with the correction applied.
      if (mode === "edit") {
        setSaved(true);
        return;
      }

      const submitResponse = await fetch("/api/businesses/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            ...form,
            submittedAt: new Date().toISOString(),
          },
        }),
      });

      const submitPayload = await submitResponse.json();
      if (!submitResponse.ok || !submitPayload.ok) {
        throw new Error(submitPayload?.error?.message ?? "Unable to submit your business for review.");
      }

      router.push("/my-business/pending");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : mode === "edit"
            ? "Unable to save your business profile."
            : "Unable to submit your business for review.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18, maxWidth: 760 }}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
          Business name
          <input name="name" value={form.name} onChange={handleChange} required style={inputStyle} />
        </label>

        <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
          Category
          <input name="category" value={form.category} onChange={handleChange} style={inputStyle} />
        </label>

        <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
          Phone
          <input name="phone" value={form.phone} onChange={handleChange} style={inputStyle} />
        </label>

        <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} />
        </label>

        <label style={{ display: "grid", gap: 8, fontWeight: 600, gridColumn: "1 / -1" }}>
          Website
          <input name="website" value={form.website} onChange={handleChange} style={inputStyle} />
        </label>

        <label style={{ display: "grid", gap: 8, fontWeight: 600, gridColumn: "1 / -1" }}>
          Location
          <input name="location" value={form.location} onChange={handleChange} style={inputStyle} />
        </label>

        <label style={{ display: "grid", gap: 8, fontWeight: 600, gridColumn: "1 / -1" }}>
          Business description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={6}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>
      </div>

      {error ? <div style={{ color: "#DC2626", fontSize: 14 }}>{error}</div> : null}

      {saved ? (
        <div style={{ color: "#16a34a", fontSize: 14, fontWeight: 600 }}>
          Saved. Your public profile is updated.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !form.name.trim()}
        style={{
          padding: "12px 18px",
          borderRadius: 12,
          border: "none",
          background: "#6366F1",
          color: "#fff",
          fontWeight: 700,
          cursor: isSubmitting ? "wait" : "pointer",
          opacity: isSubmitting || !form.name.trim() ? 0.7 : 1,
        }}
      >
        {isSubmitting
          ? "Saving…"
          : mode === "edit"
            ? "Save changes"
            : "Submit for review"}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(99, 102, 241, 0.3)",
  fontSize: 16,
  background: "rgba(15, 23, 42, 0.02)",
};
