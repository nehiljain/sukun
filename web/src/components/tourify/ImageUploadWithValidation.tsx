import React, { useState } from "react";
import { ImageGallery } from "./ImageGallery";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Sample API response with an invalid image
const sampleApiResponse = {
  status: "error",
  message: "One or more images are invalid",
  error: "Invalid images detected",
  data: {
    validatedImages: [
      {
        id: "validated-image-1743487074775-0",
        originalName: "ChatGPT Image Mar 31, 2025, 05_55_12 PM.png",
        cloudUrl:
          "https://storage.googleapis.com/demodrive-media/overlay_images/08b87ef9-ab6b-4394-9d49-144cc4d715ac/image_00211928bb77498cb17a66ad0bde94f5.jpg",
        isValid: false,
        index: 0,
        width: 1920,
        height: 1080,
        size: 3834752,
        metadata: {
          propertyType: "Commercial",
          roomType: "Bedroom",
          qualityScore: 82,
          invalidReason:
            "Images containing 'chat' in the filename are not allowed",
        },
      },
      {
        id: "validated-image-1743487074775-1",
        originalName: "8d004b4e-7dec-4ee8-940c-069dc4ff859c.jpeg",
        cloudUrl:
          "https://storage.googleapis.com/demodrive-media/overlay_images/08b87ef9-ab6b-4394-9d49-144cc4d715ac/image_00211928bb77498cb17a66ad0bde94f5.jpg",
        isValid: true,
        index: 1,
        width: 1920,
        height: 1080,
        size: 2323029,
        metadata: {
          propertyType: "Residential",
          roomType: "Bathroom",
          qualityScore: 94,
        },
      },
    ],
    musicTrack: {
      id: "track-2",
      name: "Music Track 2",
      description: "Upbeat acoustic guitar for modern homes",
      duration: "0:32",
      src: "https://storage.googleapis.com/demodrive-media/video_assets/lumalabs-hackathon/ES_My_Galaxy_Gloria_Tells_fullmix_high_quality.mp3",
    },
  },
};

