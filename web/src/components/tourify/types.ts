// Define MusicTrack here instead of importing it
// import { MusicTrack } from "./MusicSelector";

export interface ImageItem {
  id: string;
  src: string;
  file: File;
  isValid?: boolean;
  cloudUrl?: string;
  mediaId?: string;
  propertyImageId?: string;
  metadata?: {
    width?: number;
    height?: number;
    propertyType?: string;
    roomType?: string;
    qualityScore?: number;
    invalidReason?: string;
    propertyImageId?: string;
  };
}

export interface GeneratedVideo {
  url: string;
  thumbnailUrl?: string;
  duration?: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  audio_file: string;
  preview_url?: string;
  main_artists?: string[];
  featured_artists?: string[];
  has_vocals?: boolean;
  is_explicit?: boolean;
  duration?: number;
  bpm?: number;
  key?: string;
  genre?: string;
}

export interface TourifyState {
  images: ImageItem[];
  selectedMusicTrackId: string | null;
  aspectRatio: string;
  generatedVideo: GeneratedVideo | null;
  isGenerating: boolean;
  isExporting: boolean;
  isLoadingPropertyImages?: boolean;
}

export interface ValidatedImage {
  id: string;
  originalName: string;
  cloudUrl: string;
  isValid: boolean;
  index?: number;
  width: number;
  height: number;
  size: number;
  type: string;
  metadata: {
    propertyType: string;
    roomType: string;
    qualityScore: number;
    invalidReason?: string;
  };
}

export interface ApiResponse {
  status: string;
  data: {
    validatedImages: ValidatedImage[];
    musicTrack?: MusicTrack;
  };
}

export type PipelineStatus =
  | "created"
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface VideoPipelineResponse {
  id: string;
  status: PipelineStatus;
  video_project_id: string;
  render_video: {
    video_url?: string;
    thumbnail_url?: string;
    status?: string;
  };
  input_payload: {
    media_files: string[];
    track_id: string;
  };
  media_files: ValidatedImage[];
  data?: {
    validatedImages: ValidatedImage[];
  };
  pipeline_id?: string;
  error_message?: string;
}

export interface PropertyImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}
