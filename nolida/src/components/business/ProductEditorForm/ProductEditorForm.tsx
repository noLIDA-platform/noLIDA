"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/Input/Input";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { apiFetch } from "@/lib/client/api";
import { toMinorUnits, fromMinorUnits } from "@/lib/catalog/pricing";
import type { BusinessProduct, Category } from "@/types/catalog";
import "./ProductEditorForm.css";

export interface ProductEditorFormProps {
  businessId: string;
  product?: BusinessProduct;
  categories: Category[];
  onSaved: (product: BusinessProduct) => void;
  onCancel: () => void;
}

export function ProductEditorForm({
  businessId,
  product,
  categories,
  onSaved,
  onCancel,
}: ProductEditorFormProps): React.JSX.Element {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [price, setPrice] = useState(fromMinorUnits(product?.price ?? null));
  const [stock, setStock] = useState(product?.stock == null ? "" : String(product.stock));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const priceMinor = toMinorUnits(price);
    if (priceMinor === null) {
      setError("Enter a price with up to two decimal places.");
      return;
    }
    const stockCount = stock.trim() === "" ? null : Number(stock);
    if (stockCount !== null && (!Number.isInteger(stockCount) || stockCount < 0)) {
      setError("Stock must be zero or a positive whole number.");
      return;
    }

    setSaving(true);
    const result = await apiFetch<{ product: BusinessProduct }>(
      product
        ? `/api/businesses/${businessId}/products/${product.id}`
        : `/api/businesses/${businessId}/products`,
      {
        method: product ? "PATCH" : "POST",
        body: {
          name: name.trim(),
          description: description.trim() || null,
          categoryId: categoryId || null,
          price: priceMinor,
          stock: stockCount,
        },
      },
    );
    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    onSaved(result.data.product);
  }

  return (
    <Card as="section" className="business-editor">
      <h2 className="business-editor__title">{product ? "Edit product" : "Add product"}</h2>
      <form className="business-editor__form" onSubmit={handleSubmit}>
        <Input
          id="product-name"
          label="Product name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
        />
        <Textarea
          id="product-description"
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          rows={3}
        />
        <label className="business-editor__label" htmlFor="product-category">
          Category
          <select
            id="product-category"
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
            id="product-price"
            label="Price (NGN)"
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="5000"
            required
          />
          <Input
            id="product-stock"
            label="Stock (optional)"
            type="number"
            inputMode="numeric"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            placeholder="Unlimited"
          />
        </div>
        {error ? <p className="business-editor__error" role="alert">{error}</p> : null}
        <div className="business-editor__actions">
          <Button type="submit" loading={saving}>{product ? "Save changes" : "Add product"}</Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}