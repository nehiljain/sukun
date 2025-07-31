import { useState, useCallback } from "react";
import { IMediaItem } from "@/types/media";
import debounce from "lodash/debounce";

interface UseMediaSearchProps {
  onSearch: (query: string) => Promise<IMediaItem[]>;
}

export const useMediaSearch = ({ onSearch }: UseMediaSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IMediaItem[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        setError(null);
        const results = await onSearch(query);
        setSearchResults(results);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Search failed"));
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [onSearch],
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      debouncedSearch(query);
    },
    [debouncedSearch],
  );

  return {
    searchQuery,
    isSearching,
    searchResults,
    error,
    handleSearch,
  };
};
