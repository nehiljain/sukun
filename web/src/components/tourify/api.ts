// Import MusicTrack from types instead
// import { MusicTrack } from "./MusicSelector";
import {
  ImageItem,
  VideoPipelineResponse,
  MusicTrack,
  PropertyImage,
} from "./types";
import { getOrCreateSessionKey } from "../../lib/session";
import { IVideoPipelineRun } from "@/types/video-gen";
import { ddApiClient } from "@/lib/api-client";

// Fetch music tracks from the API
export const fetchMusicTracks = async (): Promise<MusicTrack[]> => {
  const response = await ddApiClient.get<MusicTrack[]>(
    `${window.location.origin}/api/tracks/`,
  );
  return response.data;
};

// Upload media and get validated images
export const uploadMedia = async (data: {
  images: ImageItem[];
  selectedMusicTrackId: string;
  aspectRatio: string;
}): Promise<VideoPipelineResponse> => {
  console.group("Video Pipeline Creation");
  console.log("Input data:", {
    numberOfImages: data.images.length,
    imageDetails: data.images.map((img) => ({
      name: img.file.name,
      type: img.file.type,
      size: img.file.size,
      mediaId: img.mediaId,
      propertyImageId: img.propertyImageId,
    })),
    selectedMusicTrackId: data.selectedMusicTrackId,
    aspectRatio: data.aspectRatio,
  });

  const formData = new FormData();

  // Add session key
  const sessionKey = getOrCreateSessionKey();
  formData.append("session_key", sessionKey);

  // Add track ID
  formData.append("track_id", data.selectedMusicTrackId);
  formData.append("aspect_ratio", data.aspectRatio);

  // Add property image IDs for images fetched from realtor.com
  const propertyImageIds = data.images
    .filter((img) => img.propertyImageId)
    .map((img) => img.propertyImageId);

  if (propertyImageIds.length > 0) {
    formData.append("property_image_ids", JSON.stringify(propertyImageIds));
  }

  // Add each image file to the FormData with the correct key format
  // Only add files for images that don't have a propertyImageId
  data.images
    .filter((img) => !img.propertyImageId)
    .forEach((img, index) => {
      formData.append(`media_files[${index}]`, img.file);
    });

  // Log FormData contents
  console.log("FormData contents:");
  for (const pair of formData.entries()) {
    console.log(
      pair[0],
      pair[1] instanceof File
        ? {
            name: pair[1].name,
            type: pair[1].type,
            size: pair[1].size,
          }
        : pair[1],
    );
  }

  try {
    console.log("Making API request to:", "/api/video-pipeline-runs/");
    const response = await ddApiClient.post<VideoPipelineResponse>(
      "/api/video-pipeline-runs/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    console.log("API Response:", response.data);
    console.groupEnd();
    return response.data;
  } catch (error: unknown) {
    // Type guard for error with response property
    type ErrorWithResponse = {
      response?: {
        status?: number;
        data?: {
          data?: {
            validatedImages?: unknown;
          };
        };
      };
      message?: string;
    };

    const typedError = error as ErrorWithResponse;

    console.error("API Error:", {
      status: typedError.response?.status,
      data: typedError.response?.data,
      message: typedError.message,
    });

    // If the error response contains validated images data, return it
    if (
      typedError.response?.status === 400 &&
      typedError.response?.data?.data?.validatedImages
    ) {
      console.groupEnd();
      return typedError.response.data as VideoPipelineResponse;
    }
    console.groupEnd();
    throw error;
  }
};

// Generate video
export const generateVideo = async (pipelineId: string) => {
  const formData = new FormData();
  formData.append("session_key", getOrCreateSessionKey());

  const response = await ddApiClient.post(
    `/api/video-pipeline-runs/${pipelineId}/run/`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};

// Fetch pipeline status
export const fetchPipelineStatus = async (
  pipelineId: string,
): Promise<VideoPipelineResponse> => {
  const response = await ddApiClient.get<VideoPipelineResponse>(
    `/api/video-pipeline-runs/${pipelineId}/`,
  );
  return response.data;
};

export const fetchVideoPipelineList = async (): Promise<
  IVideoPipelineRun[]
> => {
  const response = await ddApiClient.get<IVideoPipelineRun[]>(
    "/api/video-pipeline-runs/",
  );
  return response.data;
};

export const updateSessionEmail = async (email: string): Promise<void> => {
  await ddApiClient.patch("/api/anonymous-session/update-email/", { email });
};

// Fetch property images from realtor.com URL
export const fetchPropertyImages = async (
  url: string,
): Promise<PropertyImage[]> => {
  const response = await ddApiClient.post<PropertyImage[]>(
    "/api/properties/realtor/",
    { url },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};
