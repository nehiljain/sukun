import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mediaApi } from '../api/media-api';
import type { MediaFilters, IMediaItem } from '../types';

const MEDIA_LIBRARY_QUERY_KEY = 'media-library';

export function useMediaLibrary(filters: MediaFilters = { type: "all" }) {
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: [MEDIA_LIBRARY_QUERY_KEY, filters],
    queryFn: ({ pageParam = 1 }) => mediaApi.getMediaLibrary(filters, pageParam),
    getNextPageParam: (lastPage) => {
      // Extract page number from next URL or return undefined if no next page
      if (!lastPage.next) return undefined;
      const url = new URL(lastPage.next);
      const page = url.searchParams.get('page');
      return page ? parseInt(page, 10) : undefined;
    },
    initialPageParam: 1,
  });

  // Flatten all pages into a single array
  const mediaItems = data?.pages.flatMap(page => page.results) ?? [];

  // Update media name mutation
  const updateMediaNameMutation = useMutation({
    mutationFn: ({ mediaId, name }: { mediaId: string; name: string }) =>
      mediaApi.updateMediaName(mediaId, name),
    onSuccess: (updatedMedia) => {
      // Update the cache with the new media data
      queryClient.setQueryData(
        [MEDIA_LIBRARY_QUERY_KEY, filters],
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              results: page.results.map((item: IMediaItem) =>
                item.id === updatedMedia.id ? updatedMedia : item
              ),
            })),
          };
        }
      );
      toast.success('Media name updated successfully');
    },
    onError: (error) => {
      console.error('Error updating media name:', error);
      toast.error('Failed to update media name');
    },
  });

  return {
    mediaItems,
    isLoading,
    error,
    hasMore: hasNextPage,
    loadMore: fetchNextPage,
    isLoadingMore: isFetchingNextPage,
    refetch,
    updateMediaName: updateMediaNameMutation.mutate,
    isUpdatingName: updateMediaNameMutation.isPending,
  };
}