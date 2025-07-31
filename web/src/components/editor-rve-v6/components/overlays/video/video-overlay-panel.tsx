import { useState, useEffect } from "react";
import { Search, AlertCircle, MoveRight, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/ui/file-upload";

import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useVideoUrlValidator } from "../../../hooks/use-video-url-validator";
import { usePexelsVideos } from "../../../hooks/use-pexels-video";
import { useAspectRatio } from "../../../hooks/use-aspect-ratio";
import { useTimeline } from "../../../contexts/timeline-context";
import { ClipOverlay, Overlay, OverlayType } from "../../../types";
import { VideoDetails } from "./video-details";
import { getThumbnailWithFallback } from "../../../utils/video-utils";
import { FPS } from "../../../constants";
import {
  useMediaLibrary,
  type MediaItem,
} from "../../../../../hooks/use-media-library";

interface PexelsVideoFile {
  quality: string;
  link: string;
}

interface PexelsVideo {
  id: number | string;
  image: string;
  video_files: PexelsVideoFile[];
}

/**
 * VideoOverlayPanel is a component that provides video search and management functionality.
 * It allows users to:
 * - Search and browse videos from the Pexels API
 * - Add videos via direct URL
 * - Upload videos directly from their device
 * - Manage video properties when a video overlay is selected
 *
 * The component has four main states:
 * 1. Search mode: Shows a search input and grid of video thumbnails from Pexels
 * 2. URL mode: Shows an input field for adding videos via URL
 * 3. Upload mode: Shows file upload interface for adding videos from the device
 * 4. Edit mode: Shows video details panel when a video overlay is selected
 *
 * @component
 * @example
 * ```tsx
 * <VideoOverlayPanel />
 * ```
 */
