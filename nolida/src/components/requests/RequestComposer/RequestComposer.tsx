"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { ImageUploader } from "@/components/ui/ImageUploader/ImageUploader";
import { apiFetch } from "@/lib/client/api";
import {
  MAX_ATTACHMENTS,
  MAX_DESCRIPTION_LEN,
  MAX_LOCATION_LEN,
  MAX_TITLE_LEN,
  MIN_DESCRIPTION_LEN,
  MIN_TITLE_LEN,
  REQUEST_URGENCIES,
  REQUEST_URGENCY_HINTS,
  REQUEST_URGENCY_LABELS,
  type RequestUrgency,
} from "@/lib/requests/constants";
import type { RequestView } from "@/lib/requests/types";
import type { Category } from "@/types/catalog";
import "./RequestComposer.css";

export interface RequestComposerProps {
  /** Seeded server-side, so the select is populated before anything is fetched. */
  categories: Category[];
  onCreated?: (request: RequestView) => void;
}

/**
 * Post a request.
 *
 * Four labelled sections on one page rather than a wizard. A wizard makes people
 * page through steps to discover what is being asked, and a request is four
 * short answers — somebody who needs an AC repairer tomorrow should not click
 * through a carousel to say so. The headings do the grouping the steps would.
 *
 * Every bound shown here comes from `@/lib/requests/constants`, the same numbers
 * the server validates against. A counter that disagrees with the limit it is
 * counting towards is worse than no counter at all.
 */
