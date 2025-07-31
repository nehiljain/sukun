import { useState, useEffect } from "react";
import { Search, AlertCircle, MoveRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "@/hooks/use-toast";

import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useAspectRatio } from "../../../hooks/use-aspect-ratio";
import { useTimeline } from "../../../contexts/timeline-context";
import { ImageOverlay, Overlay, OverlayType } from "../../../types";
import { ImageDetails } from "./image-details";
import { usePexelsImages } from "../../../hooks/use-pexels-images";
import {
  useMediaLibrary,
  type MediaItem,
} from "../../../../../hooks/use-media-library";

/**
 * Interface representing an image from the Pexels API
 */
interface PexelsImage {
  id: number | string;
  src: {
    original: string;
    medium: string;
  };
}

/**
 * ImageOverlayPanel Component
 *
 * A panel that provides functionality to:
 * 1. Search and select images from Pexels
 * 2. Upload custom images
 * 3. Add selected images as overlays to the editor
 * 4. Modify existing image overlay properties
 *
 * The panel has two main states:
 * - Search/Selection/Upload mode: Shows a tabbed interface with Pexels search and file upload
 * - Edit mode: Shows image details editor when an existing image overlay is selected
 */
export const ImageOverlayPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [activeTab, setActiveTab] = useState<string>("search");
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { images, isLoading, fetchImages } = usePexelsImages();
  const {
    addOverlay,
    overlays,
    durationInFrames,
    selectedOverlayId,
    changeOverlay,
  } = useEditorContext();
  const { findNextAvailablePosition } = useTimelinePositioning();
  const { getAspectRatioDimensions } = useAspectRatio();
  const { visibleRows } = useTimeline();
  const [localOverlay, setLocalOverlay] = useState<Overlay | null>(null);

  // Replace existing query with hook
  const { mediaItems, isLoading: isLoadingLibrary } = useMediaLibrary("image");

  const DEFAULT_DURATION_IN_FRAMES = 20;

  useEffect(() => {
    if (selectedOverlayId === null) {
      setLocalOverlay(null);
      return;
    }

    const selectedOverlay = overlays.find(
      (overlay) => overlay.id === selectedOverlayId,
    );

    if (selectedOverlay?.type === OverlayType.IMAGE) {
      setLocalOverlay(selectedOverlay);
    }
  }, [selectedOverlayId, overlays]);

  /**
   * Handles the image search form submission
   * Triggers the Pexels API call with the current search query
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchImages(searchQuery);
    }
  };

  /**
   * Adds a new image overlay to the editor
   * @param image - The selected Pexels image to add
   * Creates a new overlay with default positioning and animation settings
   */
  const handleAddImage = (image: PexelsImage) => {
    const { width, height } = getAspectRatioDimensions();
    const { from, row } = findNextAvailablePosition(
      overlays,
      visibleRows,
      durationInFrames,
    );

    const newOverlay: Overlay = {
      left: 0,
      top: 0,
      width,
      height,
      durationInFrames: DEFAULT_DURATION_IN_FRAMES,
      from,
      id: Date.now(),
      rotation: 0,
      row,
      isDragging: false,
      type: OverlayType.IMAGE,
      src: image.src.original,
      styles: {
        objectFit: "cover",
        animation: {
          enter: "fadeIn",
          exit: "fadeOut",
        },
      },
    };

    console.log(newOverlay);

    addOverlay(newOverlay);
  };

  /**
   * Updates an existing image overlay's properties
   * @param updatedOverlay - The modified overlay object
   * Updates both local state and global editor context
   */
  const handleUpdateOverlay = (updatedOverlay: Overlay) => {
    setLocalOverlay(updatedOverlay);
    changeOverlay(updatedOverlay.id, updatedOverlay);
  };

  /**
   * Handles the uploaded image and adds it as an overlay
   * @param fileUrl - The URL of the uploaded image file
   * @param mediaId - The ID of the media record in the database
   */
  const handleImageUploadComplete = (fileUrl: string, mediaId: string) => {
    const { width, height } = getAspectRatioDimensions();
    const { from, row } = findNextAvailablePosition(
      overlays,
      visibleRows,
      durationInFrames,
    );

    const newOverlay: Overlay = {
      left: 0,
      top: 0,
      width,
      height,
      durationInFrames: DEFAULT_DURATION_IN_FRAMES,
      from,
      id: Date.now(),
      rotation: 0,
      row,
      isDragging: false,
      type: OverlayType.IMAGE,
      src: fileUrl,
      mediaId, // Store the media ID for reference
      styles: {
        objectFit: "cover",
        animation: {
          enter: "fadeIn",
          exit: "fadeOut",
        },
      },
    };

    console.log("Adding uploaded image as overlay:", newOverlay);
    addOverlay(newOverlay);

    // Switch back to search tab after successful upload
    setActiveTab("search");
  };

  /**
   * Validates if the provided URL is a valid image URL
   * @param url - The URL to validate
   * @returns A promise that resolves to true if valid, false otherwise
   */
  const validateImageUrl = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setIsValidatingUrl(true);
      setUrlError(null);

      if (!url || !url.trim()) {
        setUrlError("Please enter a URL");
        setIsValidatingUrl(false);
        resolve(false);
        return;
      }

      const img = new Image();

      img.onload = () => {
        setPreviewUrl(url);
        setIsValidatingUrl(false);
        resolve(true);
      };

      img.onerror = () => {
        setUrlError("Invalid image URL or image couldn't be loaded");
        setIsValidatingUrl(false);
        resolve(false);
      };

      img.src = url;
    });
  };

  /**
   * Resets the URL validation state
   */
  const resetUrlValidation = () => {
    setUrlError(null);
    setPreviewUrl(null);
  };

  /**
   * Handles the preview action for the image URL
   */
  const handlePreviewUrl = async () => {
    if (!imageUrl.trim()) {
      return;
    }

    await validateImageUrl(imageUrl);
  };

  /**
   * Handles adding an image from URL
   * @param e - Form submit event
   */
  const handleAddFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      return;
    }

    try {
      const isValid = await validateImageUrl(imageUrl);

      if (isValid) {
        const { width, height } = getAspectRatioDimensions();
        const { from, row } = findNextAvailablePosition(
          overlays,
          visibleRows,
          durationInFrames,
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
          type: OverlayType.IMAGE,
          src: imageUrl,
          styles: {
            objectFit: "cover",
            animation: {
              enter: "fadeIn",
              exit: "fadeOut",
            },
          },
        };

        addOverlay(newOverlay);
        setImageUrl("");
        resetUrlValidation();
        toast({
          title: "Image added",
          description: "Image has been added to your timeline",
        });
      }
    } catch (error) {
      console.error("Error adding image from URL:", error);
      toast({
        title: "Error adding image",
        description: "There was a problem adding the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add handler for library image selection
  const handleLibraryImageSelect = (media: MediaItem) => {
    const { width, height } = getAspectRatioDimensions();
    const { from, row } = findNextAvailablePosition(
      overlays,
      visibleRows,
      durationInFrames,
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
      type: OverlayType.IMAGE,
      src: media.storage_url_path,
      mediaId: media.id,
      styles: {
        objectFit: "cover",
        animation: {
          enter: "fadeIn",
          exit: "fadeOut",
        },
      },
    };

    addOverlay(newOverlay);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-100/40 dark:bg-gray-900/40 h-full">
      {!localOverlay ? (
        <Tabs
          defaultValue="search"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <Input
                placeholder="Search images..."
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
                    className="relative aspect-video bg-muted animate-pulse rounded-sm"
                  />
                ))
              ) : images.length > 0 ? (
                images.map((image) => (
                  <button
                    key={image.id}
                    className="relative aspect-video cursor-pointer border border-border hover:border-foreground rounded-md"
                    onClick={() => handleAddImage(image)}
                  >
                    <div className="relative">
                      <img
                        src={image.src.medium}
                        alt={`Image thumbnail ${image.id}`}
                        className="rounded-sm object-cover w-full h-full hover:opacity-60 transition-opacity duration-200"
                      />
                      <div className="absolute inset-0 bg-background/20 opacity-0 hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-8 text-muted-foreground">
                  {searchQuery
                    ? "No images found. Try another search term."
                    : "Search for images to add as overlays."}
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
                      onClick={() => handleLibraryImageSelect(media)}
                    >
                      <div className="relative w-full h-full">
                        <img
                          src={media.thumbnail_url || media.storage_url_path}
                          alt={media.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-background/20 opacity-0 hover:opacity-100 transition-opacity duration-200" />
                        {media.metadata?.width && media.metadata?.height && (
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            {media.metadata.width}×{media.metadata.height}
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
                  No images in your library. Upload some images to get started.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-0 space-y-4">
            <form onSubmit={handleAddFromUrl} className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste image URL here..."
                  value={imageUrl}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-white/5 text-gray-900 dark:text-zinc-200 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:ring-blue-400"
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    resetUrlValidation();
                  }}
                />
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  disabled={isValidatingUrl || !imageUrl.trim()}
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
                  <p className="text-sm text-muted-foreground">Preview:</p>
                  <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Image preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="default"
                    className="w-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-zinc-200 border-gray-200 dark:border-white/5 rounded-md"
                    disabled={isValidatingUrl}
                  >
                    Add Image
                  </Button>
                </div>
              )}

              <div className="text-sm text-muted-foreground mt-2">
                <p className="font-medium mb-1">Supported formats:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Direct image URLs (.jpg, .png, .gif, .webp, etc.)</li>
                  <li>Self-hosted images</li>
                </ul>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="upload" className="mt-0">
            <FileUpload
              endpoint="media/upload/image"
              supportText="Drop an image file here or click to browse"
              acceptedFileTypes={{
                "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
              }}
              onUploadComplete={handleImageUploadComplete}
              maxSize={10485760} // 10MB
            />
          </TabsContent>
        </Tabs>
      ) : (
        <ImageDetails
          localOverlay={localOverlay as ImageOverlay}
          setLocalOverlay={handleUpdateOverlay}
        />
      )}
    </div>
  );
};
