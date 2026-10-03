"use client";

import { useState } from "react";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Input } from "@/components/ui/Input/Input";
import type { SearchFilters, SearchSort } from "@/types/search";
import "./FilterPanel.css";

export interface FilterPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onClear: () => void;
}

/**
 * Type, sort and location filters for search results.
 *
 * Businesses joined the type pills in Phase 8B, when `search.service.ts`
 * began returning real business results — before that this pill would have
 * shown an empty list that looks broken, so it was deliberately absent.
 */
const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "post", label: "Posts" },
  { value: "user", label: "People" },
  { value: "business", label: "Businesses" },
] as const;

const SORT_OPTIONS: readonly { value: SearchSort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "recent", label: "Recent" },
  { value: "popular", label: "Popular" },
];

/**
 * Type, sort and location filters for search results.
 *
 * The location field holds its own draft text and only commits on Enter or
 * blur. Committing per keystroke would fire a search request per character —
 * the exact thing the search bar's debounce exists to avoid — and would also
 * make "Lagos" re-search five times on the way there.
 */
export function FilterPanel({
  filters,
  onChange,
  onClear,
}: FilterPanelProps): React.JSX.Element {
  const [locationOpen, setLocationOpen] = useState(
    Boolean(filters.location) || false
  );
  const [locationDraft, setLocationDraft] = useState(filters.location ?? "");

  const type = filters.type ?? "all";
  const sortBy = filters.sortBy ?? "relevance";
  const hasActiveFilter =
    type !== "all" || sortBy !== "relevance" || Boolean(filters.location);

  const commitLocation = (): void => {
    const next = locationDraft.trim();
    onChange({ ...filters, location: next ? next : undefined });
  };

  return (
    <div className="filter-panel">
      <div className="filter-panel__row">
        <div
          className="filter-panel__pills"
          role="group"
          aria-label="Filter by type"
        >
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={[
                "filter-panel__pill",
                type === option.value ? "filter-panel__pill--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={type === option.value}
              onClick={() =>
                onChange({ ...filters, type: option.value })
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        <div
          className="filter-panel__pills"
          role="group"
          aria-label="Sort results"
        >
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={[
                "filter-panel__pill",
                sortBy === option.value ? "filter-panel__pill--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={sortBy === option.value}
              onClick={() => onChange({ ...filters, sortBy: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={[
            "filter-panel__pill",
            "filter-panel__pill--icon",
            filters.location ? "filter-panel__pill--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-expanded={locationOpen}
          onClick={() => {
            const next = !locationOpen;
            setLocationOpen(next);
            // Closing an untouched box should not apply a stale draft.
            if (!next && !locationDraft.trim()) {
              onChange({ ...filters, location: undefined });
            }
          }}
        >
          <Icon as={MapPin} size={14} />
          <span>{filters.location ? filters.location : "Location"}</span>
        </button>

        {hasActiveFilter ? (
          <button
            type="button"
            className="filter-panel__clear"
            onClick={() => {
              setLocationOpen(false);
              setLocationDraft("");
              onClear();
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {locationOpen ? (
        <div className="filter-panel__location">
          <Input
            value={locationDraft}
            onChange={(event) => setLocationDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitLocation();
              }
            }}
            onBlur={commitLocation}
            placeholder="Filter by location"
            ariaLabel="Filter by location"
            maxLength={120}
            className="filter-panel__location-input"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setLocationOpen(false);
              setLocationDraft("");
              onChange({ ...filters, location: undefined });
            }}
          >
            <Icon as={X} size={14} />
            <span>Remove</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}