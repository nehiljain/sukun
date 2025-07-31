import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EllipsisVertical,
  Copy,
  History,
  SaveAll,
  Loader2,
  CheckCircle,
} from "lucide-react";

import RenderControls from "../rendering/render-controls";
import { useEditorContext } from "../../contexts/editor-context";
import { FPS } from "../../constants";
import { Input } from "@/components/ui/input";
import { useTray } from "../../contexts/tray-context";
import { Badge } from "@/components/ui/badge";
import { VideoProjectStatus } from "@/types/video-gen";
import { toast } from "@/hooks/use-toast";
import { ddApiClient } from "@/lib/api-client";
/**
 * Dynamic import of the ThemeToggle component to enable client-side rendering only.
 * This prevents hydration mismatches since theme detection requires browser APIs.
 */
// const ThemeToggleClient = dynamic(
//   () => import("@/components/theme-toggle").then((mod) => mod.ThemeToggle),
//   { ssr: false }
// );

/**
 * EditorHeader component renders the top navigation bar of the editor interface.
 *
 * @component
 * @description
 * This component provides the main navigation and control elements at the top of the editor:
 * - A sidebar trigger button for showing/hiding the sidebar
 * - A visual separator
 * - A theme toggle switch for light/dark mode
 * - Rendering controls for media export
 * - Save button for persisting editor state
 *
 * The header is sticky-positioned at the top of the viewport and includes
 * responsive styling for both light and dark themes.
 *
 * @example
 * ```tsx
 * <EditorHeader />
 * ```
 *
 * @returns {JSX.Element} A header element containing navigation and control components
 */
export function EditorHeader() {
  const {
    videoProjectName,
    updateProjectName,
    overlays,
    durationInFrames,
    aspectRatio,
    videoProjectId,
    saveProject,
    isSaving,
    videoProjectStatus,
    updateVideoProjectStatus,
  } = useEditorContext();

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(videoProjectName);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const { setActiveTray } = useTray();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setInputValue(videoProjectName);
  }, [videoProjectName]);

  const handleInputBlur = () => {
    setIsEditing(false);
    updateProjectName(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      updateProjectName(inputValue);
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue(videoProjectName);
    }
  };

  const handleApproveProject = async () => {
    if (!videoProjectId) return;

    try {
      setIsUpdatingStatus(true);

      // Save the current state first
      await saveProject({
        overlays,
        durationInFrames,
        videoProjectId,
        fps: FPS,
        aspectRatio,
      });

      updateVideoProjectStatus(VideoProjectStatus.PROCESSING);
      toast({
        title: "Project Approved",
        description: "Project status updated to processing",
      });
    } catch (error) {
      console.error("Error approving project:", error);
      toast({
        title: "Error",
        description: "Failed to approve project",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Auto-save effect
  useEffect(() => {
    if (autoSaveEnabled) {
      // Setup auto-save interval
      autoSaveIntervalRef.current = setInterval(async () => {
        if (isSaving || isAutoSaving) return; // Prevent overlapping saves

        setIsAutoSaving(true);
        await saveProject({
          overlays,
          durationInFrames,
          videoProjectId,
          fps: FPS,
          aspectRatio,
        });
        setIsAutoSaving(false);
      }, 10000); // 10 seconds
    } else if (autoSaveIntervalRef.current) {
      // Clear interval when disabled
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [
    autoSaveEnabled,
    isSaving,
    isAutoSaving,
    overlays,
    durationInFrames,
    videoProjectId,
    aspectRatio,
    saveProject,
  ]);

  return (
    <header
      className="sticky top-0 flex shrink-0 items-center gap-3
      bg-background
      border-l border-border
      border-b border-border
      p-3 px-5"
    >
      {/* Spacer to push title to center */}
      <div className="flex-grow">
        <div className="flex items-center gap-2">
          {videoProjectStatus && (
            <Badge
              variant={
                videoProjectStatus === VideoProjectStatus.DRAFT
                  ? "outline"
                  : "secondary"
              }
              className="capitalize"
            >
              {videoProjectStatus.toLowerCase()}
            </Badge>
          )}
        </div>
      </div>
      {/* Title component rendering - centered in viewport */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-2 text-foreground">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className="min-w-[200px]"
            />
          ) : (
            <h1
              className="text-lg font-medium cursor-pointer hover:opacity-80 truncate max-w-[250px] overflow-hidden"
              onClick={() => setIsEditing(true)}
              title={videoProjectName}
            >
              {videoProjectName}
            </h1>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8">
                <EllipsisVertical className="h-4 w-4" />
                <span className="sr-only">Open actions menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveTray("duplicate")}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTray("template")}>
                <SaveAll className="mr-2 h-4 w-4" />
                Save as Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTray("renders")}>
                <History className="mr-2 h-4 w-4" />
                View Past Renders
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex items-center">
                  <Button
                    onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                    size="sm"
                    variant="ghost"
                    className="px-2 text-xs flex items-center gap-1.5 hover:bg-secondary"
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${autoSaveEnabled ? "bg-accent" : "bg-secondary"}`}
                    />
                    <span
                      className={
                        autoSaveEnabled
                          ? "text-primary"
                          : "text-muted-foreground"
                      }
                    >
                      Auto-save {autoSaveEnabled ? "ON" : "OFF"}
                    </span>
                    {isAutoSaving && (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Spacer to push rendering controls to the right */}
      <div className="flex-grow flex items-center justify-end mr-4">
        {videoProjectStatus === VideoProjectStatus.DRAFT && (
          <Button
            onClick={handleApproveProject}
            size="sm"
            variant="primary"
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            )}
            Approve
          </Button>
        )}
      </div>

      {/* Media rendering controls with save functionality */}
      <RenderControls isAutoSaving={isAutoSaving} fps={FPS} />
    </header>
  );
}
