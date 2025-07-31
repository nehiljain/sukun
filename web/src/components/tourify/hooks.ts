import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMusicTracks,
  uploadMedia,
  generateVideo,
  fetchPipelineStatus,
  fetchVideoPipelineList,
  updateSessionEmail,
} from "@/components/tourify/api";
import { MusicTrack } from "./MusicSelector";
import { useCallback, useEffect, useState } from "react";
import {
  ImageItem,
  ValidatedImage,
  VideoPipelineResponse,
  ApiResponse,
} from "./types";
import { IVideoPipelineRun } from "@/types/video-gen";

// Local storage keys
const SELECTED_TRACK_KEY = "tourify_selected_track";
const VALIDATED_IMAGES_KEY = "tourify_validated_images";
const SELECTED_ASPECT_RATIO_KEY = "tourify_selected_aspect_ratio";
const SESSION_EMAIL_KEY = "tourify_session_email";

// Query keys for better organization
export const QUERY_KEYS = {
  musicTracks: ["musicTracks"],
  selectedTrack: ["selectedMusicTrack"],
  selectedAspectRatio: ["selectedAspectRatio"],
  validatedMedia: ["validatedMedia"],
  generatedVideo: ["generatedVideo"],
};

// Hook for fetching music tracks with React Query
export const useMusicTracks = () => {
  return useQuery<MusicTrack[], Error>({
    queryKey: QUERY_KEYS.musicTracks,
    queryFn: fetchMusicTracks,
    select: (data) =>
      data.map((track) => ({
        ...track,
        // Ensure we have default values for optional fields
        main_artists: track.main_artists || [],
        featured_artists: track.featured_artists || [],
        has_vocals: track.has_vocals || false,
        is_explicit: track.is_explicit || false,
        // Use preview_url if available, fallback to audio_file
        preview_url: track.preview_url || track.audio_file,
      })),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    throwOnError: true, // This will throw errors instead of returning them in the error field
  });
};

// Hook for managing the selected music track with localStorage persistence
export const useSelectedMusicTrack = (defaultTrackId: string | null = null) => {
  const queryClient = useQueryClient();

  // Get tracks from the cache or fetch them
  const { data: tracks } = useMusicTracks();

  // Local state for selected track ID
  const [trackId, setTrackId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SELECTED_TRACK_KEY) || defaultTrackId || null;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return defaultTrackId || null;
    }
  });

  // Save selection to localStorage
  const saveSelectedTrackId = useCallback((id: string) => {
    try {
      localStorage.setItem(SELECTED_TRACK_KEY, id);
      setTrackId(id);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, []);

  // Find selected track object from the tracks array
  const getSelectedTrack = useCallback(
    (id: string | null) => {
      if (!id || !Array.isArray(tracks) || tracks.length === 0) return null;

      const track = tracks.find((t) => t.id === id);
      return track || null;
    },
    [tracks],
  );

  // Select track function
  const selectTrack = useCallback(
    (id: string) => {
      saveSelectedTrackId(id);
      queryClient.setQueryData(QUERY_KEYS.selectedTrack, id);
    },
    [saveSelectedTrackId, queryClient],
  );

  // Initialize query data with trackId
  useEffect(() => {
    if (trackId) {
      queryClient.setQueryData(QUERY_KEYS.selectedTrack, trackId);
    }
  }, [trackId, queryClient]);

  // Update trackId if we have tracks but no selection
  useEffect(() => {
    if (tracks && Array.isArray(tracks) && tracks.length > 0 && !trackId) {
      selectTrack(tracks[0].id);
    }
  }, [tracks, trackId, selectTrack]);

  return {
    selectedTrackId: trackId,
    selectTrack,
    selectedTrack: getSelectedTrack(trackId),
  };
};

// Hook to retrieve validated images from local storage
export const usePersistedValidatedImages = () => {
  const [validatedImages, setValidatedImages] = useState<any[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedImages = localStorage.getItem(VALIDATED_IMAGES_KEY);
      if (storedImages) {
        setValidatedImages(JSON.parse(storedImages));
      }
    } catch (error) {
      console.error("Error reading validated images from localStorage:", error);
    }
  }, []);

  // Save validated images to localStorage
  const saveValidatedImages = useCallback((images: any[]) => {
    try {
      localStorage.setItem(VALIDATED_IMAGES_KEY, JSON.stringify(images));
      setValidatedImages(images);
    } catch (error) {
      console.error("Error saving validated images to localStorage:", error);
    }
  }, []);

  // Clear validated images from localStorage
  const clearValidatedImages = useCallback(() => {
    try {
      localStorage.removeItem(VALIDATED_IMAGES_KEY);
      setValidatedImages([]);
    } catch (error) {
      console.error(
        "Error clearing validated images from localStorage:",
        error,
      );
    }
  }, []);

  return {
    validatedImages,
    saveValidatedImages,
    clearValidatedImages,
  };
};

