"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { ProductCard } from "@/components/business/ProductCard/ProductCard";
import { ProductEditorForm } from "@/components/business/ProductEditorForm/ProductEditorForm";
import { apiFetch } from "@/lib/client/api";
import type { BusinessProduct, Category } from "@/types/catalog";

interface ProductsClientProps {
  businessId: string;
  initialProducts: BusinessProduct[];
  categories: Category[];
}

type EditorState = { kind: "create" } | { kind: "edit"; id: string };

export function ProductsClient({
  businessId,
  initialProducts,
  categories,
}: ProductsClientProps): React.JSX.Element {
  const [products, setProducts] = useState(initialProducts);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editingProduct = editor?.kind === "edit"
    ? products.find((product) => product.id === editor.id)
    : undefined;

  function saveProduct(saved: BusinessProduct): void {
    setProducts((current) => {
      const exists = current.some((product) => product.id === saved.id);
      return exists
        ? current.map((product) => product.id === saved.id ? saved : product)
        : [saved, ...current];
    });
    setEditor(null);
    setError(null);
  }

  async function deleteProduct(id: string): Promise<void> {
    setDeleting(true);
    setError(null);
    const result = await apiFetch<{ deleted: boolean }>(
      `/api/businesses/${businessId}/products/${id}`,
      { method: "DELETE" },
    );
    setDeleting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setProducts((current) => current.filter((product) => product.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="business-catalog">
      <header className="business-catalog__header">
        <div>
          <p className="business-catalog__eyebrow">My business</p>
          <h1>Products</h1>
        </div>
        <Button type="button" onClick={() => setEditor({ kind: "create" })}>
          Add product
        </Button>
      </header>

      {editor ? (
        <ProductEditorForm
          key={editor.kind === "edit" ? editor.id : "new-product"}
          businessId={businessId}
          product={editingProduct}
          categories={categories}
          onSaved={saveProduct}
          onCancel={() => setEditor(null)}
        />
      ) : null}

      {error ? <p className="business-catalog__error" role="alert">{error}</p> : null}
      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          action={(
            <Button type="button" onClick={() => setEditor({ kind: "create" })}>
              Add your first product
            </Button>
          )}
        />
      ) : (
        <div className="business-catalog__list">
          {products.map((product) => (
            <div className="business-catalog__item" key={product.id}>
              <ProductCard
                product={product}
                editable
                onEdit={() => setEditor({ kind: "edit", id: product.id })}
                onDelete={() => setDeletingId(product.id)}
              />
              {deletingId === product.id ? (
                <div className="business-catalog__confirmation" role="group" aria-label={`Delete ${product.name}`}>
                  <span>Delete “{product.name}”?</span>
                  <Button type="button" variant="danger" size="sm" loading={deleting} onClick={() => void deleteProduct(product.id)}>
                    Delete
                  </Button>
                  <Button type="button" variant="secondary" size="sm" disabled={deleting} onClick={() => setDeletingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}