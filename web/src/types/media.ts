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

export interface IVideoProject {
  id: string;
  name: string;
}