// Sample response for a 404 error
const sample404Response = {
  status: "error",
  message: "Could not process one or more images",
  error: "Resource not found",
  data: {
    validatedImages: [
      {
        id: "validated-image-1743487074775-0",
        originalName: "missing-image.jpg",
        isValid: false,
        index: 0,
        metadata: {
          invalidReason: "Image could not be found (404)",
        },
      },
      {
        id: "validated-image-1743487074775-1",
        originalName: "8d004b4e-7dec-4ee8-940c-069dc4ff859c.jpeg",
        cloudUrl:
          "https://storage.googleapis.com/demodrive-media/overlay_images/08b87ef9-ab6b-4394-9d49-144cc4d715ac/image_00211928bb77498cb17a66ad0bde94f5.jpg",
        isValid: true,
        index: 1,
        width: 1920,
        height: 1080,
        size: 2323029,
        metadata: {
          propertyType: "Residential",
          roomType: "Bathroom",
          qualityScore: 94,
        },
      },
    ],
    // Add music track to this response as well to avoid type errors
    musicTrack: {
      id: "track-2",
      name: "Music Track 2",
      description: "Upbeat acoustic guitar for modern homes",
      duration: "0:32",
      src: "https://storage.googleapis.com/demodrive-media/video_assets/lumalabs-hackathon/ES_My_Galaxy_Gloria_Tells_fullmix_high_quality.mp3",
    },
  },
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

// Define the API response interface to help with type checking
interface ApiResponse {
  status: string;
  message?: string;
  error?: string;
  data: {
    validatedImages: Array<{
      id: string;
      originalName: string;
      cloudUrl?: string;
      isValid: boolean;
      index?: number;
      width?: number;
      height?: number;
      size?: number;
      metadata: {
        propertyType?: string;
        roomType?: string;
        qualityScore?: number;
        invalidReason?: string;
      };
    }>;
    musicTrack?: {
      id: string;
      name: string;
      description: string;
      duration: string;
      src: string;
    };
  };
}

export const ImageUploadWithValidation: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasInvalidImages, setHasInvalidImages] = useState(false);
  const [selectedMusicTrack, setSelectedMusicTrack] = useState<any>(null);
  const [errorType, setErrorType] = useState<"none" | "404" | "validation">(
    "none",
  );

  // Handle image changes from the gallery
  const handleImagesChange = (newImages: ImageItem[]) => {
    setImages(newImages);

    // If all invalid images were removed, reset the API response and error state
    if (hasInvalidImages && !newImages.some((img) => img.isValid === false)) {
      setApiResponse(null);
      setErrorType("none");
    }
  };

  // Track validation state
  const handleValidationState = (hasInvalid: boolean) => {
    setHasInvalidImages(hasInvalid);
  };

  // Simulate an API call to validate images
  const handleGenerate = async () => {
    if (hasInvalidImages) {
      alert("Please remove invalid images before generating");
      return;
    }

    if (images.length === 0) {
      alert("Please add at least one image");
      return;
    }

    setIsGenerating(true);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // For demonstration: randomly choose between normal response and 404 error
      const useResponse =
        Math.random() > 0.5 ? sampleApiResponse : sample404Response;

      // Check if it's a 404 response
      if (useResponse === sample404Response) {
        setErrorType("404");
      } else if (useResponse.status === "error") {
        setErrorType("validation");
      } else {
        setErrorType("none");
      }

      // Instead of throwing an error, set the API response to handle in the UI
      setApiResponse(useResponse as ApiResponse);

      // Still set music track if available
      if (useResponse.data?.musicTrack) {
        setSelectedMusicTrack(useResponse.data.musicTrack);
      }
    } catch (error) {
      // Only for unexpected errors, not for 404s or validation errors
      console.error("Unexpected error during generation:", error);
      // Don't throw the error - this prevents triggering the ErrorBoundary
    } finally {
      setIsGenerating(false);
    }
  };

  // Allow users to add test images
  const handleAddTestImages = () => {
    if (hasInvalidImages) return;

    const testImages = [
      {
        id: "image-1",
        src: "https://storage.googleapis.com/demodrive-media/overlay_images/08b87ef9-ab6b-4394-9d49-144cc4d715ac/image_00211928bb77498cb17a66ad0bde94f5.jpg",
        file: new File([""], "ChatGPT Image Mar 31, 2025, 05_55_12 PM.png", {
          type: "image/png",
        }),
      },
      {
        id: "image-2",
        src: "https://storage.googleapis.com/demodrive-media/overlay_images/08b87ef9-ab6b-4394-9d49-144cc4d715ac/image_00211928bb77498cb17a66ad0bde94f5.jpg",
        file: new File([""], "8d004b4e-7dec-4ee8-940c-069dc4ff859c.jpeg", {
          type: "image/jpeg",
        }),
      },
    ];

    setImages(testImages);
  };

  // Switch between error types to test different responses
  const toggleErrorType = () => {
    if (images.length === 0) return;

    // Clear any previous response
    setApiResponse(null);
    setErrorType("none");

    // Start generation with the selected error type
    handleGenerate();
  };

  return (
    <div className="p-6 bg-slate-900 rounded-xl space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold text-white mb-4">
        Create Your Property Tour
      </h2>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-white">Upload Images</h3>
            <div className="flex gap-2">
              {images.length === 0 && !hasInvalidImages && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddTestImages}
                  className="text-xs"
                >
                  Add Test Images
                </Button>
              )}
              {images.length > 0 && !isGenerating && !hasInvalidImages && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleErrorType}
                  className="text-xs"
                >
                  Test Response
                </Button>
              )}
            </div>
          </div>

          <ImageGallery
            initialImages={images}
            onImagesChange={handleImagesChange}
            apiResponse={apiResponse}
            onValidationState={handleValidationState}
          />
        </div>

        {errorType === "404" && !hasInvalidImages && (
          <div className="p-4 bg-amber-900/30 border border-amber-500/50 rounded-lg">
            <p className="text-sm text-amber-200">
              Images were processed, but some files could not be found. Please
              check the images marked as invalid.
            </p>
          </div>
        )}

        {selectedMusicTrack && (
          <div className="p-4 bg-slate-800 rounded-lg">
            <h3 className="text-lg font-medium text-white mb-2">
              Selected Music
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">{selectedMusicTrack.name}</p>
                <p className="text-sm text-slate-400">
                  {selectedMusicTrack.description}
                </p>
              </div>
              <audio
                controls
                src={selectedMusicTrack.src}
                className="h-8 w-48"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || hasInvalidImages || images.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating images...
              </>
            ) : (
              "Generate Tour"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
