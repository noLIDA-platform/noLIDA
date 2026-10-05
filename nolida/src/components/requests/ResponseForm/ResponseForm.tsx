"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { apiFetch } from "@/lib/client/api";
import {
  MAX_MESSAGE_LEN,
  MAX_NOTE_LEN,
  MIN_MESSAGE_LEN,
} from "@/lib/requests/constants";
import type { ResponseView } from "@/lib/requests/types";
import "./ResponseForm.css";

export interface ResponseFormProps {
  requestId: string;
  /**
   * Whether the signed-in viewer owns an APPROVED business. Decided on the server
   * and passed in, because it is a question about the session that the client
   * cannot answer honestly.
   */
  hasApprovedBusiness: boolean;
  /** Shown in the prompt, so the business knows which of theirs is replying. */
  businessName?: string | null;
  onSubmitted?: (response: ResponseView) => void;
}

/**
 * Send an offer on somebody else's request.
 *
 * The business is NEVER sent from here. The server resolves it from the session
 * and re-checks that it is APPROVED, so this form could not answer as a business
 * it does not own even if it were modified.
 *
 * A refresher rather than a redirect: the customer does not need to navigate to
 * see their own request, but the accepted/declined state of every other offer is
 * also on this page and only the server knows it.
 */
export function ResponseForm({
  requestId,
  hasApprovedBusiness,
  businessName,
  onSubmitted,
}: ResponseFormProps): React.JSX.Element {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [availability, setAvailability] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasApprovedBusiness) {
    return (
      <div className="response-form__blocked">
        <p className="response-form__blocked-title">
          Only businesses can respond to requests.
        </p>
        <p className="response-form__blocked-body">
          Your business needs to be approved before you can send offers. Once it
          is, every open request becomes available to you.
        </p>
        <Button size="sm" variant="secondary" as="link" href="/list-your-business">
          <Store size={16} />
          <span>List your business</span>
        </Button>
      </div>
    );
  }

  const trimmed = message.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_MESSAGE_LEN;
  const parsedPrice = price.trim() === "" ? null : Number(price);
  const priceInvalid = parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0);

  const submit = async (): Promise<void> => {
    if (busy) return;
    setError(null);

    if (trimmed.length < MIN_MESSAGE_LEN) {
      setError(`Say a little more — at least ${MIN_MESSAGE_LEN} characters.`);
      return;
    }
    if (priceInvalid) {
      setError("Enter a price as a whole number, like 45000.");
      return;
    }

    setBusy(true);
    const result = await apiFetch<{ response: ResponseView }>(
      `/api/requests/${requestId}/responses`,
      {
        method: "POST",
        body: {
          message: trimmed,
          priceEstimate: parsedPrice,
          availabilityNote: availability.trim() || null,
        },
      }
    );

    if (!result.ok) {
      setError(result.error.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    setMessage("");
    setPrice("");
    setAvailability("");
    if (onSubmitted) onSubmitted(result.data.response);
    else router.refresh();
  };

  return (
    <form
      className="response-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h3 className="response-form__title">
        Send an offer
        {businessName ? (
          <span className="response-form__as"> as {businessName}</span>
        ) : null}
      </h3>

      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        maxLength={MAX_MESSAGE_LEN}
        rows={5}
        placeholder="What you would do, when you could start, and anything the customer should know."
        className="response-form__message"
      />
      <p className="response-form__counter">
        {trimmed.length < MIN_MESSAGE_LEN
          ? `${MIN_MESSAGE_LEN - trimmed.length} more characters needed`
          : `${trimmed.length} / ${MAX_MESSAGE_LEN}`}
      </p>

      <div className="response-form__row">
        <Input
          type="number"
          inputMode="numeric"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="45000"
          ariaLabel="Your price estimate in naira"
        />
        <Input
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
          maxLength={MAX_NOTE_LEN}
          placeholder="Available tomorrow morning"
          ariaLabel="Availability note"
        />
      </div>
      <p className="response-form__hint">
        Leave the price blank if you need to see the job first — plenty of work
        can only be quoted after a look.
      </p>

      {error ? (
        <p className="response-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="md"
        variant="primary"
        loading={busy}
        disabled={tooShort || priceInvalid}
        fullWidth
      >
        Send offer
      </Button>
    </form>
  );
}