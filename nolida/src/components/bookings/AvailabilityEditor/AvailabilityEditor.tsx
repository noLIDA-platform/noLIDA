"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { apiFetch } from "@/lib/client/api";
import type { AvailabilitySlot } from "@/lib/availability/types";
import { DAY_LABELS, DAY_ORDER } from "@/lib/availability/types";
import { SLOT_MINUTES_DEFAULT, SLOT_MINUTES_OPTIONS } from "@/lib/availability/constants";
import "./AvailabilityEditor.css";

export interface AvailabilityEditorProps {
  businessId: string;
  initialSlots: AvailabilitySlot[];
}

const SLOT_MINUTES_VALUES = SLOT_MINUTES_OPTIONS as readonly number[];

export function AvailabilityEditor({
  businessId,
  initialSlots,
}: AvailabilityEditorProps): React.JSX.Element {
  const router = useRouter();
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initialSlots);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const usedDays = new Set(slots.map((s) => s.day_of_week));

  const handleField = (
    index: number,
    field: keyof AvailabilitySlot,
    value: string | number | boolean
  ) => {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      )
    );
  };

  const addDay = () => {
    const nextDay = DAY_ORDER.find((d) => !usedDays.has(d));
    if (nextDay === undefined) return;
    const newSlot: AvailabilitySlot = {
      id: null,
      day_of_week: nextDay,
      start_time: "09:00",
      end_time: "17:00",
      slot_minutes: SLOT_MINUTES_DEFAULT,
      is_active: true,
    };
    setSlots((prev) => [...prev, newSlot]);
  };

  const removeDay = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    const result = await apiFetch(`/api/businesses/${businessId}/availability`, {
      method: "POST",
      body: slots,
    });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error.message);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="availability-editor">
      <div className="availability-editor__header">
        <h2 className="availability-editor__title">Weekly availability</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={addDay}
          disabled={slots.length >= 7}
        >
          Add day
        </Button>
      </div>

      {slots.length === 0 ? (
        <p className="availability-editor__empty">
          No availability windows set. Add a day to get started.
        </p>
      ) : (
        <ul className="availability-editor__list">
          {slots.map((slot, index) => (
            <li key={slot.id ?? `new-${index}`} className="availability-editor__row">
              <select
                className="availability-editor__select"
                value={slot.day_of_week}
                onChange={(e) =>
                  handleField(index, "day_of_week", parseInt(e.target.value, 10))
                }
                aria-label="Day of week"
              >
                {DAY_ORDER.map((day) => {
                  const used = usedDays.has(day) && slot.day_of_week !== day;
                  return (
                    <option key={day} value={day} disabled={used}>
                      {DAY_LABELS[day]}
                    </option>
                  );
                })}
              </select>

              <input
                type="time"
                className="availability-editor__input"
                value={slot.start_time}
                onChange={(e) => handleField(index, "start_time", e.target.value)}
                aria-label="Start time"
                required
              />

              <span className="availability-editor__dash">—</span>

              <input
                type="time"
                className="availability-editor__input"
                value={slot.end_time}
                onChange={(e) => handleField(index, "end_time", e.target.value)}
                aria-label="End time"
                required
              />

              <select
                className="availability-editor__select"
                value={slot.slot_minutes}
                onChange={(e) =>
                  handleField(index, "slot_minutes", parseInt(e.target.value, 10))
                }
                aria-label="Slot duration (minutes)"
              >
                {SLOT_MINUTES_VALUES.map((mins) => (
                  <option key={mins} value={mins}>
                    {mins} min
                  </option>
                ))}
              </select>

              <label className="availability-editor__toggle">
                <input
                  type="checkbox"
                  checked={slot.is_active}
                  onChange={(e) => handleField(index, "is_active", e.target.checked)}
                  aria-label="Active"
                />
                <span className="availability-editor__toggle-slider" />
              </label>

              {slots.length > 1 && (
                <button
                  type="button"
                  className="availability-editor__remove"
                  onClick={() => removeDay(index)}
                  aria-label={`Remove ${DAY_LABELS[slot.day_of_week]}`}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="availability-editor__error">{error}</p>}

      <Button
        variant="primary"
        onClick={handleSave}
        loading={isSaving}
        disabled={isSaving || slots.length === 0}
      >
        Save availability
      </Button>
    </div>
  );
}
