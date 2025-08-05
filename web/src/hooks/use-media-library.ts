// Legacy hook - use features/media/hooks instead for new code
export * from '@/features/media/hooks';
export * from '@/features/media/types';

// Keep existing hook for backward compatibility during migration
import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { IMediaItem, MediaType } from "@/types/media";
import { ddApiClient } from "@/lib/api-client";
import { format } from "date-fns";
import { useDebouncedCallback } from "use-debounce";

export interface MediaFilters {
  type?: MediaType | "all";
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  searchQuery?: string;
  video_project_id?: string;
  // Semantic search options
  useSemanticSearch?: boolean;
  similarityThreshold?: number;
  maxResults?: number;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: IMediaItem[];
  search_metadata?: {
    semantic_search_used: boolean;
    similarity_threshold: number | null;
    query: string;
  };
}

interface SplitImagePreviewResponse {
  success: boolean;
  preview: {
    center_url?: string;
    left_url?: string;
    right_url?: string;
    urls?: string[];
  };
  is_wide: boolean;
}

interface SplitImageResponse {
  success: boolean;
  center_media?: {
    id: string;
    url: string;
    thumbnail_url: string;
  };
  left_media?: {
    id: string;
    url: string;
    thumbnail_url: string;
  };
  right_media?: {
    id: string;
    url: string;
    thumbnail_url: string;
  };
  split_medias?: Array<{
    id: string;
    url: string;
    thumbnail_url: string;
    position: string;
    index: number;
  }>;
}

export interface SplitImagePreview {
  centerUrl?: string;
  leftUrl?: string;
  rightUrl?: string;
  multiUrls?: string[];
  isWideImage: boolean;
}

