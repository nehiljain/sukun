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

export interface IVideoProjectMetadata {
  [key: string]: any;
}

export interface IVideoProject {
  id: string;
  name: string;
  description: string | null;
  status: VideoProjectStatus;
  aspect_ratio: "16:9" | "9:16" | "1:1";
  created_at: string;
  updated_at: string;
  metadata?: IVideoProjectMetadata;
  brand_asset?: string;
  org?: string;
  is_public: boolean;
  is_template: boolean;
  preview_url?: string;
  latest_render_preview_url?: string;
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
}

export interface DashboardData {
  recentProjects: IVideoProject[];
  templates: IVideoProject[];
}