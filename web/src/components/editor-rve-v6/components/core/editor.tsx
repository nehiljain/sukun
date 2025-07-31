"use client";

import React from "react";
import { EditorHeader } from "./editor-header";
import { useSidebar } from "../../contexts/sidebar-context";
import { OverlayType } from "../../types";

import { useEditorContext } from "../../contexts/editor-context";
import { TimelineControls } from "../timeline/timeline-controls";
import { FPS } from "../../constants";
import Timeline from "../timeline/timeline";
import { VideoPlayer } from "./video-player";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { VideoOverlayPanel } from "../overlays/video/video-overlay-panel";
import { TextOverlaysPanel } from "../overlays/text/text-overlays-panel";
import SoundsPanel from "../overlays/sounds/sounds-panel";
import { CaptionsPanel } from "../overlays/captions/captions-panel";
import { ImageOverlayPanel } from "../overlays/images/image-overlay-panel";
import { RectangleOverlayPanel } from "../overlays/rectangle/rectangle-overlay-panel";
import { WebcamOverlayPanel } from "../overlays/webcam/webcam-overlay-panel";
import { ButtonClickOverlayPanel } from "../overlays/button-click/button-click-overlay-panel";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorShortcuts } from "../../hooks/use-editor-shortcuts";

/**
 * Main Editor Component
 *
 * @component
 * @description
 * The core editor interface that orchestrates the video editing experience.
 * This component manages:
 * - Video playback and controls
 * - Timeline visualization and interaction
 * - Overlay management (selection, modification, deletion)
 * - Responsive behavior for desktop/mobile views
 *
 * The component uses the EditorContext to manage state and actions across
 * its child components. It implements a responsive design that shows a
 * mobile-specific message for smaller screens.
 *
 * Key features:
 * - Video player integration
 * - Timeline controls (play/pause, seeking)
 * - Overlay management (selection, modification)
 * - Frame-based navigation
 * - Mobile detection and fallback UI
 *
 * @example
 * ```tsx
 * <Editor />
 * ```
 */
export const Editor: React.FC = () => {
  const { activePanel } = useSidebar();
  /** State to track if the current viewport is mobile-sized */
  const [isMobile, setIsMobile] = React.useState(false);

  // Add the editor shortcuts hook
  useEditorShortcuts();

  /**
   * Effect to handle mobile detection and window resize events
   * Uses 768px as the standard mobile breakpoint
   */
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /**
   * Destructure values and functions from the editor context
   * These provide core functionality for the editor's features
   */
  const {
    overlays, // Array of current overlay objects
    selectedOverlayId, // ID of the currently selected overlay
    setSelectedOverlayId, // Function to update selected overlay
    isPlaying, // Current playback state
    currentFrame, // Current frame position
    playerRef, // Reference to video player
    togglePlayPause, // Function to toggle play/pause
    formatTime, // Function to format time display
    handleOverlayChange, // Function to handle overlay modifications
    handleTimelineClick, // Function to handle timeline interaction
    deleteOverlay, // Function to remove an overlay
    duplicateOverlay, // Function to clone an overlay
    splitOverlay, // Function to split an overlay at current position
    durationInFrames, // Total duration in frames
  } = useEditorContext();

  const getPanelTitle = (type: OverlayType): string => {
    switch (type) {
      case OverlayType.VIDEO:
        return "Video";
      case OverlayType.TEXT:
        return "Text";
      case OverlayType.SOUND:
        return "Audio";
      case OverlayType.CAPTION:
        return "Caption";
      case OverlayType.IMAGE:
        return "Image";
      case OverlayType.RECTANGLE:
        return "Rectangle";
      case OverlayType.WEBCAM:
        return "Webcam";
      case OverlayType.BUTTON_CLICK:
        return "Button Click";
      default:
        return "Unknown";
    }
  };

  /**
   * Renders the appropriate panel component based on the active panel selection
   * @returns {React.ReactNode} The component corresponding to the active panel
   */
  const renderActivePanel = () => {
    switch (activePanel) {
      case OverlayType.TEXT:
        return <TextOverlaysPanel />;
      case OverlayType.SOUND:
        return <SoundsPanel />;
      case OverlayType.VIDEO:
        return <VideoOverlayPanel />;
      case OverlayType.CAPTION:
        return <CaptionsPanel />;
      case OverlayType.IMAGE:
        return <ImageOverlayPanel />;
      case OverlayType.RECTANGLE:
        return <RectangleOverlayPanel />;
      case OverlayType.WEBCAM:
        return <WebcamOverlayPanel />;
      case OverlayType.BUTTON_CLICK:
        return <ButtonClickOverlayPanel />;
      default:
        return null;
    }
  };
  /**
   * Mobile fallback UI
   * Displays a message when accessed on mobile devices
   */
  if (isMobile) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-6">
        <div className="text-center text-foreground">
          <h2 className="text-xl font-heading font-bold mb-3">
            React Video Editor
          </h2>
          <p className="text-sm text-muted-foreground font-light mb-4">
            Currently, React Video Editor is designed as a full-screen desktop
            experience. We&apos;re actively working on making it
            mobile-friendly! 👀
          </p>
          <p className="text-sm text-muted-foreground font-light">
            Want mobile support? Let us know by voting{" "}
            <a
              href="https://reactvideoeditor.featurebase.app/p/bulb-mobile-layout-version-2"
              className="text-accent font-medium hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </a>
            !
          </p>
        </div>
      </div>
    );
  }

  /**
   * Main editor layout
   * Organized in a column layout with the following sections:
   * 1. Editor header (controls and options)
   * 2. Main content area (video player)
   * 3. Timeline controls
   * 4. Timeline visualization
   */
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
        <Sidebar
          collapsible="none"
          className="hidden w-[380px] md:flex bg-background border-r border-border"
        >
          <SidebarHeader className="gap-3.5 border-b border-border p-4 bg-background">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-lg font-heading font-medium text-foreground">
                  {activePanel ? getPanelTitle(activePanel as OverlayType) : ""}
                </div>
              </div>
              {selectedOverlayId && (
                <Button
                  variant="white"
                  size="icon"
                  onClick={() => setSelectedOverlayId(null)}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SidebarHeader>
          <SidebarContent
            className="text-foreground bg-background p-3 overflow-y-auto"
            style={{ height: "calc(100vh - 400px)" }}
          >
            {renderActivePanel()}
          </SidebarContent>
        </Sidebar>
        <div className="flex flex-col flex-1">
          <EditorHeader />
          <VideoPlayer playerRef={playerRef} />
        </div>
      </div>

      <TimelineControls
        isPlaying={isPlaying}
        togglePlayPause={togglePlayPause}
        currentFrame={currentFrame}
        totalDuration={durationInFrames}
        formatTime={formatTime}
      />

      <Timeline
        currentFrame={currentFrame}
        overlays={overlays}
        durationInFrames={durationInFrames}
        selectedOverlayId={selectedOverlayId}
        setSelectedOverlayId={setSelectedOverlayId}
        onOverlayChange={handleOverlayChange}
        onOverlayDelete={deleteOverlay}
        onOverlayDuplicate={duplicateOverlay}
        onSplitOverlay={splitOverlay}
        setCurrentFrame={(frame) => {
          if (playerRef.current) {
            playerRef.current.seekTo(frame / FPS);
          }
        }}
        onTimelineClick={handleTimelineClick}
      />
    </div>
  );
};