export const useMediaLibrary = (filters: MediaFilters = { type: "all" }) => {
  const [mediaItems, setMediaItems] = useState<IMediaItem[]>([]);
  const [searchResults, setSearchResults] = useState<IMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || "");
  const [searchMetadata, setSearchMetadata] = useState<{
    semantic_search_used: boolean;
    similarity_threshold: number | null;
    query: string;
  } | null>(null);
  const [splitImagePreview, setSplitImagePreview] =
    useState<SplitImagePreview | null>(null);
  const [isSplittingImage, setIsSplittingImage] = useState(false);

  // Use a ref to track if initial fetch has been done to prevent infinite loops
  const initialFetchDone = useRef(false);
  // Store the previous filters to compare and determine if we need to refetch
  const prevFiltersRef = useRef<MediaFilters>(filters);

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  const updateMediaName = useCallback(async (mediaId: string, name: string) => {
    const response = await ddApiClient.patch(`/api/media/${mediaId}/`, {
      name,
    });

    if (response.status !== 200) {
      throw new Error("Failed to update media name");
    }

    return response.data;
  }, []);

  const buildQueryParams = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams();
      params.append("page", pageNum.toString());

      if (filters.type && filters.type !== "all") {
        params.append("type", filters.type);
      }

      if (filters.dateFrom) {
        params.append("date_from", format(filters.dateFrom, "yyyy-MM-dd"));
      }

      if (filters.dateTo) {
        params.append("date_to", format(filters.dateTo, "yyyy-MM-dd"));
      }

      if (filters.tags && filters.tags.length > 0) {
        params.append("tags", filters.tags.join(","));
      }

      if (filters.video_project_id) {
        params.append("video_project_id", filters.video_project_id);
      }

      return params.toString();
    },
    [filters],
  );

  const fetchMediaLibrary = useCallback(
    async (pageNum: number) => {
      try {
        setIsLoading(true);
        setError(null);

        const queryParams = buildQueryParams(pageNum);
        const response = await ddApiClient.get(
          `/api/media/library/?${queryParams}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (response.status !== 200) {
          throw new Error(`Failed to fetch media library`);
        }

        const data: PaginatedResponse = response.data;

        if (pageNum === 1) {
          setMediaItems(data.results);
        } else {
          setMediaItems((prev) => [...prev, ...data.results]);
        }

        setHasMore(!!data.next);
      } catch (err) {
        console.error(`Error fetching media library:`, err);
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch media library"),
        );

        // Add retry logic
        if (pageNum < MAX_RETRIES) {
          setTimeout(() => {
            fetchMediaLibrary(pageNum + 1);
          }, RETRY_DELAY);
        } else {
          toast.error(`Failed to load media library. Please try again.`);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [buildQueryParams, MAX_RETRIES, RETRY_DELAY],
  );

  const searchMedia = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        setError(null);

        // Build query parameters to include filters
        const params = new URLSearchParams();
        params.append("q", query);

        if (filters.type && filters.type !== "all") {
          params.append("type", filters.type);
        }

        if (filters.dateFrom) {
          params.append("date_from", format(filters.dateFrom, "yyyy-MM-dd"));
        }

        if (filters.dateTo) {
          params.append("date_to", format(filters.dateTo, "yyyy-MM-dd"));
        }

        if (filters.tags && filters.tags.length > 0) {
          params.append("tags", filters.tags.join(","));
        }

        // Add semantic search parameters
        if (filters.useSemanticSearch !== undefined) {
          params.append("semantic", filters.useSemanticSearch.toString());
        }

        if (filters.similarityThreshold !== undefined) {
          params.append("threshold", filters.similarityThreshold.toString());
        }

        if (filters.maxResults !== undefined) {
          params.append("max_results", filters.maxResults.toString());
        }

        const response = await ddApiClient.get(
          `/api/media/search/?${params.toString()}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (response.status !== 200) {
          throw new Error("Search failed");
        }

        // Handle both paginated and non-paginated search responses
        const responseData = response.data;
        if (responseData.results) {
          // Paginated response
          setSearchResults(responseData.results);
          setSearchMetadata(responseData.search_metadata || null);
        } else {
          // Non-paginated response (legacy format)
          setSearchResults(responseData);
          setSearchMetadata(null);
        }
      } catch (err) {
        console.error(`Error searching media:`, err);
        setError(
          err instanceof Error ? err : new Error("Failed to search media"),
        );
        toast.error("Failed to search media. Please try again.");
      } finally {
        setIsSearching(false);
      }
    },
    [filters],
  );

  // Replace the debounced search implementation
  const debouncedSearch = useDebouncedCallback((query: string) => {
    searchMedia(query);
  }, 1000);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      debouncedSearch(query);
    },
    [debouncedSearch],
  );

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [isLoading, hasMore]);

  // Function to check if filters have changed
  const haveFiltersChanged = useCallback(() => {
    const prev = prevFiltersRef.current;
    return (
      prev.type !== filters.type ||
      prev.dateFrom !== filters.dateFrom ||
      prev.dateTo !== filters.dateTo ||
      JSON.stringify(prev.tags) !== JSON.stringify(filters.tags) ||
      prev.searchQuery !== filters.searchQuery ||
      prev.video_project_id !== filters.video_project_id ||
      prev.useSemanticSearch !== filters.useSemanticSearch ||
      prev.similarityThreshold !== filters.similarityThreshold ||
      prev.maxResults !== filters.maxResults
    );
  }, [filters]);

  // Only fetch on initial render or when filters actually change
  useEffect(() => {
    if (!initialFetchDone.current || haveFiltersChanged()) {
      setPage(1);
      setMediaItems([]);
      fetchMediaLibrary(1);
      initialFetchDone.current = true;
      prevFiltersRef.current = { ...filters };
    }
  }, [filters, fetchMediaLibrary, haveFiltersChanged]);

  // Handle pagination
  useEffect(() => {
    if (page > 1) {
      fetchMediaLibrary(page);
    }
  }, [page, fetchMediaLibrary]);

  const refetch = useCallback(() => {
    setPage(1);
    setMediaItems([]);
    fetchMediaLibrary(1);
  }, [fetchMediaLibrary]);

  // Get preview for splitting an image to portrait format (9:16)
  const getImageSplitPreview = useCallback(
    async (mediaId: string, singleMode: boolean = false) => {
      try {
        setIsSplittingImage(true);

        const response = await ddApiClient.post<SplitImagePreviewResponse>(
          `/api/media/${mediaId}/split_to_portrait/`,
          {
            preview_only: true,
            single_mode: singleMode,
          },
        );

        if (response.data.success) {
          const preview: SplitImagePreview = {
            isWideImage: response.data.is_wide,
          };

          // Handle center/single image preview
          if (response.data.preview.center_url) {
            preview.centerUrl = response.data.preview.center_url;
          }

          // Handle left/right previews for standard two-image split
          if (response.data.preview.left_url) {
            preview.leftUrl = response.data.preview.left_url;
          }

          if (response.data.preview.right_url) {
            preview.rightUrl = response.data.preview.right_url;
          }

          // Handle multiple image split for wide images
          if (
            response.data.preview.urls &&
            response.data.preview.urls.length > 0
          ) {
            preview.multiUrls = response.data.preview.urls;
          }

          setSplitImagePreview(preview);
        } else {
          toast.error("Failed to get split image preview");
        }
      } catch (err) {
        console.error("Error getting split image preview:", err);
        toast.error("Failed to get split image preview");
      } finally {
        setIsSplittingImage(false);
      }
    },
    [],
  );

  // Split an image to portrait format and create new media entries
  const splitImageToPortrait = async (
    mediaId: string,
    singleMode: boolean,
    excludedIndices?: number[],
  ) => {
    try {
      // Get current preview URLs
      if (!splitImagePreview) {
        toast.error("No preview available to split");
        return false;
      }

      // Prepare the list of preview URLs
      const allPreviewUrls = [splitImagePreview.centerUrl];

      if (
        splitImagePreview.multiUrls &&
        splitImagePreview.multiUrls.length > 0
      ) {
        allPreviewUrls.push(...splitImagePreview.multiUrls);
      } else {
        if (splitImagePreview.leftUrl)
          allPreviewUrls.push(splitImagePreview.leftUrl);
        if (splitImagePreview.rightUrl)
          allPreviewUrls.push(splitImagePreview.rightUrl);
      }

      // Call the API with the preview URLs
      const response = await ddApiClient.post(
        `/api/media/${mediaId}/split_to_portrait/`,
        {
          single_mode: singleMode,
          excluded_indices: excludedIndices || [],
          preview_urls: allPreviewUrls,
        },
      );

      if (response.data.success) {
        toast.success("Image split successfully");
        return true;
      } else {
        toast.error("Failed to split image");
        return false;
      }
    } catch (error) {
      console.error("Error splitting image:", error);
      toast.error("Failed to split image");
      return false;
    }
  };

  // Cancel splitting operation
  const cancelSplitImage = useCallback(() => {
    setSplitImagePreview(null);
  }, []);

  // Determine which items to display based on search status
  const displayedItems = searchQuery ? searchResults : mediaItems;

  return {
    mediaItems: displayedItems,
    searchQuery,
    searchMetadata,
    isLoading: isLoading || isSearching,
    error,
    hasMore: searchQuery ? false : hasMore,
    loadMore,
    refetch,
    handleSearch,
    // Add new split image functions
    splitImagePreview,
    isSplittingImage,
    getImageSplitPreview,
    splitImageToPortrait,
    cancelSplitImage,
    updateMediaName,
  };
};