export function RequestComposer({
  categories,
  onCreated,
}: RequestComposerProps): React.JSX.Element {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [urgency, setUrgency] = useState<RequestUrgency>("NORMAL");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  const minNumber = budgetMin.trim() === "" ? null : Number(budgetMin);
  const maxNumber = budgetMax.trim() === "" ? null : Number(budgetMax);

  const budgetInvalid =
    (minNumber !== null && (!Number.isFinite(minNumber) || minNumber < 0)) ||
    (maxNumber !== null && (!Number.isFinite(maxNumber) || maxNumber < 0)) ||
    (minNumber !== null && maxNumber !== null && maxNumber < minNumber);

  const ready =
    trimmedTitle.length >= MIN_TITLE_LEN &&
    trimmedDescription.length >= MIN_DESCRIPTION_LEN &&
    !budgetInvalid &&
    !busy;

  // Today's date in the browser's own calendar, so the native date picker cannot
  // offer a deadline that has already passed.
  const today = new Date().toISOString().slice(0, 10);

  const submit = async (): Promise<void> => {
    if (!ready) return;
    setBusy(true);
    setError(null);

    const result = await apiFetch<{ request: RequestView }>("/api/requests", {
      method: "POST",
      body: {
        title: trimmedTitle,
        description: trimmedDescription,
        categoryId: categoryId || null,
        location: location.trim() || null,
        deadline: deadline || null,
        urgency,
        budgetMin: minNumber,
        budgetMax: maxNumber,
        attachments: attachments.length > 0 ? attachments : null,
      },
    });

    if (!result.ok) {
      setError(result.error.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    if (onCreated) onCreated(result.data.request);
    else router.push(`/requests/${result.data.request.id}`);
  };

  return (
    <form
      className="request-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <fieldset className="request-composer__section">
        <legend className="request-composer__legend">What do you need?</legend>

        <label className="request-composer__label" htmlFor="request-title">
          Title
        </label>
        <Input
          id="request-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_TITLE_LEN}
          placeholder="AC repairer needed in Lagos tomorrow"
        />
        <p className="request-composer__counter">
          {trimmedTitle.length < MIN_TITLE_LEN
            ? `${MIN_TITLE_LEN - trimmedTitle.length} more characters`
            : `${trimmedTitle.length} / ${MAX_TITLE_LEN}`}
        </p>

        <label className="request-composer__label" htmlFor="request-description">
          Describe the job
        </label>
        <Textarea
          id="request-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_DESCRIPTION_LEN}
          rows={6}
          placeholder="What is wrong, what you have tried, and anything a business should know before quoting."
        />
        <p className="request-composer__counter">
          {trimmedDescription.length < MIN_DESCRIPTION_LEN
            ? `${MIN_DESCRIPTION_LEN - trimmedDescription.length} more characters`
            : `${trimmedDescription.length} / ${MAX_DESCRIPTION_LEN}`}
        </p>

        <label className="request-composer__label" htmlFor="request-category">
          Category
        </label>
        <select
          id="request-category"
          className="request-composer__select"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">Not sure yet</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="request-composer__section">
        <legend className="request-composer__legend">Where and when?</legend>

        <label className="request-composer__label" htmlFor="request-location">
          Location
        </label>
        <Input
          id="request-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          maxLength={MAX_LOCATION_LEN}
          placeholder="Lekki, Lagos"
          ariaLabel="Where you need the work done"
        />

        <label className="request-composer__label" htmlFor="request-deadline">
          Needed by
        </label>
        <input
          id="request-deadline"
          type="date"
          className="request-composer__select"
          min={today}
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
        />

        <span className="request-composer__label">How soon?</span>
        <div
          className="request-composer__urgency"
          role="radiogroup"
          aria-label="How soon do you need this?"
        >
          {REQUEST_URGENCIES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={urgency === option}
              className={[
                "request-composer__urgency-option",
                urgency === option
                  ? "request-composer__urgency-option--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setUrgency(option)}
            >
              {REQUEST_URGENCY_LABELS[option]}
            </button>
          ))}
        </div>
        <p className="request-composer__hint">{REQUEST_URGENCY_HINTS[urgency]}</p>
      </fieldset>

      <fieldset className="request-composer__section">
        <legend className="request-composer__legend">
          Budget <span className="request-composer__optional">(optional)</span>
        </legend>
        <p className="request-composer__hint">
          A stated budget gets you more offers, and you can always leave it blank
          and settle it in the conversation.
        </p>
        <div className="request-composer__row">
          <Input
            type="number"
            inputMode="numeric"
            value={budgetMin}
            onChange={(event) => setBudgetMin(event.target.value)}
            placeholder="10000"
            ariaLabel="Minimum budget in naira"
          />
          <Input
            type="number"
            inputMode="numeric"
            value={budgetMax}
            onChange={(event) => setBudgetMax(event.target.value)}
            placeholder="50000"
            ariaLabel="Maximum budget in naira"
          />
        </div>
        {budgetInvalid ? (
          <p className="request-composer__error" role="alert">
            The maximum cannot be lower than the minimum.
          </p>
        ) : null}
      </fieldset>

      <fieldset className="request-composer__section">
        <legend className="request-composer__legend">
          Photos <span className="request-composer__optional">(optional)</span>
        </legend>
        <p className="request-composer__hint">
          A photo of the problem is worth a paragraph — up to {MAX_ATTACHMENTS}{" "}
          images.
        </p>

        {attachments.length > 0 ? (
          <ul className="request-composer__attachments">
            {attachments.map((url) => (
              <li key={url}>
                <button
                  type="button"
                  className="request-composer__attachment"
                  onClick={() =>
                    setAttachments((current) =>
                      current.filter((item) => item !== url)
                    )
                  }
                  aria-label="Remove this photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" referrerPolicy="no-referrer" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {/* The uploader is hidden once the cap is reached rather than disabled:
            a dead drop zone under three thumbnails is just clutter. */}
        {attachments.length < MAX_ATTACHMENTS ? (
          <ImageUploader
            purpose="request"
            value={null}
            onChange={(url) => {
              if (!url) return;
              setAttachments((current) =>
                current.length >= MAX_ATTACHMENTS ? current : [...current, url]
              );
            }}
            label="Add a photo"
          />
        ) : null}
      </fieldset>

      {error ? (
        <p className="request-composer__error" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        variant="primary"
        disabled={!ready}
        loading={busy}
        fullWidth
      >
        Post request
      </Button>
    </form>
  );
}