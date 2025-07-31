import { MediaContent } from "../types";

interface VideoPreviewProps {
  media: MediaContent;
  onVideoClick: (mediaId: string) => void;
}

export const VideoPreview = ({ media, onVideoClick }: VideoPreviewProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      onVideoClick(media.id);
    }
  };

  return (
    <div
      className="mt-2 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => onVideoClick(media.id)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="View video asset"
    >
      <img
        src={media.thumbnail_url}
        alt="Video thumbnail"
        className="rounded-md w-full max-w-[300px] h-auto"
      />
    </div>
  );
};
