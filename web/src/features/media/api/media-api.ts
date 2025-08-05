import { format } from "date-fns";
import { api } from "@/lib/api";
import type { 
  IMediaItem, 
  MediaFilters, 
  PaginatedMediaResponse, 
  SplitImagePreviewResponse,
  SplitImageResponse 
} from "../types";

export const mediaApi = {
  // Get paginated media library
  getMediaLibrary: async (filters: MediaFilters = {}, page = 1) => {
    const params = new URLSearchParams();
    params.append("page", page.toString());

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

    const response = await api.get<PaginatedMediaResponse>(
      `/api/media/library/?${params.toString()}`
    );
    
    return response.data;
  },

  // Search media with semantic search support
  searchMedia: async (query: string, filters: MediaFilters = {}) => {
    if (!query.trim()) {
      return { results: [], search_metadata: null };
    }

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

    const response = await api.get<PaginatedMediaResponse | IMediaItem[]>(
      `/api/media/search/?${params.toString()}`
    );

    // Handle both paginated and non-paginated search responses
    if (Array.isArray(response.data)) {
      // Legacy format
      return { results: response.data, search_metadata: null };
    }
    
    return response.data;
  },

  // Update media name
  updateMediaName: async (mediaId: string, name: string) => {
    const response = await api.patch<IMediaItem>(`/api/media/${mediaId}/`, {
      name,
    });
    
    return response.data;
  },

  // Get split image preview
  getSplitImagePreview: async (mediaId: string, singleMode = false) => {
    const response = await api.post<SplitImagePreviewResponse>(
      `/api/media/${mediaId}/split_to_portrait/`,
      {
        preview_only: true,
        single_mode: singleMode,
      }
    );
    
    return response.data;
  },

  // Split image to portrait format
  splitImageToPortrait: async (
    mediaId: string, 
    singleMode: boolean, 
    excludedIndices: number[] = [],
    previewUrls: (string | undefined)[]
  ) => {
    const response = await api.post<SplitImageResponse>(
      `/api/media/${mediaId}/split_to_portrait/`,
      {
        single_mode: singleMode,
        excluded_indices: excludedIndices,
        preview_urls: previewUrls,
      }
    );
    
    return response.data;
  },
};