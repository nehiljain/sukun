import { IMediaItem } from "@/types/media";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import VideoPreviewTile from "@/components/VideoPreviewTile";

export interface MediaCardProps {
  item: IMediaItem;
  onSelect: (item: IMediaItem) => void;
  isSelected?: boolean;
}

export const MediaCard = ({
  item,
  onSelect,
  isSelected = false,
}: MediaCardProps) => {
  const handleClick = () => {
    onSelect(item);
  };

  if (item.type === "video") {
    // Convert MediaItem to IVideoProject format
    const videoProject = {
      name: item.name,
      preview_url: item.storage_url_path,
      thumbnail_url: item.thumbnail_url,
      updated_at: item.created_at, // Using created_at since that's what we have
      status: "complete" as const,
      aspect_ratio: item.aspect_ratio,
      is_public: false, // Default value since MediaItem doesn't have this info
    };

    return (
      <div onClick={handleClick} className="relative">
        <VideoPreviewTile project={videoProject} showStatus={false} />
        {isSelected && (
          <div className="absolute top-2 right-2 bg-primary/90 rounded-full w-6 h-6 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
    );
  }

  // Original image card rendering
  return (
    <Card
      className="group overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative aspect-video">
        <img
          src={item.thumbnail_url || item.storage_url_path}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <ImageIcon className="h-4 w-4 text-white" />
        </div>
        {isSelected && (
          <div className="absolute top-2 right-2 bg-primary/90 rounded-full w-6 h-6 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
      <CardContent className="p-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{item.name}</p>
        </div>
        <div className="flex items-center mt-2 gap-2">
          <ImageIcon className="h-4 w-4" />
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
