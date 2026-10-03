"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SearchX } from "lucide-react";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { SearchBar } from "@/components/discover/SearchBar/SearchBar";
import { FilterPanel } from "@/components/discover/FilterPanel/FilterPanel";
import { PostResultCard } from "@/components/discover/PostResultCard/PostResultCard";
import { UserResultCard } from "@/components/discover/UserResultCard/UserResultCard";
import { PublicBusinessCard } from "@/components/business/PublicBusinessCard/PublicBusinessCard";
import { DiscoverySection } from "@/components/discover/DiscoverySection/DiscoverySection";
import { apiFetch } from "@/lib/client/api";
import type { PublicBusiness } from "@/types/public-business";
import type {
  DiscoveryData,
  SearchFilters,
  SearchResponse,
} from "@/types/search";
import "./DiscoverExplorer.css";

export interface DiscoverExplorerProps {
  /** From the session on the server; see the page that renders this. */
  viewerId: string;
  /** `?q=` from the URL, so the desktop top bar's form lands on real results. */
  initialQuery?: string;
  /**
   * Approved businesses fetched on the server (Phase 8B). Rendered as the
   * first discovery section when no search is active; a page prop rather
   * than an `/api/discovery` field because the section must be the first
   * thing on screen, not something a second round-trip paints in.
   */
  featuredBusinesses?: PublicBusiness[];
}

const EMPTY_FILTERS: SearchFilters = {
  type: "all",
  sortBy: "relevance",
};

function buildSearchParams(
  query: string,
  filters: SearchFilters,
  offset = 0
): URLSearchParams {
  const params = new URLSearchParams({ q: query.trim() });
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.sortBy && filters.sortBy !== "relevance") {
    params.set("sortBy", filters.sortBy);
  }
  if (filters.location) params.set("location", filters.location);
  if (offset > 0) params.set("offset", String(offset));
  return params;
}

type PageOutcome =
  | { ok: true; data: SearchResponse }
  | { ok: false; message: string };

async function fetchPage(
  query: string,
  filters: SearchFilters,
  offset: number
): Promise<PageOutcome> {
  const params = buildSearchParams(query, filters, offset);
  const result = await apiFetch<SearchResponse>(
    `/api/search?${params.toString()}`
  );
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, message: result.error.message };
}

/**
 * Everything on `/discover` that needs interactivity.
 *
 * A Client Component, but not the page: the page stays a Server Component that
 * reads the session and `?q=` first and passes `viewerId` down. That keeps
 * route metadata, the session guard and the first paint of the discovery rows
 * on the server — the same split `/home` uses.
 *
 * Two views, one screen:
 *
 * - **No query** — trending, people to follow, recent activity, fetched once on
 *   mount so the page has something in it immediately.
 * - **A query** — filtered results.
 *
 * Requests carry a token, so a slow response cannot overwrite a newer one: type
 * "lag", pause, clear the box, and the late response for "lag" must not paint.
 */
