"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { ServiceCard } from "@/components/business/ServiceCard/ServiceCard";
import { ServiceEditorForm } from "@/components/business/ServiceEditorForm/ServiceEditorForm";
import { apiFetch } from "@/lib/client/api";
import type { BusinessService, Category } from "@/types/catalog";

interface ServicesClientProps {
  businessId: string;
  initialServices: BusinessService[];
  categories: Category[];
}

type EditorState = { kind: "create" } | { kind: "edit"; id: string };

export function ServicesClient({
  businessId,
  initialServices,
  categories,
}: ServicesClientProps): React.JSX.Element {
  const searchParams = useSearchParams();
  const [services, setServices] = useState(initialServices);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editingService = editor?.kind === "edit"
    ? services.find((service) => service.id === editor.id)
    : undefined;

  /**
   * `/my-business/services?new=1` opens the create form on arrival.
   *
   * The QuickActions row links here, and an owner who clicks "Add service" and
   * then has to click "Add service" again has been asked the same question
   * twice.
   *
   * The read is in an effect rather than in `useState`'s initialiser on
   * purpose: `useSearchParams` is populated before the first client render
   * here, but seeding state from it would also run on the server (where it is
   * empty), producing a hydration mismatch between "form open" and "form
   * closed".
   */
  const openedFromParam = useRef(false);
  useEffect(() => {
    if (openedFromParam.current) return;
    if (searchParams.get("new") !== "1") return;
    openedFromParam.current = true;
    setEditor({ kind: "create" });
  }, [searchParams]);

  function saveService(saved: BusinessService): void {
    setServices((current) => {
      const exists = current.some((service) => service.id === saved.id);
      return exists
        ? current.map((service) => service.id === saved.id ? saved : service)
        : [saved, ...current];
    });
    setEditor(null);
    setError(null);
  }

  async function deleteService(id: string): Promise<void> {
    setDeleting(true);
    setError(null);
    const result = await apiFetch<{ deleted: boolean }>(
      `/api/businesses/${businessId}/services/${id}`,
      { method: "DELETE" },
    );
    setDeleting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setServices((current) => current.filter((service) => service.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="business-catalog">
      <header className="business-catalog__header">
        <div>
          <p className="business-catalog__eyebrow">My business</p>
          <h1>Services</h1>
        </div>
        <Button type="button" onClick={() => setEditor({ kind: "create" })}>
          Add service
        </Button>
      </header>

      {editor ? (
        <ServiceEditorForm
          key={editor.kind === "edit" ? editor.id : "new-service"}
          businessId={businessId}
          service={editingService}
          categories={categories}
          onSaved={saveService}
          onCancel={() => setEditor(null)}
        />
      ) : null}

      {error ? <p className="business-catalog__error" role="alert">{error}</p> : null}
      {services.length === 0 ? (
        <EmptyState
          title="No services yet"
          action={(
            <Button type="button" onClick={() => setEditor({ kind: "create" })}>
              Add your first service
            </Button>
          )}
        />
      ) : (
        <div className="business-catalog__list">
          {services.map((service) => (
            <div className="business-catalog__item" key={service.id}>
              <ServiceCard
                service={service}
                editable
                onEdit={() => setEditor({ kind: "edit", id: service.id })}
                onDelete={() => setDeletingId(service.id)}
              />
              {deletingId === service.id ? (
                <div className="business-catalog__confirmation" role="group" aria-label={`Delete ${service.name}`}>
                  <span>Delete “{service.name}”?</span>
                  <Button type="button" variant="danger" size="sm" loading={deleting} onClick={() => void deleteService(service.id)}>
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