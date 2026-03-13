import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetch-json";
import { useState, useEffect } from "react";

/**
 * Shape of a single suggestion item returned by the API.
 */
export interface SuggestionItem {
  type: "event" | "hackathon" | "profile" | "community";
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  url: string;
}

/**
 * Grouped suggestions from the API.
 */
export interface SearchSuggestions {
  events: SuggestionItem[];
  hackathons: SuggestionItem[];
  profiles: SuggestionItem[];
  communities: SuggestionItem[];
}

/**
 * Debounce a string value by `delay` milliseconds.
 */
function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Hook that fetches search suggestions with a 300ms debounce.
 * Only fires when the query is at least 2 characters long.
 */
export function useSearchSuggestions(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  return useQuery<SearchSuggestions>({
    queryKey: ["search", "suggestions", debouncedQuery],
    queryFn: () =>
      fetchJson<SearchSuggestions>(
        `/api/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`
      ),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000, // suggestions are valid for 30s
    gcTime: 60_000,
  });
}
