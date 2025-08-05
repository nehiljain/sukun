export enum VideoProjectStatus {
  DRAFT = "draft",
  PROCESSING = "processing",
  GENERATED = "generated",
  ACCEPTED = "accepted",
  CHANGES_REQUESTED = "changes_requested",
  COMPLETE = "complete",
  ERROR = "error",
  DELETED = "deleted",
}

// Define interface based on the Django VideoProject model
export interface IVideoProject {
  id: string; // UUID from backend
  name: string;
  description: string | null;
  status: VideoProjectStatus;
  aspect_ratio: "16:9" | "9:16" | "1:1";
  created_at: string;
  updated_at: string;
  metadata?: IVideoProjectMetadata;
  brand_asset?: string; // Add brand asset ID reference
  org?: string;
  is_public: boolean;
  is_template: boolean;
  preview_url?: string; // URL for video preview
  latest_render_preview_url?: string; // URL for the latest non-errored render video
  media?: string[];
  state?: {
    fps: number;
    overlays: Array<{
      id: number;
      type: string;
      src?: string;
      top: number;
      left: number;
      width: number;
      height: number;
      content?: string;
      styles: Record<string, any>;
      from: number;
      durationInFrames: number;
      [key: string]: any;
    }>;
    aspectRatio: string;
    durationInFrames: number;
    [key: string]: any;
  };
  // Include other fields as needed
}

export interface IVideoProjectMetadata {
  template_metadata: {
    features: string[];
    description: string;
    images: number;
    tracks: number;
    duration: number;
    mood?: string;
    genre?: string;
    track_id?: string;
  };
}

// Add new interface for brand assets
export interface IBrandAsset {
  id: string;
  name: string;
  // Add other brand asset fields as needed
}

export interface ITemplate extends IVideoProject {
  metadata: {
    tags: string[];
    media_files: IMediaFile[];
    text_clips: string[];
  };
}

export interface IMediaFile {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  thumbnail_url: string;
  storage_url_path: string;
  created_at: string;
}

export interface IMetadata {
  tags: string[];
  media_files: IMediaFile[];
  genres: string[];
  moods: string[];
}

export interface IRenderVideo {
  id: string;
  name: string;
  status:
    | "pending"
    | "processing"
    | "generated"
    | "accepted"
    | "rejected"
    | "error";
  video_url?: string;
  thumbnail_url?: string;
  aspect_ratio?: string;
  created_at: string;
}

export interface IVideoPipelineRun {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  created_at: string;
  input_payload: {
    media_files: IMediaFile[];
    track_id: string;
  };
  video_project: IVideoProject;
  render_video: IRenderVideo;
}

export type VideoProjectState = {
  overlays: any[];
  durationInFrames: number;
  fps: number;
  aspectRatio: string;
  [key: string]: any; // Allow for additional properties
};
