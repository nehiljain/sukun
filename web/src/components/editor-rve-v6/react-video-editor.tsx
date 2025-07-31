"use client";

// UI Components
import { AppSidebar } from "./components/sidebar/app-sidebar";
import { Editor } from "./components/core/editor";
import { SidebarProvider as UISidebarProvider } from "@/components/ui/sidebar";
import { SidebarProvider as EditorSidebarProvider } from "./contexts/sidebar-context";

// Context Providers
import { EditorProvider } from "./contexts/editor-context";
import { EditorConfigProvider } from "./contexts/editor-config-context";
import {
  EditorFeatureConfig,
  defaultEditorConfig,
} from "./config/editor-config";

// Custom Hooks
import { useOverlays } from "./hooks/use-overlays";
import { useVideoPlayer } from "./hooks/use-video-player";
import { useTimelineClick } from "./hooks/use-timeline-click";
import { useAspectRatio } from "./hooks/use-aspect-ratio";
import { useCompositionDuration } from "./hooks/use-composition-duration";
import { useHistory } from "./hooks/use-history";
import { useVideoProjectState } from "./hooks/use-video-project-state";

// Types
import { Overlay, AspectRatio } from "./types";
import { FPS } from "./constants";
import { TimelineProvider } from "./contexts/timeline-context";
import { useEffect } from "react";
import { TrayProvider } from "./contexts/tray-context";
import { EditorTrays } from "./components/trays/editor-trays";

interface ReactVideoEditorProps {
  videoProjectId?: string;
  videoProjectName?: string;
  videoProjectStatus?: string;
  initialOverlays?: Overlay[];
  initialAspectRatio?: AspectRatio;
  disableSave?: boolean;
  editorConfig?: EditorFeatureConfig;
}

export default function ReactVideoEditor({
  videoProjectId,
  videoProjectName,
  videoProjectStatus,
  disableSave = false,
  initialOverlays = [],
  initialAspectRatio,
  editorConfig = defaultEditorConfig,
}: ReactVideoEditorProps) {
  // Overlay management hooks with initialTracks support
  const {
    overlays,
    setOverlays,
    selectedOverlayId,
    setSelectedOverlayId,
    changeOverlay,
    addOverlay,
    deleteOverlay,
    duplicateOverlay,
    splitOverlay,
    deleteOverlaysByRow,
    updateOverlayStyles,
    resetOverlays,
  } = useOverlays();

  // Initialize overlays from tracks if available
  useEffect(() => {
    if (initialOverlays && initialOverlays.length > 0) {
      setOverlays(initialOverlays);
    }
  }, [initialOverlays, setOverlays]);

  // Video player controls and state
  const { isPlaying, currentFrame, playerRef, togglePlayPause, formatTime } =
    useVideoPlayer();

  // Composition duration calculations
  const { durationInFrames, durationInSeconds } =
    useCompositionDuration(overlays);

  const {
    saveProject,
    updateProjectName,
    isSaveDisabled,
    setIsSaveDisabled,
    isSaving,
    updateVideoProjectStatus,
  } = useVideoProjectState(videoProjectId);

  useEffect(() => {
    if (disableSave) {
      setIsSaveDisabled(disableSave);
    }
  }, [disableSave, setIsSaveDisabled]);

  // Aspect ratio and player dimension management
  const {
    aspectRatio,
    setAspectRatio,
    playerDimensions,
    updatePlayerDimensions,
    getAspectRatioDimensions,
  } = useAspectRatio();

  useEffect(() => {
    setAspectRatio(initialAspectRatio);
  }, []);
  // Event handlers
  const handleOverlayChange = (updatedOverlay: Overlay) => {
    changeOverlay(updatedOverlay.id, () => updatedOverlay);
  };

  const { width: compositionWidth, height: compositionHeight } =
    getAspectRatioDimensions();

  const handleTimelineClick = useTimelineClick(playerRef, durationInFrames);

  const inputProps = {
    overlays,
    durationInFrames,
    fps: FPS,
    width: compositionWidth,
    height: compositionHeight,
    src: videoProjectId || "", // Use videoAssetId if available
  };

  // Replace history management code with hook
  const { undo, redo, canUndo, canRedo } = useHistory(overlays, setOverlays);

  // Combine all editor context values
  const editorContextValue = {
    // Overlay management
    overlays,
    setOverlays,
    selectedOverlayId,
    setSelectedOverlayId,
    changeOverlay,
    handleOverlayChange,
    addOverlay,
    deleteOverlay,
    duplicateOverlay,
    splitOverlay,
    resetOverlays,

    // Player controls
    isPlaying,
    currentFrame,
    playerRef,
    togglePlayPause,
    formatTime,
    handleTimelineClick,

    // Dimensions and duration
    aspectRatio,
    setAspectRatio,
    playerDimensions,
    updatePlayerDimensions,
    getAspectRatioDimensions,
    durationInFrames,
    durationInSeconds,

    deleteOverlaysByRow,

    // History management
    undo,
    redo,
    canUndo,
    canRedo,

    // New style management
    updateOverlayStyles,

    // Add video asset ID
    videoProjectId,

    // Add save handler
    saveProject,
    isSaveDisabled,
    isSaving,
    videoProjectName,
    updateProjectName,
    videoProjectStatus,
    updateVideoProjectStatus,
  };

  return (
    <UISidebarProvider>
      <EditorSidebarProvider>
        <TimelineProvider>
          <EditorProvider value={editorContextValue}>
            <EditorConfigProvider config={editorConfig}>
              <TrayProvider>
                <div className="flex w-full h-screen">
                  <AppSidebar />
                  <div className="flex-1 overflow-hidden">
                    <Editor />
                  </div>
                  <EditorTrays />
                </div>
              </TrayProvider>
            </EditorConfigProvider>
          </EditorProvider>
        </TimelineProvider>
      </EditorSidebarProvider>
    </UISidebarProvider>
  );
}
