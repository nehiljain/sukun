import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { mediaApi } from '../api/media-api';
import type { SplitImagePreview } from '../types';

export function useImageSplit() {
  const queryClient = useQueryClient();
  const [splitImagePreview, setSplitImagePreview] = useState<SplitImagePreview | null>(null);

  // Get preview mutation
  const getPreviewMutation = useMutation({
    mutationFn: ({ mediaId, singleMode }: { mediaId: string; singleMode?: boolean }) =>
      mediaApi.getSplitImagePreview(mediaId, singleMode),
    onSuccess: (data) => {
      if (data.success) {
        const preview: SplitImagePreview = {
          isWideImage: data.is_wide,
        };

        // Handle center/single image preview
        if (data.preview.center_url) {
          preview.centerUrl = data.preview.center_url;
        }

        // Handle left/right previews for standard two-image split
        if (data.preview.left_url) {
          preview.leftUrl = data.preview.left_url;
        }

        if (data.preview.right_url) {
          preview.rightUrl = data.preview.right_url;
        }

        // Handle multiple image split for wide images
        if (data.preview.urls && data.preview.urls.length > 0) {
          preview.multiUrls = data.preview.urls;
        }

        setSplitImagePreview(preview);
      } else {
        toast.error('Failed to get split image preview');
      }
    },
    onError: (error) => {
      console.error('Error getting split image preview:', error);
      toast.error('Failed to get split image preview');
    },
  });

  // Split image mutation
  const splitImageMutation = useMutation({
    mutationFn: ({
      mediaId,
      singleMode,
      excludedIndices,
    }: {
      mediaId: string;
      singleMode: boolean;
      excludedIndices?: number[];
    }) => {
      if (!splitImagePreview) {
        throw new Error('No preview available to split');
      }

      // Prepare the list of preview URLs
      const allPreviewUrls = [splitImagePreview.centerUrl];

      if (splitImagePreview.multiUrls && splitImagePreview.multiUrls.length > 0) {
        allPreviewUrls.push(...splitImagePreview.multiUrls);
      } else {
        if (splitImagePreview.leftUrl) allPreviewUrls.push(splitImagePreview.leftUrl);
        if (splitImagePreview.rightUrl) allPreviewUrls.push(splitImagePreview.rightUrl);
      }

      return mediaApi.splitImageToPortrait(mediaId, singleMode, excludedIndices || [], allPreviewUrls);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Image split successfully');
        // Invalidate media library to refresh the list
        queryClient.invalidateQueries({ queryKey: ['media-library'] });
        setSplitImagePreview(null);
      } else {
        toast.error('Failed to split image');
      }
    },
    onError: (error) => {
      console.error('Error splitting image:', error);
      toast.error('Failed to split image');
    },
  });

  const getImageSplitPreview = useCallback(
    (mediaId: string, singleMode = false) => {
      getPreviewMutation.mutate({ mediaId, singleMode });
    },
    [getPreviewMutation]
  );

  const splitImageToPortrait = useCallback(
    (mediaId: string, singleMode: boolean, excludedIndices?: number[]) => {
      splitImageMutation.mutate({ mediaId, singleMode, excludedIndices });
    },
    [splitImageMutation]
  );

  const cancelSplitImage = useCallback(() => {
    setSplitImagePreview(null);
  }, []);

  return {
    splitImagePreview,
    isSplittingImage: getPreviewMutation.isPending || splitImageMutation.isPending,
    getImageSplitPreview,
    splitImageToPortrait,
    cancelSplitImage,
  };
}