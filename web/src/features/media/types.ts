export interface IMediaItem {
  id: string;
  name: string;
  storage_url_path: string;
  thumbnail_url: string;
  type: MediaType | string;
  tags: ITag[];
  created_at: string;
  aspect_ratio?: string;
  resolution?: string;
  caption_metadata?: Record<string, unknown>;
  metadata?: {
    image_splits?: Record<string, unknown>[];
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
    // Studio recording fields
    raw_url?: string;
    "720p_url"?: string;
    "1080p_url"?: string;
    device_identifier?: string;
    audio_url?: string;
    transcript_url?: string;
    s3_folder_path?: string;
    original_resolution?: string;
    video_project_id?: string;
    motion_magic_video_urls?: string[];
  };
}

export interface ITag {
  key: string;
  value: string;
}

export type MediaType = "image" | "video" | "audio" | "studio_recording";

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

export interface PaginatedMediaResponse {
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

export interface SplitImagePreviewResponse {
  success: boolean;
  preview: {
    center_url?: string;
    left_url?: string;
    right_url?: string;
    urls?: string[];
  };
  is_wide: boolean;
}

export interface SplitImageResponse {
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