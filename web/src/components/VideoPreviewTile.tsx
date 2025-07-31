import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useState, useRef } from "react";
import { IVideoProject } from "@/types/video-gen";
import { GlobeIcon, UserIcon, VideoIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/contexts/AuthContext";
interface VideoTileProps {
  project: IVideoProject;
  showStatus?: boolean;
}

// Utility function to generate HSL colors from a seed

export default function VideoPreviewTile({
  project,
  showStatus = true,
}: VideoTileProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const handleMouseEnter = () => {
    if (videoRef.current && project.preview_url) {
      videoRef.current.play().catch((err) => {
        console.error("Error playing video:", err);
      });
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className="group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow hover:shadow-md transition-all"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="aspect-video bg-muted relative">
        {(project.latest_render_preview_url || project.preview_url) && (
          <video
            ref={videoRef}
            src={project.latest_render_preview_url || project.preview_url}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
              isLoaded ? "opacity-100" : "opacity-0"
            } ${project.aspect_ratio ? `aspect-[${project.aspect_ratio}]` : ""}`}
            onLoadedData={() => setIsLoaded(true)}
            muted
            playsInline
            loop
          />
        )}

        {/* Format indicator */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs">
            {project.aspect_ratio}
          </Badge>
        </div>
        {project.is_public && (
          <div className="absolute bottom-2 left-2 flex gap-2">
            <Badge variant="outline" className="text-xs bg-background/80">
              <GlobeIcon className="w-4 h-4" />
            </Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-md font-medium truncate">{project.name}</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
          <VideoIcon className="w-4 h-4" />
          {formatDistanceToNow(new Date(project.updated_at), {
            addSuffix: true,
          })}
        </p>
        {showStatus && (
          <div className="mt-2">
            <StatusBadge status={project.status} />
          </div>
        )}
        {user?.is_staff && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs bg-background/80">
              <UserIcon className="w-4 h-4" />
              {user.active_org == project.org ? "My Org" : project.org}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
