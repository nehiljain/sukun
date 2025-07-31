import React, { useState, useCallback, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Button } from "@/components/ui/button";
import { X, Lock, Trash2, AlertTriangle } from "lucide-react";

interface ImageItemProps {
  id: string;
  src: string;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (id: string) => void;
  isValid?: boolean;
  isDraggable?: boolean;
  invalidReason?: string;
}

// Type for drag and drop
const ITEM_TYPE = "image";

const ImageItem: React.FC<ImageItemProps> = ({
  id,
  src,
  index,
  moveItem,
  onRemove,
  isValid = true,
  isDraggable = true,
  invalidReason,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover(item: { id: string; index: number }, monitor: any) {
      if (!ref.current || !isDraggable) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      moveItem(dragIndex, hoverIndex);
      // Update the dragged item's index for future interactions
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { id, index },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isDraggable,
  });

  // Only apply drag-drop refs if the image is valid
  if (isDraggable) {
    drag(drop(ref));
  }

  const handleClick = () => {
    // If image is invalid, clicking anywhere on it will remove it
    if (!isValid) {
      onRemove(id);
    }
  };

  return (
    <div
      ref={ref}
      className={`relative rounded-lg overflow-hidden group ${
        isDragging ? "opacity-50" : "opacity-100"
      } shadow-lg transition-transform duration-200 transform ${
        isValid ? "hover:scale-[1.02]" : "hover:scale-100"
      } ${!isValid ? "border-2 border-red-500" : ""}`}
      style={{
        height: "140px",
        cursor: isValid ? (isDraggable ? "move" : "default") : "pointer",
      }}
      onClick={handleClick}
      data-ph-capture-attribute-image_index={index.toString()}
      data-ph-capture-attribute-image_id={id}
      data-ph-capture-attribute-image_valid={isValid.toString()}
    >
      <img
        src={src}
        alt={`Image ${index + 1}`}
        className={`w-full h-full object-cover ${!isValid ? "opacity-70" : ""}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity"></div>

      {isValid ? (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 bg-black/40 hover:bg-red-600 border border-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          data-ph-capture-attribute-action="remove_valid_image"
          data-ph-capture-attribute-image_id={id}
          data-ph-capture-attribute-image_index={index.toString()}
        >
          <X size={14} className="text-white" />
        </Button>
      ) : (
        // For invalid images, always show the delete button prominently
        <div
          className="absolute inset-0 flex flex-col justify-between"
          data-ph-capture-attribute-action="remove_invalid_image"
          data-ph-capture-attribute-image_id={id}
          data-ph-capture-attribute-image_index={index.toString()}
          data-ph-capture-attribute-invalid_reason={invalidReason || "unknown"}
        >
          <div className="bg-red-600/90 py-2 px-3 flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle size={16} className="text-white mr-2" />
              <span className="text-white text-xs font-medium">
                Invalid image
              </span>
            </div>
            <Trash2 size={16} className="text-white" />
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full border border-white/10">
        {index + 1}
      </div>
    </div>
  );
};

interface ImageItem {
  id: string;
  src: string;
  file: File;
  isValid?: boolean;
  cloudUrl?: string;
  metadata?: {
    propertyType?: string;
    roomType?: string;
    qualityScore?: number;
    invalidReason?: string;
  };
}

interface ValidatedImage {
  id: string;
  originalName: string;
  cloudUrl: string;
  isValid: boolean;
  index?: number;
  width: number;
  height: number;
  size: number;
  metadata: {
    propertyType: string;
    roomType: string;
    qualityScore: number;
    invalidReason?: string;
  };
}

interface ApiResponse {
  status: string;
  message?: string;
  error?: string;
  data?: {
    validatedImages: ValidatedImage[];
    musicTrack?: any;
  };
}

interface ImageGalleryProps {
  initialImages?: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  requiredImageCount: number;
  isAuthenticated?: boolean;
  maxFreeImages?: number;
  apiResponse?: ApiResponse | null;
  onValidationState?: (hasInvalidImages: boolean) => void;
}

export function ImageGallery({
  initialImages = [],
  onImagesChange,
  requiredImageCount,
  isAuthenticated = true,
  maxFreeImages = 2,
  apiResponse,
  onValidationState,
}: ImageGalleryProps) {
  const [images, setImages] = useState<ImageItem[]>(initialImages);

  // Check if there are any invalid images
  const hasInvalidImages = images.some((image) => image.isValid === false);

  // Reset validation state when all invalid images are removed
  useEffect(() => {
    // If we previously had invalid images but now don't have any,
    // and we have at least one image, reset the apiResponse
    const hasImages = images.length > 0;
    const hasNoInvalidImages = !hasInvalidImages;

    if (hasImages && hasNoInvalidImages && apiResponse?.status === "error") {
      // Clear the cached API response to prevent validation errors from persisting
      onValidationState?.(false);
    }
  }, [hasInvalidImages, images.length, apiResponse, onValidationState]);

  // Notify parent component about validation state when it changes
  useEffect(() => {
    onValidationState?.(hasInvalidImages);
  }, [hasInvalidImages, onValidationState]);

  // Process API response when it changes
  useEffect(() => {
    if (
      apiResponse?.data?.validatedImages &&
      apiResponse.data.validatedImages.length > 0
    ) {
      const validatedImages = apiResponse.data.validatedImages;

      // Update our images with validation results
      const updatedImages = images.map((image) => {
        // Try to find a matching validated image by:
        // 1. Original file name (most reliable)
        // 2. Image ID if it's in a recognized format
        // 3. Only fall back to index as a last resort, and only if the indexes match exactly
        const validatedImage = validatedImages.find(
          (v) =>
            // Match by original filename
            (image.file && v.originalName === image.file.name) ||
            // Match by ID if possible
            image.id === v.id ||
            // Only use index as a last resort and only if arrays are same length
            (v.index !== undefined &&
              v.index < images.length &&
              images.length === validatedImages.length &&
              images[v.index].id === image.id),
        );

        if (validatedImage) {
          return {
            ...image,
            isValid: validatedImage.isValid,
            cloudUrl: validatedImage.cloudUrl,
            metadata: validatedImage.metadata,
          };
        }

        // If no matching validation found, keep the existing status
        return image;
      });

      setImages(updatedImages);
      onImagesChange(updatedImages);
    }
  }, [apiResponse, onImagesChange, images]);

  const hasReachedFreeLimit =
    !isAuthenticated && images.length >= maxFreeImages;

  // Handle file uploads from the ImageUpload component
  const handleImageUpload = useCallback(
    (files: File[]) => {
      // Don't allow uploads if there are invalid images
      if (hasInvalidImages) {
        return;
      }

      if (!isAuthenticated && images.length >= maxFreeImages) {
        return; // Already at limit, shouldn't happen due to disabled button
      }

      // For free users, limit the number of images they can add
      const filesToProcess = !isAuthenticated
        ? files.slice(0, maxFreeImages - images.length)
        : files;

      const newImages = filesToProcess.map((file) => ({
        id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        src: URL.createObjectURL(file),
        file,
        isValid: undefined, // Not validated yet
      }));

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onImagesChange(updatedImages);
    },
    [images, onImagesChange, isAuthenticated, maxFreeImages, hasInvalidImages],
  );

  // Move an image in the list (for drag and drop)
  const moveImage = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      // Don't allow reordering if there are invalid images
      if (hasInvalidImages) {
        return;
      }

      const updatedImages = [...images];
      const draggedImage = updatedImages[dragIndex];

      // Remove the dragged image from its original position
      updatedImages.splice(dragIndex, 1);
      // Insert it at the new position
      updatedImages.splice(hoverIndex, 0, draggedImage);

      setImages(updatedImages);
      onImagesChange(updatedImages);
    },
    [images, onImagesChange, hasInvalidImages],
  );

  // Remove an image from the gallery
  const removeImage = useCallback(
    (id: string) => {
      const updatedImages = images.filter((image) => image.id !== id);

      // Update the validation state of remaining images
      // Make sure we're not relying solely on index for validation
      const updatedImagesWithValidation = updatedImages.map((image) => {
        // If the image already has a valid status, keep it
        if (image.isValid === true) {
          return image;
        }

        // If the image was previously validated as invalid, keep that state
        if (image.isValid === false) {
          return image;
        }

        // Otherwise, mark as valid (or undefined if not validated yet)
        // This ensures we don't inherit invalid state from an index position
        return {
          ...image,
          isValid: undefined,
        };
      });

      setImages(updatedImagesWithValidation);
      onImagesChange(updatedImagesWithValidation);
    },
    [images, onImagesChange],
  );

  return (
    <DndProvider backend={HTML5Backend}>
      {hasInvalidImages && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-500/50 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle
              size={18}
              className="text-red-500 mr-2 flex-shrink-0"
            />
            <p className="text-sm text-white">
              One or more images are invalid. Click on the invalid image to
              remove it.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((image, index) => (
          <ImageItem
            key={image.id}
            id={image.id}
            src={image.src}
            index={index}
            moveItem={moveImage}
            onRemove={removeImage}
            isValid={image.isValid !== false} // Undefined is treated as valid until proven otherwise
            isDraggable={!hasInvalidImages}
            invalidReason={image.metadata?.invalidReason}
          />
        ))}

        {/* "Add more" card - disabled when there are invalid images */}
        <div
          className={`relative rounded-lg flex items-center justify-center border-2 border-dashed
            ${
              hasInvalidImages || hasReachedFreeLimit
                ? "border-slate-700/50 bg-slate-800/30 cursor-not-allowed"
                : "border-slate-700/50 hover:border-indigo-500/70 bg-slate-800/30 transition-colors cursor-pointer"
            }`}
          style={{ height: "140px" }}
          onClick={() =>
            !hasInvalidImages &&
            !hasReachedFreeLimit &&
            document.getElementById("add-more-input")?.click()
          }
          data-ph-capture-attribute-action="add_more_images"
          data-ph-capture-attribute-is_disabled={(
            hasInvalidImages || hasReachedFreeLimit
          ).toString()}
          data-ph-capture-attribute-reason={
            hasInvalidImages
              ? "has_invalid_images"
              : hasReachedFreeLimit
                ? "free_limit_reached"
                : "enabled"
          }
        >
          <div className="flex flex-col items-center">
            {hasInvalidImages ? (
              <>
                <Lock size={24} className="mb-1 text-red-400" />
                <span className="text-sm text-center text-red-300">
                  Remove invalid images
                </span>
                <span className="text-xs text-red-400 mt-1">
                  to continue uploading
                </span>
              </>
            ) : hasReachedFreeLimit ? (
              <>
                <Lock size={24} className="mb-1 text-slate-400" />
                <span className="text-sm text-center text-slate-300">
                  Free limit reached
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Sign in for unlimited images
                </span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center border border-slate-700/70 mb-2">
                  <span className="text-2xl text-indigo-400">+</span>
                </div>
                <span className="text-sm text-slate-300">
                  Add {requiredImageCount - images.length} more
                </span>
              </>
            )}
          </div>
          <input
            id="add-more-input"
            type="file"
            accept="image/*"
            multiple
            disabled={hasInvalidImages || hasReachedFreeLimit}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleImageUpload(Array.from(e.target.files));
                e.target.value = ""; // Reset input
              }
            }}
          />
        </div>
      </div>

      {images.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {!isAuthenticated && (
            <div className="flex items-center text-xs text-amber-300">
              <Lock size={12} className="mr-1.5 flex-shrink-0" />
              <p>
                Free account limited to {maxFreeImages} images. Sign in for
                unlimited.
              </p>
            </div>
          )}
        </div>
      )}
    </DndProvider>
  );
}
