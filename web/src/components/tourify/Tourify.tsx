import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "./ImageUpload";
import { ImageGallery } from "./ImageGallery";
import { MusicSelector } from "./MusicSelector";
import { VideoPreview } from "./VideoPreview";
import { ZillowUrlInput } from "./ZillowUrlInput";
import { ImageItem, TourifyState, MusicTrack } from "./types";
import { Download, Play, Mail, X, RotateCcw, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useMusicTracks,
  useSelectedMusicTrack,
  useMediaUpload,
  useVideoGeneration,
  usePersistedValidatedImages,
  useValidatedMedia,
  useUpdateSessionEmail,
  QUERY_KEYS,
  useSessionEmail,
} from "./hooks";
import { useQueryClient } from "@tanstack/react-query";
import posthog from "posthog-js";
import { getOrCreateSessionKey } from "../../lib/session";
import { useAuth } from "@/contexts/AuthContext";
import { VideoProjectsList } from "./VideoProjectsList";
import {
  getClosestAspectRatio,
  hasMixedAspectRatios,
} from "./utils/aspectRatio";
import { handleDownload } from "@/utils/download";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Configuration constants
const FREE_IMAGES_LIMIT = 5;

// Interface for validated media data
interface ValidatedMediaResponse {
  status: string;
  data?: {
    validatedImages?: Array<{
      id: string;
      cloudUrl: string;
      originalName: string;
      isValid: boolean;
      metadata?: { width: number; height: number };
    }>;
    musicTrack?: MusicTrack;
  };
}

// External audio controller to coordinate audio across components
export const audioController = {
  audioElement: null as HTMLAudioElement | null,
  stop: () => {
    if (audioController.audioElement) {
      audioController.audioElement.pause();
      audioController.audioElement.currentTime = 0;
    }
  },
};

