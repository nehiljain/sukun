// app/client/src/components/media-browser/index.tsx
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useMediaLibrary } from "@/hooks/use-media-library";
import { IMediaItem, MediaType, IVideoProject } from "@/types/media";
import { MediaSearch } from "@/components/medias/media-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileIcon, Filter, X } from "lucide-react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { MediaCard } from "@/components/medias/media-tile";
import { ddApiClient } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { MediaUploadButton } from "@/components/medias/MediaUploadButton";

interface DateGroup {
  date: string;
  displayDate: string;
  items: IMediaItem[];
}

export interface MediaFilters {
  type?: MediaType | "all";
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  searchQuery?: string;
  video_project_id?: string;
  // Semantic search options
  useSemanticSearch?: boolean;
  similarityThreshold?: number;
  maxResults?: number;
}

export interface MediaBrowserProps {
  onSelect?: (items: IMediaItem[]) => void;
  multiSelect?: boolean;
  showUpload?: boolean;
  initialFilters?: MediaFilters;
  selectedItems?: IMediaItem[];
  gridClassName?: string;
  video_project_id?: string;
}

// < div className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 pt-6 gap-6" >
export const MediaBrowser = ({
  onSelect,
  multiSelect = false,
  showUpload = true,
  initialFilters = { type: "all" },
  selectedItems = [],
  gridClassName = "grid-cols-1 md:grid-cols-3 lg:grid-cols-6",
  video_project_id,
}: MediaBrowserProps) => {
  const [filters, setFilters] = useState<MediaFilters>({
    ...initialFilters,
    ...(video_project_id ? { video_project_id } : {}),
  });
  const [selectedMediaItems, setSelectedMediaItems] =
    useState<IMediaItem[]>(selectedItems);
  const [videoProjects, setVideoProjects] = useState<IVideoProject[]>([]);

  const {
    mediaItems,
    isLoading,
    hasMore,
    loadMore,
    refetch,
    searchQuery,
    searchMetadata,
    handleSearch,
  } = useMediaLibrary(filters);

  useEffect(() => {
    // Fetch video projects for dropdown
    ddApiClient.get("/api/video-projects/simple-list/").then((res) => {
      setVideoProjects(res.data);
    });
  }, []);

  // Group items by date
  const groupedByDate = useMemo(() => {
    const groups: DateGroup[] = [];
    mediaItems.forEach((item) => {
      const dateStr = item.created_at;
      const date = parseISO(dateStr);
      const dateKey = format(date, "yyyy-MM-dd");
      let displayDate = "";
      if (isToday(date)) {
        displayDate = "Today";
      } else if (isYesterday(date)) {
        displayDate = "Yesterday";
      } else {
        displayDate = format(date, "MMMM d, yyyy");
      }
      const existingGroup = groups.find((g) => g.date === dateKey);
      if (existingGroup) {
        existingGroup.items.push(item);
      } else {
        groups.push({
          date: dateKey,
          displayDate,
          items: [item],
        });
      }
    });
    return groups.sort((a, b) => b.date.localeCompare(a.date));
  }, [mediaItems]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastItemElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore, loadMore],
  );

  const handleSelectItem = (item: IMediaItem) => {
    if (multiSelect) {
      const isSelected = selectedMediaItems.some(
        (selected) => selected.id === item.id,
      );
      let newSelectedItems;

      if (isSelected) {
        newSelectedItems = selectedMediaItems.filter(
          (selected) => selected.id !== item.id,
        );
      } else {
        newSelectedItems = [...selectedMediaItems, item];
      }

      setSelectedMediaItems(newSelectedItems);
      onSelect?.(newSelectedItems);
    } else {
      setSelectedMediaItems([item]);
      onSelect?.([item]);
    }
  };

  const isItemSelected = (item: IMediaItem) => {
    return selectedMediaItems.some((selected) => selected.id === item.id);
  };

  const clearFilters = () => {
    setFilters({
      type: "all",
      useSemanticSearch: true,
      similarityThreshold: 0.7,
      maxResults: 50,
    });
    handleSearch(""); // Also clear the search query when clearing filters
  };

  // Update filters with search query
  const handleSearchChange = (query: string) => {
    handleSearch(query);
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <MediaSearch
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by name, type, or content..."
                useSemanticSearch={filters.useSemanticSearch ?? true}
                onSemanticSearchChange={(enabled) =>
                  setFilters((prev) => ({
                    ...prev,
                    useSemanticSearch: enabled,
                  }))
                }
                similarityThreshold={filters.similarityThreshold ?? 0.7}
                onSimilarityThresholdChange={(threshold) =>
                  setFilters((prev) => ({
                    ...prev,
                    similarityThreshold: threshold,
                  }))
                }
                maxResults={filters.maxResults ?? 50}
                onMaxResultsChange={(maxResults) =>
                  setFilters((prev) => ({ ...prev, maxResults }))
                }
                searchMetadata={searchMetadata}
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  setFilters({ ...filters, type: value as MediaType | "all" })
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Media Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Media</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Date Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: filters.dateFrom,
                      to: filters.dateTo,
                    }}
                    onSelect={(range) => {
                      setFilters({
                        ...filters,
                        dateFrom: range?.from,
                        dateTo: range?.to,
                      });
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Video Project Dropdown */}
              <Select
                value={filters.video_project_id || ""}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    video_project_id: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Video Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {videoProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(filters.type !== "all" ||
                filters.dateFrom ||
                filters.dateTo ||
                filters.searchQuery ||
                filters.video_project_id ||
                filters.useSemanticSearch === false) && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}

              {showUpload && video_project_id && (
                <MediaUploadButton
                  video_project_id={video_project_id}
                  onUploadComplete={refetch}
                  className="min-w-[180px]"
                />
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.type !== "all" ||
            filters.dateFrom ||
            filters.dateTo ||
            searchQuery ||
            filters.useSemanticSearch === false) && (
            <div className="flex flex-wrap gap-2">
              {filters.type !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Type: {filters.type}
                  <button
                    onClick={() => setFilters({ ...filters, type: "all" })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Date:{" "}
                  {filters.dateFrom
                    ? format(filters.dateFrom, "MMM d, yyyy")
                    : "Any"}
                  {filters.dateTo
                    ? ` - ${format(filters.dateTo, "MMM d, yyyy")}`
                    : ""}
                  <button
                    onClick={() =>
                      setFilters({
                        ...filters,
                        dateFrom: undefined,
                        dateTo: undefined,
                      })
                    }
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {searchQuery}
                  <button
                    onClick={() => {
                      handleSearch("");
                      setFilters({ ...filters, searchQuery: "" });
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.useSemanticSearch === false && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Text Search Only
                  <button
                    onClick={() =>
                      setFilters({ ...filters, useSemanticSearch: true })
                    }
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Media Grid Section */}

          {isLoading && !mediaItems.length ? (
            <div className={`grid ${gridClassName} gap-6`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="group">
                  <div className="aspect-video bg-muted animate-pulse rounded-t-lg" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !mediaItems.length ? (
            <div className="text-center py-12">
              <FileIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No media found</h3>
              <p className="text-sm text-muted-foreground">
                {showUpload
                  ? "Upload some media files to get started"
                  : "Try changing your filters to see more results"}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedByDate.map((group, groupIndex) => (
                <div key={group.date} className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <h3 className="text-2xl font-medium text-muted-foreground whitespace-nowrap px-2">
                      {group.displayDate}
                    </h3>
                    {/* <Separator className="h-[1px] flex-grow bg-white" /> */}
                  </div>
                  <div className={`grid ${gridClassName} gap-6`}>
                    {group.items.map((item, index) => (
                      <div
                        key={item.id}
                        ref={
                          groupIndex === groupedByDate.length - 1 &&
                          index === group.items.length - 1
                            ? lastItemElementRef
                            : null
                        }
                        className={
                          isItemSelected(item)
                            ? "ring-2 ring-primary rounded-md"
                            : ""
                        }
                      >
                        <MediaCard
                          item={item}
                          onSelect={() => handleSelectItem(item)}
                          isSelected={isItemSelected(item)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className={`grid ${gridClassName} gap-6 mt-6`}>
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i} className="group">
                      <div className="aspect-video bg-muted animate-pulse rounded-t-lg" />
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                        <div className="h-3 bg-muted animate-pulse rounded w-1/2 mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
