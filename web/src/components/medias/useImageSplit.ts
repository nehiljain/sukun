import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ddApiClient } from "@/lib/api-client";

export interface SplitImagePreview {
  centerUrl?: string;
  leftUrl?: string;
  rightUrl?: string;
  multiUrls?: string[];
  isWideImage: boolean;
}

export const useImageSplit = () => {
  const [splitImagePreview, setSplitImagePreview] =
    useState<SplitImagePreview | null>(null);
  const [isSplittingImage, setIsSplittingImage] = useState(false);

  const getImageSplitPreview = useCallback(
    async (mediaId: string, singleMode: boolean = false) => {
      try {
        setIsSplittingImage(true);
        const response = await ddApiClient.post(
          `/api/media/${mediaId}/split_to_portrait/`,
          {
            preview_only: true,
            single_mode: singleMode,
          },
        );
        if (response.data.success) {
          const preview: SplitImagePreview = {
            isWideImage: response.data.is_wide,
          };
          if (response.data.preview.center_url)
            preview.centerUrl = response.data.preview.center_url;
          if (response.data.preview.left_url)
            preview.leftUrl = response.data.preview.left_url;
          if (response.data.preview.right_url)
            preview.rightUrl = response.data.preview.right_url;
          if (
            response.data.preview.urls &&
            response.data.preview.urls.length > 0
          )
            preview.multiUrls = response.data.preview.urls;
          setSplitImagePreview(preview);
        } else {
          toast.error("Failed to get split image preview");
        }
      } catch (err) {
        console.error("Error getting split image preview:", err);
        toast.error("Failed to get split image preview");
      } finally {
        setIsSplittingImage(false);
      }
    },
    [],
  );

  const splitImageToPortrait = async (
    mediaId: string,
    singleMode: boolean,
    excludedIndices?: number[],
  ) => {
    try {
      if (!splitImagePreview) {
        toast.error("No preview available to split");
        return false;
      }
      const allPreviewUrls = [splitImagePreview.centerUrl];
      if (
        splitImagePreview.multiUrls &&
        splitImagePreview.multiUrls.length > 0
      ) {
        allPreviewUrls.push(...splitImagePreview.multiUrls);
      } else {
        if (splitImagePreview.leftUrl)
          allPreviewUrls.push(splitImagePreview.leftUrl);
        if (splitImagePreview.rightUrl)
          allPreviewUrls.push(splitImagePreview.rightUrl);
      }
      const response = await ddApiClient.post(
        `/api/media/${mediaId}/split_to_portrait/`,
        {
          single_mode: singleMode,
          excluded_indices: excludedIndices || [],
          preview_urls: allPreviewUrls,
        },
      );
      if (response.data.success) {
        toast.success("Image split successfully");
        return true;
      } else {
        toast.error("Failed to split image");
        return false;
      }
    } catch (error) {
      console.error("Error splitting image:", error);
      toast.error("Failed to split image");
      return false;
    }
  };

  const cancelSplitImage = useCallback(() => {
    setSplitImagePreview(null);
  }, []);

  return {
    splitImagePreview,
    isSplittingImage,
    getImageSplitPreview,
    splitImageToPortrait,
    cancelSplitImage,
  };
};
