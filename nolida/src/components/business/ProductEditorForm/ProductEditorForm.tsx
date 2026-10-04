"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/Input/Input";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { ImageUploader } from "@/components/ui/ImageUploader/ImageUploader";
import { apiFetch } from "@/lib/client/api";
import { toMinorUnits, fromMinorUnits } from "@/lib/catalog/pricing";
import type { BusinessProduct, Category } from "@/types/catalog";
import "./ProductEditorForm.css";

/** How many images one product may carry. Mirrors the server's cap. */
const PRODUCT_IMAGES_MAX = 5;

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
  // The column can hold NULL for a row written before images existed; the editor
  // works in a plain array and writes back a full one.
  const [images, setImages] = useState<string[]>(product?.images ?? []);
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
          images,
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
        <fieldset className="business-editor__images">
          <legend className="business-editor__label">
            Photos ({images.length}/{PRODUCT_IMAGES_MAX})
          </legend>

          {images.length > 0 ? (
            <ul className="business-editor__image-list">
              {images.map((url, index) => (
                <li key={`${url}-${index}`} className="business-editor__image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="business-editor__image-file"
                    referrerPolicy="no-referrer"
                  />
                  {index === 0 ? (
                    // The first image is the one ProductCard shows, so saying so
                    // saves someone wondering why their reordering did nothing.
                    <span className="business-editor__image-badge">Main</span>
                  ) : null}
                  <button
                    type="button"
                    className="business-editor__image-remove"
                    onClick={() =>
                      setImages((current) => current.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {images.length < PRODUCT_IMAGES_MAX ? (
            <ImageUploader
              value={null}
              onChange={(url) => {
                if (!url) return;
                setImages((current) =>
                  current.length >= PRODUCT_IMAGES_MAX ? current : [...current, url],
                );
              }}
              kind="image"
              purpose="product"
              aspect="wide"
              label="Add a product photo"
            />
          ) : null}
        </fieldset>
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