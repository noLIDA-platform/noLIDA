"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/Input/Input";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { apiFetch } from "@/lib/client/api";
import { fromMinorUnits, toMinorUnits } from "@/lib/catalog/pricing";
import type { BusinessService, Category } from "@/types/catalog";
import "./ServiceEditorForm.css";

export interface ServiceEditorFormProps {
  businessId: string;
  service?: BusinessService;
  categories: Category[];
  onSaved: (service: BusinessService) => void;
  onCancel: () => void;
}

export function ServiceEditorForm({
  businessId,
  service,
  categories,
  onSaved,
  onCancel,
}: ServiceEditorFormProps): React.JSX.Element {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [categoryId, setCategoryId] = useState(service?.category_id ?? "");
  const [priceMin, setPriceMin] = useState(fromMinorUnits(service?.price_min ?? null));
  const [priceMax, setPriceMax] = useState(fromMinorUnits(service?.price_max ?? null));
  const [duration, setDuration] = useState(
    service?.duration_minutes == null ? "" : String(service.duration_minutes),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const minimum = priceMin.trim() === "" ? null : toMinorUnits(priceMin);
    const maximum = priceMax.trim() === "" ? null : toMinorUnits(priceMax);
    const durationMinutes = duration.trim() === "" ? null : Number(duration);
    if ((priceMin.trim() !== "" && minimum === null) || (priceMax.trim() !== "" && maximum === null)) {
      setError("Enter prices with up to two decimal places.");
      return;
    }
    if (
      minimum !== null &&
      maximum !== null &&
      maximum < minimum
    ) {
      setError("The maximum price must be at least the minimum price.");
      return;
    }
    if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 1)) {
      setError("Duration must be a positive number of minutes.");
      return;
    }

    setSaving(true);
    const result = await apiFetch<{ service: BusinessService }>(
      service
        ? `/api/businesses/${businessId}/services/${service.id}`
        : `/api/businesses/${businessId}/services`,
      {
        method: service ? "PATCH" : "POST",
        body: {
          name: name.trim(),
          description: description.trim() || null,
          categoryId: categoryId || null,
          priceMin: minimum,
          priceMax: maximum,
          durationMinutes,
        },
      },
    );
    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    onSaved(result.data.service);
  }

  return (
    <Card as="section" className="business-editor">
      <h2 className="business-editor__title">{service ? "Edit service" : "Add service"}</h2>
      <form className="business-editor__form" onSubmit={handleSubmit}>
        <Input
          id="service-name"
          label="Service name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
        />
        <Textarea
          id="service-description"
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          rows={3}
        />
        <label className="business-editor__label" htmlFor="service-category">
          Category
          <select
            id="service-category"
            className="business-editor__select"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <div className="business-editor__grid">
          <Input
            id="service-price-min"
            label="Starting price (NGN)"
            type="text"
            inputMode="decimal"
            value={priceMin}
            onChange={(event) => setPriceMin(event.target.value)}
            placeholder="5000"
          />
          <Input
            id="service-price-max"
            label="Maximum price (NGN)"
            type="text"
            inputMode="decimal"
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
            placeholder="Optional"
          />
          <Input
            id="service-duration"
            label="Duration (minutes)"
            type="number"
            inputMode="numeric"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="Optional"
          />
        </div>
        {error ? <p className="business-editor__error" role="alert">{error}</p> : null}
        <div className="business-editor__actions">
          <Button type="submit" loading={saving}>{service ? "Save changes" : "Add service"}</Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}