export function Tourify() {
  const { isAuthenticated } = useAuth();
  const [showPastRuns, setShowPastRuns] = useState(false);
  // React Query hooks
  const queryClient = useQueryClient();
  const { data: musicTracks, isLoading: isLoadingTracks } = useMusicTracks();
  const { selectedTrackId, selectTrack } = useSelectedMusicTrack();
  const mediaUploadMutation = useMediaUpload();
  const videoGenerationMutation = useVideoGeneration();
  const { clearValidatedImages } = usePersistedValidatedImages();
  const updateSessionEmail = useUpdateSessionEmail();
  const { email, saveEmail } = useSessionEmail();

  // Update state when video is ready
  useEffect(() => {
    const pipelineStatus = videoGenerationMutation.pipelineStatus;
    const videoUrl = pipelineStatus?.render_video?.video_url;
    if (pipelineStatus && pipelineStatus.status === "completed" && videoUrl) {
      setState((prev) => ({
        ...prev,
        generatedVideo: {
          url: videoUrl,
          thumbnailUrl: pipelineStatus.render_video?.thumbnail_url || undefined,
        },
      }));
    }
  }, [videoGenerationMutation.pipelineStatus]);

  // Get saved validated images from cache or localStorage
  const validatedMediaData = useValidatedMedia() as
    | ValidatedMediaResponse
    | undefined;

  const [state, setState] = useState<TourifyState>({
    images: [],
    selectedMusicTrackId: selectedTrackId,
    aspectRatio: "16:9",
    generatedVideo: null,
    isGenerating: false,
    isExporting: false,
    isLoadingPropertyImages: false,
  });

  // Load validated images from localStorage on mount
  useEffect(() => {
    const validatedData = validatedMediaData;
    if (
      validatedData?.status === "success" &&
      validatedData.data?.validatedImages &&
      validatedData.data.validatedImages.length > 0 &&
      state.images.length === 0
    ) {
      // Convert validated images from the API to ImageItem objects for the UI
      const restoredImages: ImageItem[] =
        validatedData.data.validatedImages.map((validatedImg) => ({
          id: validatedImg.id,
          src: validatedImg.cloudUrl,
          file: new File([], validatedImg.originalName, { type: "image/jpeg" }),
          isValid: validatedImg.isValid,
          cloudUrl: validatedImg.cloudUrl,
          metadata: validatedImg.metadata || { width: 0, height: 0 },
        }));

      setState((prev) => ({
        ...prev,
        images: restoredImages,
        aspectRatio:
          restoredImages[0]?.metadata?.width &&
          restoredImages[0]?.metadata?.height
            ? getClosestAspectRatio(
                restoredImages[0].metadata.width,
                restoredImages[0].metadata.height,
              )
            : prev.aspectRatio,
      }));
      setShowImageUpload(false);

      toast({
        title: "Images Restored",
        description:
          "Your previous images have been loaded from cloud storage.",
      });

      console.log("Restored images from cloud storage:", restoredImages);
    }
  }, [validatedMediaData, state.images.length]);

  // Keep state in sync with the react-query state
  useEffect(() => {
    if (selectedTrackId) {
      setState((prev) => ({ ...prev, selectedMusicTrackId: selectedTrackId }));
    }
  }, [selectedTrackId]);

  const [showImageUpload, setShowImageUpload] = useState(true);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);

  // Add a computed aspect ratio based on first image
  const computedAspectRatio = useMemo(() => {
    const firstImage = state.images[0];
    if (!firstImage?.metadata?.width || !firstImage?.metadata?.height) {
      return "16:9"; // Default fallback
    }
    return getClosestAspectRatio(
      firstImage.metadata.width,
      firstImage.metadata.height,
    );
  }, [state.images]);

  // Email validation function
  const validateEmail = (email: string) => {
    if (!email) return true; // Empty email is valid (optional)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    // Always save the email value as user types
    saveEmail(newEmail);
    // Just update validation state without affecting the input
    setIsEmailValid(validateEmail(newEmail));
  };

  // Modify handleImagesUploaded to check dimensions and warn about mixed ratios
  const handleImagesUploaded = useCallback(
    async (files: File[]) => {
      // Free user check remains the same
      if (
        !isAuthenticated &&
        state.images.length + files.length > FREE_IMAGES_LIMIT
      ) {
        const allowedFiles = files.slice(
          0,
          FREE_IMAGES_LIMIT - state.images.length,
        );

        toast({
          title: "Free Account Limit",
          description: `You can only add ${FREE_IMAGES_LIMIT} images with a free account. Sign in for unlimited images.`,
          variant: "destructive",
        });

        if (allowedFiles.length === 0) return;

        const newImagesPromises = allowedFiles.map(async (file) => {
          const dimensions = await new Promise<{
            width: number;
            height: number;
          }>((resolve) => {
            const img = new Image();
            img.onload = () =>
              resolve({ width: img.width, height: img.height });
            img.onerror = () => resolve({ width: 0, height: 0 }); // Handle load errors
            img.src = URL.createObjectURL(file);
          });
          return {
            id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            src: URL.createObjectURL(file),
            file,
            metadata: dimensions,
          };
        });

        const newImages = await Promise.all(newImagesPromises);

        // Check for mixed aspect ratios
        const allImages = [...state.images, ...newImages];
        const imagesWithMetadata = allImages.filter(
          (img) => img.metadata?.width && img.metadata?.height,
        ) as { metadata: { width: number; height: number } }[];

        if (hasMixedAspectRatios(imagesWithMetadata)) {
          toast({
            title: "Warning: Mixed Aspect Ratios",
            description:
              "Some images have different aspect ratios. The video will use the aspect ratio of the first image.",
            variant: "default",
          });
        }

        setState((prev) => ({
          ...prev,
          images: [...prev.images, ...newImages],
          aspectRatio:
            prev.images.length === 0 &&
            newImages[0]?.metadata?.width &&
            newImages[0]?.metadata?.height
              ? getClosestAspectRatio(
                  newImages[0].metadata.width,
                  newImages[0].metadata.height,
                )
              : prev.aspectRatio,
        }));
      } else {
        // Process each file to get dimensions
        const newImagesPromises = files.map(async (file) => {
          const dimensions = await new Promise<{
            width: number;
            height: number;
          }>((resolve) => {
            const img = new Image();
            img.onload = () =>
              resolve({ width: img.width, height: img.height });
            img.onerror = () => resolve({ width: 0, height: 0 }); // Handle load errors
            img.src = URL.createObjectURL(file);
          });
          return {
            id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            src: URL.createObjectURL(file),
            file,
            metadata: dimensions,
          };
        });

        const newImages = await Promise.all(newImagesPromises);

        // Check for mixed aspect ratios
        const allImages = [...state.images, ...newImages];
        const imagesWithMetadata = allImages.filter(
          (img) => img.metadata?.width && img.metadata?.height,
        ) as { metadata: { width: number; height: number } }[];

        if (hasMixedAspectRatios(imagesWithMetadata)) {
          toast({
            title: "Warning: Mixed Aspect Ratios",
            description:
              "Some images have different aspect ratios. The video will use the aspect ratio of the first image.",
            variant: "default",
          });
        }

        setState((prev) => ({
          ...prev,
          images: [...prev.images, ...newImages],
          aspectRatio:
            prev.images.length === 0 &&
            newImages[0]?.metadata?.width &&
            newImages[0]?.metadata?.height
              ? getClosestAspectRatio(
                  newImages[0].metadata.width,
                  newImages[0].metadata.height,
                )
              : prev.aspectRatio,
        }));
      }

      setShowImageUpload(false);
    },
    [isAuthenticated, state.images],
  );

  // Handle images changes from the gallery
  const handleImagesChange = useCallback(
    (images: ImageItem[]) => {
      const prevCount = state.images.length;
      const newCount = images.length;

      // If images were deleted (count decreased), clear validated images
      if (newCount < prevCount) {
        // Clear validated images from local storage and cache
        clearValidatedImages();
        queryClient.removeQueries({ queryKey: QUERY_KEYS.validatedMedia });

        toast({
          title: "Validated images cleared",
          description: "You'll need to regenerate your video.",
          variant: "default",
        });
      }

      setState((prev) => ({ ...prev, images }));
    },
    [state.images.length, clearValidatedImages, queryClient],
  );

  // Handle music track selection - now uses the React Query hook
  const handleTrackSelect = useCallback(
    (trackId: string) => {
      setState((prev) => ({ ...prev, selectedMusicTrackId: trackId }));
      selectTrack(trackId);
    },
    [selectTrack],
  );

  // Modified handleGenerateVideo to handle conditional email collection
  const handleGenerateVideo = useCallback(async () => {
    // Basic validation checks remain the same
    if (state.images.length === 0) {
      toast({
        title: "Error",
        description:
          "Please upload at least one image before generating a video",
        variant: "destructive",
      });
      return;
    }

    if (!state.selectedMusicTrackId) {
      toast({
        title: "Error",
        description: "Please select a music track before generating a video",
        variant: "destructive",
      });
      return;
    }

    // Check if we need to collect email
    const shouldCollectEmail = !isAuthenticated && !email;

    if (shouldCollectEmail) {
      // Show email input if needed
      setShowEmailInput(true);
      return;
    }

    // Stop any currently playing music
    audioController.stop();

    setState((prev) => ({ ...prev, isGenerating: true }));

    try {
      // If email exists and user is not authenticated, update session
      if (email && !isAuthenticated) {
        await updateSessionEmail.mutateAsync(email);
      }

      // Track video generation start
      posthog.capture("tourify_video_generation_started", {
        image_count: state.images.length,
        music_track_id: state.selectedMusicTrackId,
        aspect_ratio: computedAspectRatio,
        has_email: !!email,
      });

      // Start the video generation process
      await videoGenerationMutation.uploadAndGenerate({
        images: state.images,
        selectedMusicTrackId: state.selectedMusicTrackId,
        aspectRatio: computedAspectRatio,
      });

      // Hide email input
      setShowEmailInput(false);

      // Show success message
      toast({
        title: "Video Generation Started",
        description:
          email && !isAuthenticated
            ? "We'll email you when your video is ready (about 5 minutes)"
            : "Your video will be ready in about 5 minutes",
      });
    } catch (error) {
      // Define error type explicitly
      const typedError = error as Error;
      console.error("Video generation failed:", typedError);
      setState((prev) => ({ ...prev, isGenerating: false }));

      // Track video generation failure
      posthog.capture("tourify_video_generation_failed", {
        error_message: typedError.message || "Unknown error",
        aspect_ratio: computedAspectRatio,
      });

      toast({
        title: "Error",
        description:
          typedError.message || "Failed to generate video. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    state.images,
    state.selectedMusicTrackId,
    computedAspectRatio,
    videoGenerationMutation,
    email,
    isAuthenticated,
    updateSessionEmail,
  ]);

  // Update state when video generation process updates
  useEffect(() => {
    const pipelineStatus = videoGenerationMutation.pipelineStatus;
    const videoUrl = pipelineStatus?.render_video?.video_url;

    // Update generating state based on pipeline status
    const isProcessing =
      pipelineStatus?.status === "created" ||
      pipelineStatus?.status === "pending" ||
      pipelineStatus?.status === "processing";
    setState((prev) => ({ ...prev, isGenerating: isProcessing }));

    if (pipelineStatus) {
      // Track pipeline status changes
      if (pipelineStatus.status === "processing") {
        posthog.capture("tourify_pipeline_processing", {
          pipeline_id: videoGenerationMutation.pipelineId,
        });
      }

      if (pipelineStatus.status === "completed" && videoUrl) {
        // Track successful video generation
        posthog.capture("tourify_video_generation_succeeded", {
          pipeline_id: videoGenerationMutation.pipelineId,
        });

        setState((prev) => ({
          ...prev,
          generatedVideo: {
            url: videoUrl,
            thumbnailUrl:
              pipelineStatus.render_video?.thumbnail_url || undefined,
          },
          isGenerating: false,
        }));
      }

      if (pipelineStatus.status === "failed") {
        // Track pipeline failure
        posthog.capture("tourify_pipeline_failed", {
          pipeline_id: videoGenerationMutation.pipelineId,
          error_message: pipelineStatus.error_message || "Unknown error",
        });
        setState((prev) => ({ ...prev, isGenerating: false }));
      }
    }
  }, [
    videoGenerationMutation.pipelineStatus,
    videoGenerationMutation.pipelineId,
  ]);

  // Export video
  const handleExportVideo = useCallback(() => {
    if (!state.generatedVideo?.url) return;

    setState((prev) => ({ ...prev, isExporting: true }));

    // Use the shared download utility
    handleDownload(
      state.generatedVideo.url,
      `listing-shorts-${videoGenerationMutation.pipelineId}-${Date.now()}.mp4`,
      {
        pipeline_id: videoGenerationMutation.pipelineId || "",
        source: "tourify",
      },
    );

    setState((prev) => ({ ...prev, isExporting: false }));
  }, [state.generatedVideo, videoGenerationMutation.pipelineId]);

  // Stop any music playback when generating video
  useEffect(() => {
    if (state.isGenerating) {
      audioController.stop();
    }
  }, [state.isGenerating]);

  // Add handler to reset state for generating a new video
  const handleGenerateAnother = useCallback(() => {
    setState((prev) => ({
      ...prev,
      generatedVideo: null,
      isExporting: false,
      images: [],
      selectedMusicTrackId: null,
    }));
    videoGenerationMutation.reset();
    setShowImageUpload(state.images.length === 0);
  }, [state.images.length, videoGenerationMutation]);

  // Calculate required image count based on selected music track
  const requiredImageCount = useMemo(() => {
    const selectedTrack = musicTracks?.find(
      (track) => track.id === state.selectedMusicTrackId,
    );
    // The logic in MusicSelector suggests markers.length - 2 is the number of needed images.
    return selectedTrack?.markers ? selectedTrack.markers.length - 2 : 0;
  }, [state.selectedMusicTrackId, musicTracks]);

  // Handle property images loaded from ZillowUrlInput
  const handlePropertyImagesLoaded = useCallback(
    (images: ImageItem[]) => {
      setState((prev) => ({
        ...prev,
        images: [...prev.images, ...images],
      }));

      setShowImageUpload(false);

      // Check for free user limits
      if (!isAuthenticated && images.length > FREE_IMAGES_LIMIT) {
        toast({
          title: "Free Account Limit",
          description: `You're using ${FREE_IMAGES_LIMIT} of ${images.length} available images. Sign in for unlimited images.`,
          variant: "default",
        });
      }
    },
    [isAuthenticated],
  );

  // Handle loading state for property images
  const handlePropertyImagesLoadingChange = useCallback(
    (isLoading: boolean) => {
      setState((prev) => ({
        ...prev,
        isLoadingPropertyImages: isLoading,
      }));
    },
    [],
  );

  return (
    <div className="max-w-3xl mx-auto px-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-200 drop-shadow-sm">
          Listing Shorts
        </h1>
        <p className="text-slate-300 text-base md:text-l mt-2 font-light">
          Create stunning property tour videos in minutes
        </p>

        <div className="mt-4">
          <Tabs
            value={showPastRuns ? "past-runs" : "generate"}
            onValueChange={(value) => setShowPastRuns(value === "past-runs")}
          >
            <TabsList className="bg-slate-900/50 backdrop-blur-sm border border-slate-700">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="past-runs">Past Runs</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {!showPastRuns && (
        <div className="space-y-8">
          {state.generatedVideo ||
          state.isGenerating ||
          videoGenerationMutation.pipelineStatus ? (
            <div className="space-y-6">
              <div className="rounded-xl relative">
                {state.generatedVideo && (
                  <div className="absolute top-4 right-4 z-10">
                    <Button
                      onClick={handleExportVideo}
                      disabled={state.isExporting}
                      className={`p-2.5 rounded-full shadow-md ${
                        state.isExporting
                          ? "bg-slate-700/70 text-white/60 cursor-not-allowed"
                          : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10"
                      }`}
                      aria-label="Download Video"
                      data-ph-capture-attribute-action="export_video"
                      data-ph-capture-attribute-pipeline_id={
                        videoGenerationMutation.pipelineId || ""
                      }
                    >
                      {state.isExporting ? (
                        <span className="flex items-center justify-center w-6 h-6">
                          <span className="h-3 w-3 rounded-full border-2 border-white/60 border-t-transparent animate-spin inline-block"></span>
                        </span>
                      ) : (
                        <Download size={18} className="text-white" />
                      )}
                    </Button>
                  </div>
                )}

                <VideoPreview
                  video={state.generatedVideo}
                  pipelineId={videoGenerationMutation.pipelineId}
                  pipelineStatus={videoGenerationMutation.pipelineStatus}
                  isPipelineLoading={videoGenerationMutation.isLoading}
                  onStopAudio={audioController.stop}
                  aspectRatio={state.aspectRatio}
                />
              </div>

              {state.generatedVideo &&
                videoGenerationMutation.pipelineStatus?.status ===
                  "completed" && (
                  <div className="flex justify-center mt-6">
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={handleGenerateAnother}
                      className="border-slate-600 hover:bg-slate-800/50 hover:text-slate-100"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Generate Another Video
                    </Button>
                  </div>
                )}
            </div>
          ) : (
            <>
              <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  {showImageUpload && state.images.length === 0 ? (
                    <div className="space-y-8">
                      <ZillowUrlInput
                        onImagesLoaded={handlePropertyImagesLoaded}
                        onLoadingChange={handlePropertyImagesLoadingChange}
                      />

                      <div className="flex items-center my-4">
                        <div className="flex-grow border-t border-slate-700"></div>
                        <span className="mx-4 text-xs text-slate-400">OR</span>
                        <div className="flex-grow border-t border-slate-700"></div>
                      </div>

                      <ImageUpload
                        onImagesUploaded={handleImagesUploaded}
                        requiredImageCount={requiredImageCount}
                        isAuthenticated={isAuthenticated}
                        maxFreeImages={FREE_IMAGES_LIMIT}
                        data-ph-capture-attribute-feature="image_upload"
                        data-ph-capture-attribute-user_type={
                          isAuthenticated ? "pro" : "free"
                        }
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-medium text-slate-200">
                          Image Gallery ({state.images.length}{" "}
                          {state.images.length === 1 ? "image" : "images"})
                        </div>
                        {/* <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowImageUpload(true)}
                          className="text-xs bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-slate-200"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Images
                        </Button> */}
                      </div>

                      <ImageGallery
                        requiredImageCount={requiredImageCount}
                        initialImages={state.images}
                        onImagesChange={handleImagesChange}
                        isAuthenticated={isAuthenticated}
                        maxFreeImages={FREE_IMAGES_LIMIT}
                        apiResponse={mediaUploadMutation.data}
                        data-ph-capture-attribute-feature="image_gallery"
                        data-ph-capture-attribute-user_type={
                          isAuthenticated ? "pro" : "free"
                        }
                        data-ph-capture-attribute-image_count={state.images.length.toString()}
                        data-ph-capture-attribute-session_id={getOrCreateSessionKey()}
                        data-ph-capture-attribute-pipeline_id={
                          videoGenerationMutation.pipelineId || ""
                        }
                        data-ph-capture-attribute-validation_status={
                          mediaUploadMutation.data?.status || "pending"
                        }
                        onValidationState={(hasInvalidImages) => {
                          if (hasInvalidImages) {
                            toast({
                              title: "Invalid Images",
                              description:
                                "Please remove invalid images before continuing",
                              variant: "destructive",
                            });
                          } else if (
                            mediaUploadMutation.data?.status === "failed"
                          ) {
                            mediaUploadMutation.reset();
                            queryClient.removeQueries({
                              queryKey: QUERY_KEYS.validatedMedia,
                            });
                          }
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="overflow-hidden">
                {isLoadingTracks ? (
                  <div className="py-6 text-center text-slate-400">
                    Loading music tracks...
                  </div>
                ) : !musicTracks || musicTracks.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-red-400 mb-2">
                      No music tracks available
                    </p>
                    <p className="text-slate-400 text-sm">
                      Please try again later
                    </p>
                  </div>
                ) : (
                  <MusicSelector
                    tracks={musicTracks}
                    selectedTrackId={state.selectedMusicTrackId}
                    onTrackSelect={handleTrackSelect}
                    onMoodSelect={() => {}}
                    data-ph-capture-attribute-feature="music_selection"
                    data-ph-capture-attribute-track_count={
                      musicTracks?.length.toString() || "0"
                    }
                  />
                )}
              </div>

              <div className="flex flex-col items-center gap-4 mt-4">
                {showEmailInput ? (
                  <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700 shadow-lg animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-slate-200">
                        Get notified when ready
                      </h3>
                      <button
                        onClick={() => setShowEmailInput(false)}
                        className="text-slate-400 hover:text-slate-300 transition-colors"
                        aria-label="Close email input"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          type="email"
                          placeholder="your@email.com (required)"
                          value={email}
                          onChange={handleEmailChange}
                          className={`bg-slate-900/50 border-slate-700 text-white ${
                            !isEmailValid ? "border-red-500" : ""
                          }`}
                          aria-invalid={!isEmailValid}
                        />
                        {!isEmailValid && (
                          <p className="text-xs text-red-400 mt-1">
                            Please enter a valid email
                          </p>
                        )}
                      </div>
                      <Button
                        size="default"
                        variant="secondary"
                        onClick={handleGenerateVideo}
                        disabled={
                          state.images.length === 0 ||
                          !state.selectedMusicTrackId ||
                          state.isGenerating ||
                          !isEmailValid ||
                          !email
                        }
                        className="whitespace-nowrap"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {state.isGenerating ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                      <Mail className="inline-block w-3 h-3 mr-1" />
                      Generation takes ~5 minutes. We'll email you when it's
                      ready.
                    </p>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={handleGenerateVideo}
                    disabled={
                      state.images.length === 0 ||
                      !state.selectedMusicTrackId ||
                      state.isGenerating
                    }
                    className={`relative transition-all duration-300 ${
                      state.isGenerating ? "animate-pulse" : ""
                    }`}
                  >
                    <div className="flex items-center">
                      {state.isGenerating ? (
                        <>
                          <span className="h-4 w-4 mr-2 rounded-full border-2 border-white/60 border-t-transparent animate-spin inline-block" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Generate Video
                        </>
                      )}
                    </div>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {showPastRuns && (
        <div className="max-w-7xl mx-auto px-4">
          <header className="mb-8 lg:hidden text-center">
            <p className="text-slate-300 text-lg md:text-xl mt-3 font-light">
              Your Past Runs
            </p>
          </header>
          <VideoProjectsList />
        </div>
      )}
    </div>
  );
}