// Hook for media upload with caching
export const useMediaUpload = () => {
  const queryClient = useQueryClient();
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  return useMutation<
    VideoPipelineResponse,
    Error,
    { images: ImageItem[]; selectedMusicTrackId: string; aspectRatio: string }
  >({
    mutationFn: (data) => {
      console.group("Media Upload Mutation");
      console.log("Starting upload with:", {
        numberOfImages: data.images.length,
        trackId: data.selectedMusicTrackId,
        aspectRatio: data.aspectRatio,
      });
      return uploadMedia(data);
    },
    onMutate: (variables) => {
      console.log("Mutation starting:", {
        images: variables.images.length,
        trackId: variables.selectedMusicTrackId,
        aspectRatio: variables.aspectRatio,
      });
    },
    onError: (error: any) => {
      console.error("Mutation error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      if (error.response?.data?.data?.validatedImages) {
        console.log("Received validation data with error");
        console.groupEnd();
        return error.response.data;
      }
      console.groupEnd();
      throw error;
    },
    onSuccess: (data) => {
      console.log("Mutation succeeded:", {
        status: data.status,
        pipelineId: data.id,
        mediaFiles: data.media_files,
      });

      queryClient.setQueryData(QUERY_KEYS.validatedMedia, data);
      if (data.id) {
        setPipelineId(data.id);
        console.log("Pipeline ID set:", data.id);
      }

      // Store media files with cloud URLs in localStorage
      if (data.media_files) {
        try {
          const mediaInfo = data.media_files.map((media: ValidatedImage) => ({
            id: media.id,
            src: media.cloudUrl,
            type: media.type,
            metadata: media.metadata,
            isValid: true, // Since these are already validated and uploaded
          }));

          localStorage.setItem(VALIDATED_IMAGES_KEY, JSON.stringify(mediaInfo));
          console.log(
            "Media files with cloud URLs saved to localStorage:",
            mediaInfo,
          );
        } catch (error) {
          console.error("Error saving media files to localStorage:", error);
        }
      }

      // Keep in cache for 10 minutes
      setTimeout(
        () => {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.validatedMedia,
          });
          console.log("Validated media cache invalidated");
        },
        10 * 60 * 1000,
      );
      console.groupEnd();
    },
    onSettled: () => {
      console.log("Mutation settled");
      console.groupEnd();
    },
  });
};

// Get cached validated media data
export const useValidatedMedia = () => {
  const queryClient = useQueryClient();
  const cachedData = queryClient.getQueryData<ApiResponse>(
    QUERY_KEYS.validatedMedia,
  );

  // If no cached data, try to get from localStorage
  if (!cachedData) {
    try {
      const storedImages = localStorage.getItem(VALIDATED_IMAGES_KEY);
      if (storedImages) {
        const parsedImages = JSON.parse(storedImages);
        return {
          status: "success",
          data: {
            validatedImages: parsedImages,
          },
        } as ApiResponse;
      }
    } catch (error) {
      console.error("Error reading validated images from localStorage:", error);
    }
  }

  return cachedData;
};