export const VideoOverlayPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const { videos, isLoading, fetchVideos } = usePexelsVideos();
  const {
    addOverlay,
    overlays,
    durationInFrames: projectDurationInFrames,
    selectedOverlayId,
    changeOverlay,
    videoProjectId,
  } = useEditorContext();
  const { findNextAvailablePosition } = useTimelinePositioning();
  const { getAspectRatioDimensions } = useAspectRatio();
  const { visibleRows } = useTimeline();
  const [localOverlay, setLocalOverlay] = useState<Overlay | null>(null);
  const {
    isValidating,
    error: urlError,
    previewUrl,
    videoMetadata,
    validateUrl,
    resetValidation,
  } = useVideoUrlValidator();

  // Replace existing query with hook
  const { mediaItems, isLoading: isLoadingLibrary } = useMediaLibrary("video");

  useEffect(() => {
    if (selectedOverlayId === null) {
      setLocalOverlay(null);
      return;
    }

    const selectedOverlay = overlays.find(
      (overlay) => overlay.id === selectedOverlayId,
    );

    if (selectedOverlay?.type === OverlayType.VIDEO) {
      setLocalOverlay(selectedOverlay);
    }
  }, [selectedOverlayId, overlays]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchVideos(searchQuery);
    }
  };

  const handleAddClip = (video: PexelsVideo) => {
    const { width, height } = getAspectRatioDimensions();

    const { from, row } = findNextAvailablePosition(
      overlays,
      visibleRows,
      projectDurationInFrames,
    );

    // Find the best quality video file (prioritize UHD > HD > SD)
    const videoFile =
      video.video_files.find(
        (file: PexelsVideoFile) => file.quality === "uhd",
      ) ||
      video.video_files.find(
        (file: PexelsVideoFile) => file.quality === "hd",
      ) ||
      video.video_files.find(
        (file: PexelsVideoFile) => file.quality === "sd",
      ) ||
      video.video_files[0]; // Fallback to first file if no matches

    const newOverlay: Overlay = {
      left: 0,
      top: 0,
      width,
      height,
      durationInFrames: 200, // Default duration
      from,
      id: Date.now(),
      rotation: 0,
      row,
      isDragging: false,
      type: OverlayType.VIDEO,
      content: video.image,
      src: videoFile?.link ?? "",
      videoStartTime: 0,
      styles: {
        opacity: 1,
        zIndex: 100,
        transform: "none",
        objectFit: "cover",
      },
    };

    addOverlay(newOverlay);
  };

  const handleAddFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      return;
    }

    try {
      // Pass the project's frame rate to the validator
      const isValid = await validateUrl(videoUrl, FPS);

      if (isValid && videoMetadata) {
        setIsGeneratingThumbnail(true);

        // Use the video's actual dimensions if available, otherwise use project dimensions
        let width, height;
        if (videoMetadata.width && videoMetadata.height) {
          // Use the video's actual dimensions
          width = videoMetadata.width;
          height = videoMetadata.height;
        } else {
          // Fallback to project dimensions
          const dimensions = getAspectRatioDimensions();
          width = dimensions.width;
          height = dimensions.height;
        }

        const { from, row } = findNextAvailablePosition(
          overlays,
          visibleRows,
          projectDurationInFrames,
        );

        // Generate a thumbnail from the video
        const thumbnailUrl = await getThumbnailWithFallback(videoUrl);

        const newOverlay: Overlay = {
          left: 0,
          top: 0,
          width,
          height,
          // Use the actual video duration in frames if available, otherwise use a default
          durationInFrames: videoMetadata.durationInFrames || 200,
          from,
          id: Date.now(),
          rotation: 0,
          row,
          isDragging: false,
          type: OverlayType.VIDEO,
          content: thumbnailUrl,
          src: videoUrl,
          videoStartTime: 0,
          styles: {
            opacity: 1,
            zIndex: 100,
            transform: "none",
            objectFit: "cover",
          },
        };

        addOverlay(newOverlay);
        setVideoUrl("");
        resetValidation();
        toast({
          title: "Video added",
          description: `Video (${videoMetadata.durationInSeconds.toFixed(2)}s) has been added to your timeline`,
        });
      }
    } catch (error) {
      console.error("Error adding video from URL:", error);
      toast({
        title: "Error adding video",
        description: "There was a problem adding the video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleUpdateOverlay = (updatedOverlay: Overlay) => {
    setLocalOverlay(updatedOverlay);
    changeOverlay(updatedOverlay.id, updatedOverlay);
  };

  const handlePreviewUrl = async () => {
    if (!videoUrl.trim()) {
      return;
    }

    // Pass the project's frame rate to the validator
    await validateUrl(videoUrl, FPS);
  };

  /**
   * Handles a successful video file upload
   * Creates a new video overlay with the uploaded video
   */
  const handleVideoUploadComplete = async (
    fileUrl: string,
    mediaId: string,
  ) => {
    try {
      setIsGeneratingThumbnail(true);

      // Get the position for the new overlay
      const { width, height } = getAspectRatioDimensions();
      const { from, row } = findNextAvailablePosition(
        overlays,
        visibleRows,
        projectDurationInFrames,
      );

      // Generate a thumbnail from the uploaded video
      const thumbnailUrl = await getThumbnailWithFallback(fileUrl);

      // Create the new overlay
      const newOverlay: Overlay = {
        left: 0,
        top: 0,
        width,
        height,
        durationInFrames: 200, // Default duration until we can get the actual duration
        from,
        id: Date.now(),
        rotation: 0,
        row,
        isDragging: false,
        type: OverlayType.VIDEO,
        content: thumbnailUrl,
        src: fileUrl,
        mediaId, // Store the media ID for reference
        videoStartTime: 0,
        styles: {
          opacity: 1,
          zIndex: 100,
          transform: "none",
          objectFit: "cover",
        },
      };

      addOverlay(newOverlay);
      toast({
        title: "Video uploaded",
        description: "Your video has been added to the timeline",
      });
    } catch (error) {
      console.error("Error processing uploaded video:", error);
      toast({
        title: "Error adding video",
        description:
          "There was a problem adding the uploaded video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  // Add handler for library video selection
  const handleLibraryVideoSelect = async (media: MediaItem) => {
    try {
      setIsGeneratingThumbnail(true);

      const { width, height } = getAspectRatioDimensions();
      const { from, row } = findNextAvailablePosition(
        overlays,
        visibleRows,
        projectDurationInFrames,
      );

      const newOverlay: Overlay = {
        left: 0,
        top: 0,
        width,
        height,
        durationInFrames: 200,
        from,
        id: Date.now(),
        rotation: 0,
        row,
        isDragging: false,
        type: OverlayType.VIDEO,
        content: media.thumbnail_url,
        src: media.storage_url_path,
        mediaId: media.id,
        videoStartTime: 0,
        styles: {
          opacity: 1,
          zIndex: 100,
          transform: "none",
          objectFit: "cover",
        },
      };

      addOverlay(newOverlay);
      toast({
        title: "Video added",
        description: "Video has been added to your timeline",
      });
    } catch (error) {
      console.error("Error adding video from library:", error);
      toast({
        title: "Error adding video",
        description: "There was a problem adding the video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-100/40 dark:bg-gray-900/40 h-full">
      {!localOverlay ? (
        <Tabs defaultValue="search">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-white/5 text-gray-900 dark:text-zinc-200 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:ring-blue-400"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                type="submit"
                variant="default"
                disabled={isLoading}
                className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-zinc-200 border-gray-200 dark:border-white/5"
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <div className="grid grid-cols-2 gap-3">
              {isLoading ? (
                Array.from({ length: 16 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="relative aspect-video bg-gray-200 dark:bg-gray-800 animate-pulse rounded-sm"
                  />
                ))
              ) : videos.length > 0 ? (
                videos.map((video) => (
                  <button
                    key={video.id}
                    className="relative aspect-video cursor-pointer border border-transparent hover:border-white rounded-md"
                    onClick={() => handleAddClip(video)}
                  >
                    <div className="relative">
                      <img
                        src={video.image}
                        alt={`Video thumbnail ${video.id}`}
                        className="rounded-sm object-cover w-full h-full hover:opacity-60 transition-opacity duration-200"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-8 text-gray-500">
                  <p>Search for videos to add to your project</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="library" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 auto-rows-fr">
              {isLoadingLibrary ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="relative aspect-video bg-muted animate-pulse rounded-sm"
                  />
                ))
              ) : mediaItems.length > 0 ? (
                mediaItems.map((media) => (
                  <div key={media.id} className="flex flex-col gap-2">
                    <button
                      className="relative aspect-video w-full cursor-pointer border border-border hover:border-foreground rounded-md overflow-hidden"
                      onClick={() => handleLibraryVideoSelect(media)}
                    >
                      <div className="relative w-full h-full">
                        <img
                          src={media.thumbnail_url || "/placeholder-video.png"}
                          alt={media.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-background/20 opacity-0 hover:opacity-100 transition-opacity duration-200" />
                        {media.metadata?.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            {Math.round(media.metadata.duration)}s
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="text-xs text-muted-foreground truncate px-1">
                      {media.name}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-8 text-muted-foreground">
                  No videos in your library. Upload some videos to get started.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <form onSubmit={handleAddFromUrl} className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste video URL here..."
                  value={videoUrl}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-white/5 text-gray-900 dark:text-zinc-200 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:ring-blue-400"
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    resetValidation();
                  }}
                />
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  disabled={isValidating || !videoUrl.trim()}
                  className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-zinc-200 border-gray-200 dark:border-white/5 rounded-full"
                  onClick={handlePreviewUrl}
                >
                  <MoveRight className="h-4 w-4" />
                </Button>
              </div>

              {urlError && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{urlError}</span>
                </div>
              )}

              {previewUrl && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Preview:
                  </p>
                  <div className="relative aspect-video bg-gray-200 dark:bg-gray-800 rounded-md overflow-hidden">
                    <video
                      src={previewUrl}
                      className="w-full h-full object-cover"
                      controls
                      muted
                    />
                  </div>
                  {videoMetadata && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <p>
                        Duration: {videoMetadata.durationInSeconds.toFixed(2)}s
                        ({videoMetadata.durationInFrames} frames)
                      </p>
                      <p>
                        Resolution: {videoMetadata.width}x{videoMetadata.height}
                      </p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    variant="default"
                    className="w-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-zinc-200 border-gray-200 dark:border-white/5 rounded-md"
                    disabled={isValidating || isGeneratingThumbnail}
                  >
                    {isGeneratingThumbnail ? "Processing..." : "Add Video"}
                  </Button>
                </div>
              )}

              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <p className="font-medium mb-1">Supported formats:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Direct video URLs (.mp4, .webm, .ogg, etc.)</li>
                  <li>Self-hosted videos</li>
                </ul>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <FileUpload
              endpoint="media/upload/video"
              supportText="Drop your video file here or click to browse"
              acceptedFileTypes={{
                "video/*": [".mp4", ".webm", ".mov", ".avi", ".mkv"],
              }}
              onUploadComplete={handleVideoUploadComplete}
              maxSize={104857600} // 100MB
              videoProjectId={videoProjectId}
            />

            <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              <p className="font-medium mb-1">Upload guidelines:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Maximum file size: 100MB</li>
                <li>Supported formats: MP4, WebM, MOV, AVI, MKV</li>
                <li>Recommended resolution: 1080p or higher</li>
                <li>For best performance, use compressed videos</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <VideoDetails
          localOverlay={localOverlay as ClipOverlay}
          setLocalOverlay={handleUpdateOverlay}
        />
      )}
    </div>
  );
};
