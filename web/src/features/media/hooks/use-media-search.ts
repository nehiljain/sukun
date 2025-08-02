import { useQuery } from '@tanstack/react-query';
import { useDebouncedCallback } from 'use-debounce';
import { useState, useCallback } from 'react';
import { mediaApi } from '../api/media-api';
import type { MediaFilters, IMediaItem } from '../types';

const MEDIA_SEARCH_QUERY_KEY = 'media-search';

export function useMediaSearch(filters: MediaFilters = {}) {
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [MEDIA_SEARCH_QUERY_KEY, searchQuery, filters],
    queryFn: () => mediaApi.searchMedia(searchQuery, filters),
    enabled: !!searchQuery.trim(),
  });

  const searchResults = data?.results ?? [];
  const searchMetadata = data?.search_metadata ?? null;

  // Debounced search function
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query);
  }, 1000);

  const handleSearch = useCallback((query: string) => {
    debouncedSearch(query);
  }, [debouncedSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    searchQuery,
    searchResults,
    searchMetadata,
    isSearching: isLoading,
    error,
    handleSearch,
    clearSearch,
  };
}