// Hook for video generation
export const useVideoGeneration = () => {
  const queryClient = useQueryClient();
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  // Setup pipeline status polling
  const pipelineStatus = useQuery({
    queryKey: ["pipeline-status", pipelineId],
    queryFn: () => {
      if (!pipelineId) throw new Error("No pipeline ID provided");
      return fetchPipelineStatus(pipelineId);
    },
    enabled: !!pipelineId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when we reach a terminal state
      if (!data || data.status === "completed" || data.status === "failed") {
        return false;
      }
      // Poll every 5 seconds while in non-terminal states
      return 5000;
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the data
  });

  // Mutation for running the video pipeline
  const runPipelineMutation = useMutation({
    mutationFn: generateVideo,
    onSuccess: (data) => {
      console.log("Pipeline run started:", data);
      // After successfully running the pipeline, update the pipeline ID to start polling
      if (data.id) {
        setPipelineId(data.id);
      }
    },
  });

  // Mutation for initial media upload
  const uploadMutation = useMutation<
    VideoPipelineResponse,
    Error,
    { images: ImageItem[]; selectedMusicTrackId: string; aspectRatio: string }
  >({
    mutationFn: uploadMedia,
    onSuccess: async (data) => {
      console.log("Media uploaded:", data);
      // After successful upload, run the pipeline
      if (data.id) {
        setPipelineId(data.id); // Set pipeline ID immediately after upload
        try {
          await runPipelineMutation.mutateAsync(data.id);
        } catch (error) {
          console.error("Failed to run pipeline:", error);
          throw error;
        }
      }
    },
  });

  // Reset function to clear pipeline state
  const reset = useCallback(() => {
    setPipelineId(null);
    queryClient.removeQueries({ queryKey: ["pipeline-status"] });
  }, [queryClient]);

  const uploadAndGenerate = useCallback(
    async (data: {
      images: ImageItem[];
      selectedMusicTrackId: string;
      aspectRatio: string;
    }) => {
      try {
        const result = await uploadMutation.mutateAsync(data);
        return result;
      } catch (error) {
        console.error("Upload and generate failed:", error);
        throw error;
      }
    },
    [uploadMutation],
  );

  return {
    uploadAndGenerate,
    isLoading:
      uploadMutation.status === "pending" ||
      runPipelineMutation.status === "pending",
    error: uploadMutation.error || runPipelineMutation.error,
    pipelineStatus: pipelineStatus.data,
    isPipelineLoading: pipelineStatus.isLoading,
    pipelineId,
    reset,
  };
};

// Hook for managing the selected aspect ratio with localStorage persistence
export const useSelectedAspectRatio = (defaultRatio: string = "16:9") => {
  const queryClient = useQueryClient();

  // Local state for selected aspect ratio
  const [aspectRatio, setAspectRatio] = useState<string>(() => {
    try {
      return localStorage.getItem(SELECTED_ASPECT_RATIO_KEY) || defaultRatio;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return defaultRatio;
    }
  });

  // Save selection to localStorage
  const saveSelectedAspectRatio = useCallback((ratio: string) => {
    try {
      localStorage.setItem(SELECTED_ASPECT_RATIO_KEY, ratio);
      setAspectRatio(ratio);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, []);

  // Select aspect ratio function
  const selectAspectRatio = useCallback(
    (ratio: string) => {
      saveSelectedAspectRatio(ratio);
      queryClient.setQueryData(QUERY_KEYS.selectedAspectRatio, ratio);
    },
    [saveSelectedAspectRatio, queryClient],
  );

  // Initialize query data with aspectRatio
  useEffect(() => {
    if (aspectRatio) {
      queryClient.setQueryData(QUERY_KEYS.selectedAspectRatio, aspectRatio);
    }
  }, [aspectRatio, queryClient]);

  return {
    selectedAspectRatio: aspectRatio,
    selectAspectRatio,
  };
};

export const useVideoPipelineList = () => {
  return useQuery<IVideoPipelineRun[]>({
    queryKey: ["videoPipelineList"],
    queryFn: fetchVideoPipelineList,
  });
};

// Hook for updating session email
export const useUpdateSessionEmail = () => {
  return useMutation({
    mutationFn: updateSessionEmail,
    onError: (error: Error) => {
      console.error("Failed to update session email:", error);
      throw error;
    },
  });
};

// Add this new hook after the other hooks
export const useSessionEmail = () => {
  const [email, setEmail] = useState<string>(() => {
    try {
      return localStorage.getItem(SESSION_EMAIL_KEY) || "";
    } catch (error) {
      console.error("Error reading email from localStorage:", error);
      return "";
    }
  });

  const saveEmail = useCallback((newEmail: string) => {
    try {
      localStorage.setItem(SESSION_EMAIL_KEY, newEmail);
      setEmail(newEmail);
    } catch (error) {
      console.error("Error saving email to localStorage:", error);
    }
  }, []);

  return {
    email,
    saveEmail,
  };
};
