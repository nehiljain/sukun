import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, X, Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SplitImagePreview } from "@/hooks/use-media-library";

interface SplitImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrls: SplitImagePreview | null;
  isLoading: boolean;
  onConfirm: (singleMode: boolean, excludedIndices?: number[]) => void;
}

export function SplitImageDialog({
  isOpen,
  onClose,
  previewUrls,
  isLoading,
  onConfirm,
}: SplitImageDialogProps) {
  const [splitMode, setSplitMode] = useState<"single" | "multi">("multi");
  // State to track which images are selected (by default all are selected)
  const [selectedImages, setSelectedImages] = useState<boolean[]>([]);
  // For scrollable container
  const imagesPerPage = 3;
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset selected images when preview URLs change
  useEffect(() => {
    if (previewUrls) {
      let count = 0;
      if (previewUrls.multiUrls && previewUrls.multiUrls.length > 0) {
        count = previewUrls.multiUrls.length;
      } else {
        if (previewUrls.leftUrl) count++;
        if (previewUrls.rightUrl) count++;
      }
      setSelectedImages(new Array(count).fill(true));
    }
  }, [previewUrls]);

  // Determine how many split images there are
  const getImageCount = () => {
    if (!previewUrls) return 0;

    if (previewUrls.multiUrls && previewUrls.multiUrls.length > 0) {
      return previewUrls.multiUrls.length;
    }

    let count = 0;
    if (previewUrls.leftUrl) count++;
    if (previewUrls.rightUrl) count++;
    return count;
  };

  // Handle image selection/deselection
  const toggleImageSelection = (index: number) => {
    const newSelection = [...selectedImages];
    newSelection[index] = !newSelection[index];
    setSelectedImages(newSelection);
  };

  // Get the indices of excluded images
  const getExcludedIndices = (): number[] => {
    return selectedImages
      .map((selected, index) => (selected ? -1 : index))
      .filter((index) => index !== -1);
  };

  // Handle confirm with excluded images
  const handleConfirm = () => {
    onConfirm(splitMode === "single", getExcludedIndices());
  };

  // Get selected image count
  const getSelectedImageCount = () => {
    return selectedImages.filter(Boolean).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Split Image into 9:16 Portrait Format</DialogTitle>
          <DialogDescription>
            Choose how to split this image into portrait format for video
            keyframes.
            {getImageCount() > 1 && splitMode === "multi" && (
              <span className="block mt-2 text-sm text-muted-foreground">
                You can click images to toggle selection before creating them.
              </span>
            )}
          </DialogDescription>

          <Tabs
            defaultValue={splitMode}
            className="mt-4"
            onValueChange={(value) => setSplitMode(value as "single" | "multi")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Centered Image</TabsTrigger>
              <TabsTrigger value="multi">
                Multiple Images ({getImageCount()})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Generating split preview...
            </p>
          </div>
        ) : previewUrls ? (
          <>
            {/* Single mode preview */}
            {splitMode === "single" && previewUrls.centerUrl && (
              <div className="flex flex-col items-center mx-auto w-full max-w-xs">
                <div className="overflow-hidden rounded-md border bg-background">
                  <img
                    src={previewUrls.centerUrl}
                    alt="Center portrait crop"
                    className="aspect-[9/16] w-full object-cover"
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Centered portrait crop
                </p>
              </div>
            )}

            {/* Multi mode preview */}
            {splitMode === "multi" && (
              <div className="relative">
                {/* Scrollable container with max height */}
                <div
                  ref={containerRef}
                  className="max-h-[50vh] overflow-y-auto py-2"
                >
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    {/* Standard two images */}
                    {previewUrls.leftUrl &&
                      previewUrls.rightUrl &&
                      !previewUrls.multiUrls && (
                        <>
                          <div
                            className={`flex flex-col items-center cursor-pointer relative ${!selectedImages[0] ? "opacity-50" : ""}`}
                            onClick={() => toggleImageSelection(0)}
                          >
                            <div className="overflow-hidden rounded-md border bg-background">
                              <div className="absolute right-2 top-2 z-10 bg-background/70 rounded-full p-1">
                                {selectedImages[0] ? (
                                  <Check className="h-5 w-5 text-green-500" />
                                ) : (
                                  <X className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                              <img
                                src={previewUrls.leftUrl}
                                alt="Left portrait crop"
                                className="aspect-[9/16] w-full object-cover"
                              />
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Left Image
                            </p>
                          </div>

                          <div
                            className={`flex flex-col items-center cursor-pointer relative ${!selectedImages[1] ? "opacity-50" : ""}`}
                            onClick={() => toggleImageSelection(1)}
                          >
                            <div className="overflow-hidden rounded-md border bg-background">
                              <div className="absolute right-2 top-2 z-10 bg-background/70 rounded-full p-1">
                                {selectedImages[1] ? (
                                  <Check className="h-5 w-5 text-green-500" />
                                ) : (
                                  <X className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                              <img
                                src={previewUrls.rightUrl}
                                alt="Right portrait crop"
                                className="aspect-[9/16] w-full object-cover"
                              />
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Right Image
                            </p>
                          </div>
                        </>
                      )}

                    {/* Multiple images for wide panoramas */}
                    {previewUrls.multiUrls &&
                      previewUrls.multiUrls.length > 0 && (
                        <>
                          {previewUrls.multiUrls.map((url, index) => (
                            <div
                              key={index}
                              className={`flex flex-col items-center cursor-pointer relative ${!selectedImages[index] ? "opacity-50" : ""}`}
                              onClick={() => toggleImageSelection(index)}
                            >
                              <div className="overflow-hidden rounded-md border bg-background">
                                <div className="absolute right-2 top-2 z-10 bg-background/70 rounded-full p-1">
                                  {selectedImages[index] ? (
                                    <Check className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <X className="h-5 w-5 text-red-500" />
                                  )}
                                </div>
                                <img
                                  src={url}
                                  alt={`Split image ${index + 1}`}
                                  className="aspect-[9/16] w-full object-cover"
                                />
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {index === 0
                                  ? "Left"
                                  : index === previewUrls.multiUrls!.length - 1
                                    ? "Right"
                                    : `Middle ${index}`}
                              </p>
                            </div>
                          ))}
                        </>
                      )}
                  </div>
                </div>

                {/* Pagination info for lots of images */}
                {splitMode === "multi" && getImageCount() > imagesPerPage && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Scroll to see all {getImageCount()} images
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No preview available
            </p>
          </div>
        )}

        {/* Selection summary */}
        {splitMode === "multi" && previewUrls && getImageCount() > 1 && (
          <div className="mt-2 text-sm">
            <span className="font-medium">
              {getSelectedImageCount()} of {getImageCount()} images selected
            </span>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="primary"
            disabled={
              isLoading ||
              !previewUrls ||
              (splitMode === "multi" && getSelectedImageCount() === 0)
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : splitMode === "single" ? (
              "Create Single Portrait Image"
            ) : (
              `Create ${getSelectedImageCount()} Selected Image${getSelectedImageCount() !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
