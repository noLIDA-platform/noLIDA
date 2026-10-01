"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input/Input";
import { Icon } from "@/components/ui/Icon/Icon";
import "./SearchBar.css";

export interface SearchBarProps {
  defaultValue?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

/** Long enough to skip the keystrokes between words, short enough to feel live. */
const DEBOUNCE_MS = 300;

/**
 * The search field.
 *
 * Two details worth knowing:
 *
 * - **It is a real `<form>`.** Enter submits natively, which means Enter works
 *   before hydration and on a slow connection. A `keydown` listener would only
 *   work after the bundle arrives.
 * - **The debounce is skippable, and skipping it is the point.** Pressing Enter
 *   flushes immediately; clearing flushes immediately. Only *typing* waits 300ms
 *   for the pause, which is the case where waiting actually helps.
 *
 * The input itself is the existing `Input` primitive — one field style in the
 * app, rather than a second one that drifts. The icon and the clear button are
 * positioned over it by CSS.
 */
export function SearchBar({
  defaultValue = "",
  onSearch,
  placeholder = "Search posts and people",
  autoFocus = false,
  className,
}: SearchBarProps): React.JSX.Element {
  const [value, setValue] = useState(defaultValue);

  // `onSearch` is usually an inline arrow, so a new function every render.
  // Depending on it directly would restart the debounce on every keystroke and
  // it would never fire.
  const onSearchRef = useRef(onSearch);
  const lastEmitted = useRef(defaultValue.trim());
  const isFirstRender = useRef(true);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  function emit(query: string): void {
    const trimmed = query.trim();
    lastEmitted.current = trimmed;
    onSearchRef.current(trimmed);
  }

  useEffect(() => {
    // The page supplies `defaultValue` from `?q=`; it has already been
    // searched by whoever navigated here, so do not re-search it on mount.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const trimmed = value.trim();
    if (trimmed === lastEmitted.current) return;

    const timer = window.setTimeout(() => emit(trimmed), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // `emit` is recreated each render, so it is deliberately not a dependency.
  }, [value]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    emit(value);
  };

  const handleClear = (): void => {
    setValue("");
    emit("");
  };

  const classes = ["search-bar", className ?? ""].filter(Boolean).join(" ");

  return (
    <form className={classes} role="search" onSubmit={handleSubmit}>
      <span className="search-bar__icon" aria-hidden="true">
        <Icon as={Search} size={18} />
      </span>

      <Input
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        ariaLabel="Search posts and people"
        className="search-bar__input"
      />

      {value.length > 0 ? (
        <button
          type="button"
          className="search-bar__clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <Icon as={X} size={16} />
        </button>
      ) : null}
    </form>
  );
}