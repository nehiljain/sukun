import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileVideo,
  Mic,
  MicOff,
  ChevronDown,
  Heading1,
  Camera,
  Video,
} from "lucide-react";
import { getAllAnimations } from "@/remotion-src/components/animations/registry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const TopToolbar: React.FC<{
  onAddItem: (type: string) => void;
  onTakeAction: () => void;
  onAddComment: () => void;
  onRenderVideo: () => void;
  onSave: () => void;
  isSaving?: boolean;
  commentCount: number;
  status?: string;
  name?: string;
  isRendering: boolean;
  renderedVideoUrl?: string;
  isRecording?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}> = ({
  onAddItem,
  onTakeAction,
  onAddComment,
  onRenderVideo,
  onSave,
  isSaving = false,
  commentCount,
  status,
  name,
  isRendering,
  renderedVideoUrl,
  isRecording = false,
  onStartRecording = () => {},
  onStopRecording = () => {},
}) => {
  // Get all registered animations and organize them by category
  const animationsByCategory = useMemo(() => {
    const animations = getAllAnimations();
    console.log(animations);
    const categories: Record<string, typeof animations> = {};

    animations.forEach((animation) => {
      const category = animation.category || "Other";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(animation);
    });

    return categories;
  }, []);

  return (
    <div className="bg-background border-b border-border p-2 flex items-center gap-2">
      <Button
        variant="secondary"
        onClick={() => onAddItem("solid")}
        className="flex items-center gap-2"
      >
        <span>+ Background</span>
      </Button>
      <Button
        variant="secondary"
        onClick={() => onAddItem("text")}
        className="flex items-center gap-2"
      >
        <span>+ Text</span>
      </Button>
      <Button
        variant="secondary"
        onClick={() => onAddItem("video")}
        className="flex items-center gap-2"
      >
        <span>+ Video</span>
      </Button>

      {/* Combined voice and camera recording button */}
      {isRecording ? (
        <Button
          variant="destructive"
          onClick={onStopRecording}
          className="flex items-center gap-2"
          aria-label="Stop recording"
        >
          <Video className="h-4 w-4" />
          <span>Stop Recording</span>
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={onStartRecording}
          className="flex items-center gap-2"
          aria-label="Start recording voice and camera"
        >
          <Camera className="h-4 w-4" />
          <span>+ Record</span>
        </Button>
      )}

      {/* Animations dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" className="flex items-center gap-2">
            <span>+ Animations</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {/* Add registered animations by category */}
          {Object.entries(animationsByCategory).map(
            ([category, animations]) => (
              <React.Fragment key={category}>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{category}</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {animations.map((animation) => (
                    <DropdownMenuItem
                      key={animation.id}
                      onClick={() => onAddItem(animation.id)}
                    >
                      {animation.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </React.Fragment>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {status == "generated" ? (
        <>
          <Button
            variant="secondary"
            onClick={onAddComment}
            className="flex items-center gap-2"
          >
            <span>+ Comment</span>
            {commentCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                {commentCount}
              </span>
            )}
          </Button>
          <Button
            variant="primary"
            onClick={() => onTakeAction()}
            className="flex items-end gap-2"
          >
            <span>{commentCount > 0 ? "Send for Review" : "Accept"}</span>
          </Button>
        </>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Status: {status}
        </Badge>
      )}
      {name && <h1 className="text-muted-foreground">Name: {name}</h1>}
      {/* Add Save button before the Render button */}
      <Button
        variant="secondary"
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center gap-2 ml-auto"
        aria-label="Save project"
      >
        {isSaving ? (
          <>
            <span className="animate-spin mr-1">⟳</span>
            <span>Saving...</span>
          </>
        ) : (
          <span>Save</span>
        )}
      </Button>

      <Button
        variant="primary"
        onClick={onRenderVideo}
        disabled={isRendering}
        className="flex items-center gap-2"
      >
        <FileVideo className="w-4 h-4 mr-1" />
        <span>{isRendering ? "Rendering..." : "Render Video"}</span>
      </Button>
      {renderedVideoUrl && (
        <Button
          variant="secondary"
          onClick={() => window.open(renderedVideoUrl, "_blank")}
          className="flex items-center gap-2"
        >
          <FileVideo className="w-4 h-4 mr-1" />
          <span>Open Rendered Video</span>
        </Button>
      )}
    </div>
  );
};