export function DiscoverExplorer({
  viewerId,
  initialQuery = "",
  featuredBusinesses = [],
}: DiscoverExplorerProps): React.JSX.Element {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);

  const [discovery, setDiscovery] = useState<DiscoveryData | null>(null);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  const loadDiscovery = useCallback(async (): Promise<void> => {
    const id = ++requestId.current;

    const result = await apiFetch<DiscoveryData>("/api/discovery");

    if (requestId.current !== id) return;

    if (!result.ok) {
      setError(result.error.message);
    } else {
      setDiscovery(result.data);
    }
    setIsLoading(false);
  }, []);

  /**
   * Runs one search and replaces the current results.
   *
   * Assumes a non-empty query: the empty case resets state rather than fetching,
   * and that belongs in the caller (`showDiscovery`). Keeping it here would mean
   * a setState *before* the first `await`, which React's lint rules read as a
   * cascading render even though this path is not taken on mount.
   */
  const runSearch = useCallback(
    async (nextQuery: string, nextFilters: SearchFilters): Promise<void> => {
      const id = ++requestId.current;

      const outcome = await fetchPage(nextQuery, nextFilters, 0);

      if (requestId.current !== id) return;

      if (outcome.ok) {
        setResults(outcome.data);
      } else {
        setError(outcome.message);
      }
      setIsLoading(false);
    },
    []
  );

  /**
   * Show the spinner and drop any previous error.
   *
   * Called from the event handlers only — never from the mount effect. The
   * component starts as `isLoading: true`, so the first fetch has nothing to
   * set.
   */
  const beginLoading = (): void => {
    setIsLoading(true);
    setError(null);
  };

  /** Clearing the box returns to discovery, not to a blank page. */
  const showDiscovery = (): void => {
    setResults(null);
    setIsLoading(false);
    setError(null);
  };

  /**
   * Page two onwards. Search paginates by offset, so this is a plain append:
   * the rows already on screen stay where they are, and only the new page is
   * appended. `nextCursor` is that offset as a string — the API's shape, kept
   * rather than unwrapped, so there is one place that knows about it.
   */
  const handleLoadMore = async (): Promise<void> => {
    const nextOffset = results?.nextCursor;
    if (!nextOffset || isLoadingMore) return;

    setIsLoadingMore(true);
    const id = ++requestId.current;

    const outcome = await fetchPage(query, filters, Number(nextOffset));

    if (requestId.current === id) {
      if (outcome.ok) {
        setResults((previous) =>
          previous
            ? {
                ...outcome.data,
                results: [...previous.results, ...outcome.data.results],
              }
            : outcome.data
        );
      } else {
        setError(outcome.message);
      }
    }
    setIsLoadingMore(false);
  };

  // The resting state loads on mount. A query in the URL means we arrive already
  // in search mode and skip straight to it. The page keys this component by
  // `?q=`, so submitting the top bar form while already on /discover remounts
  // here rather than leaving the previous query's results on screen.
  //
  // Written out inline rather than by calling `runSearch`: React's lint rules
  // read a named state-setter call in an effect body as a cascading render. The
  // `cancelled` flag is the other half of the job — it stops a response that
  // arrives after unmount from touching a component that is gone.
  useEffect(() => {
    let cancelled = false;
    const trimmed = initialQuery.trim();

    async function load(): Promise<void> {
      if (trimmed.length > 0) {
        const outcome = await fetchPage(trimmed, EMPTY_FILTERS, 0);
        if (cancelled) return;
        if (outcome.ok) setResults(outcome.data);
        else setError(outcome.message);
      } else {
        const result = await apiFetch<DiscoveryData>("/api/discovery");
        if (cancelled) return;
        if (result.ok) setDiscovery(result.data);
        else setError(result.error.message);
      }
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [initialQuery]);

  const handleSearch = (nextQuery: string): void => {
    setQuery(nextQuery);

    if (nextQuery.trim().length === 0) {
      showDiscovery();
      return;
    }

    beginLoading();
    void runSearch(nextQuery, filters);
  };

  const handleFilterChange = (next: SearchFilters): void => {
    setFilters(next);
    beginLoading();
    void runSearch(query, next);
  };

  const handleClearFilters = (): void => {
    setFilters(EMPTY_FILTERS);
    beginLoading();
    void runSearch(query, EMPTY_FILTERS);
  };

  const handleRetry = (): void => {
    beginLoading();
    if (query.trim().length > 0) void runSearch(query, filters);
    else void loadDiscovery();
  };

  const hasQuery = query.trim().length > 0;
  const resultList = results?.results ?? [];
return (
    <div className="discover">
      <header className="discover__header">
        <SearchBar defaultValue={initialQuery} onSearch={handleSearch} />
      </header>

      {hasQuery ? (
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />
      ) : null}

      {isLoading ? (
        <div className="discover__loading" role="status">
          <Spinner size="md" />
          <span>{hasQuery ? "Searching…" : "Loading discovery…"}</span>
        </div>
      ) : null}

      {error ? (
        <Alert variant="error">
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={handleRetry}>
            Try again
          </Button>
        </Alert>
      ) : null}

      {!isLoading && !error && hasQuery && resultList.length === 0 ? (
        <div className="discover__empty">
          <EmptyState
            icon={<Icon as={SearchX} size={28} />}
            title="No results"
            description={`Nothing matched "${query.trim()}". Try a different search, or clear the filters.`}
          />
        </div>
      ) : null}

      {!isLoading && !error && hasQuery && resultList.length > 0 ? (
        <>
          <p className="discover__count">
            {resultList.length} of{" "}
            {results
              ? results.counts.posts +
                results.counts.users +
                results.counts.businesses
              : resultList.length}{" "}
            {results &&
            results.counts.posts +
              results.counts.users +
              results.counts.businesses ===
              1
              ? "result"
              : "results"}
          </p>

          <ul className="discover__results">
            {resultList.map((result) => (
              <li key={`${result.type}-${result.id}`} className="discover__result">
                {result.type === "post" ? (
                  <PostResultCard post={result} />
                ) : result.type === "user" ? (
                  <UserResultCard user={result} viewerId={viewerId} />
                ) : result.type === "business" ? (
                  <PublicBusinessCard business={result} />
                ) : null}
              </li>
            ))}
          </ul>

          {results?.nextCursor ? (
            <div className="discover__load-more">
              <Button
                variant="secondary"
                onClick={() => void handleLoadMore()}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Spinner size="sm" />
                    <span>Loading…</span>
                  </>
                ) : (
                  <span>Load more</span>
                )}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      {!isLoading && !error && !hasQuery && discovery ? (
        <>
          {/* First section, and only when there is something to show — an
              empty grid is not a section, and DiscoverySection's own empty
              check sees the wrapper div, not the mapped rows. */}
          {featuredBusinesses.length > 0 ? (
            <DiscoverySection
              title="Featured businesses"
              subtitle="Approved businesses on noLIDA"
            >
              <div className="discover__businesses">
                {featuredBusinesses.map((business) => (
                  <PublicBusinessCard key={business.id} business={business} />
                ))}
              </div>
            </DiscoverySection>
          ) : null}

          <DiscoverySection
            title="Trending now"
            subtitle="Most liked in the last seven days"
          >
            {discovery.trendingPosts.map((post) => (
              <PostResultCard key={post.id} post={post} />
            ))}
          </DiscoverySection>

          <DiscoverySection title="People to follow">
            <div className="discover__people">
              {discovery.suggestedUsers.map((user) => (
                <UserResultCard
                  key={user.id}
                  user={user}
                  viewerId={viewerId}
                />
              ))}
            </div>
          </DiscoverySection>

          <DiscoverySection title="Recent activity">
            {discovery.recentPosts.map((post) => (
              <PostResultCard key={post.id} post={post} />
            ))}
          </DiscoverySection>
        </>
      ) : null}
    </div>
  );
}