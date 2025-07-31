import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { IVideoProject } from "@/types/video-gen";
import { GlobeIcon } from "lucide-react";
import { Player } from "@remotion/player";
import { AbsoluteFill } from "remotion";

interface VideoTileProps {
  project: IVideoProject;
}

// VideoPreview component that uses Remotion
const VideoPreview = ({
  state,
  isPlaying,
}: {
  state: any;
  isPlaying: boolean;
}) => {
  // Function to render a frame with all overlays
  const VideoComposition = () => {
    return (
      <AbsoluteFill>
        {state.overlays.map((overlay: any) => {
          switch (overlay.type) {
            case "video":
              return (
                <video
                  key={overlay.id}
                  src={overlay.src}
                  style={{
                    position: "absolute",
                    top: overlay.top,
                    left: overlay.left,
                    width: overlay.width,
                    height: overlay.height,
                    ...overlay.styles,
                  }}
                />
              );
            case "image":
              return (
                <img
                  key={overlay.id}
                  src={overlay.src}
                  style={{
                    position: "absolute",
                    top: overlay.top,
                    left: overlay.left,
                    width: overlay.width,
                    height: overlay.height,
                    ...overlay.styles,
                  }}
                />
              );
            // case 'text':
            //   return (
            //     <div
            //       key={overlay.id}
            //       style={{
            //         position: 'absolute',
            //         top: overlay.top,
            //         left: overlay.left,
            //         width: overlay.width,
            //         height: overlay.height,
            //         ...overlay.styles,
            //       }}
            //     >
            //       {overlay.content}
            //     </div>
            //   );
            default:
              return null;
          }
        })}
      </AbsoluteFill>
    );
  };

  return (
    <Player
      component={VideoComposition}
      durationInFrames={state.durationInFrames ?? 300}
      fps={state.fps ?? 30}
      compositionWidth={1280}
      compositionHeight={720}
      style={{
        width: "100%",
        height: "100%",
      }}
      controls={false}
      autoPlay={isPlaying}
      loop
    />
  );
};

export default function VideoTile({ project }: VideoTileProps) {
  const [isHovered, setIsHovered] = useState(false);

  const statusColors = {
    draft: "bg-gray-200 text-gray-800",
    processing: "bg-blue-200 text-blue-800",
    complete: "bg-green-200 text-green-800",
    error: "bg-red-200 text-red-800",
  };

  return (
    <div
      className="group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow hover:shadow-md transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-video bg-muted relative">
        {project.state ? (
          <VideoPreview state={project.state} isPlaying={isHovered} />
        ) : (
          // Fallback to the original gradient background if no state is present
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 to-gray-800" />
        )}

        {/* Format indicator */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs">
            {project.format}
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
        <h3 className="text-lg font-semibold truncate">{project.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(project.updated_at), {
            addSuffix: true,
          })}
        </p>
        <div className="mt-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              statusColors[project.status as keyof typeof statusColors]
            }`}
          >
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
