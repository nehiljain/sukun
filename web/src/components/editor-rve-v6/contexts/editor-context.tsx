import React, { createContext, useContext, ReactNode } from "react";
import { Overlay, AspectRatio, CaptionStyles } from "../types";
import { VideoProjectState } from "../hooks/use-video-project-state";
// Define the shape of the context
interface EditorContextProps {
  // Overlay Management
  overlays: Overlay[]; // Array of all overlays in the editor
  selectedOverlayId: number | null; // Currently selected overlay's ID
  setSelectedOverlayId: any; // Function to select an overlay
  changeOverlay: (
    // Function to update overlay properties
    id: number,
    updater: Partial<Overlay> | ((overlay: Overlay) => Overlay),
  ) => void;

  // Player State
  isPlaying: boolean; // Current playback state
  currentFrame: number; // Current frame position in the video
  playerRef: React.RefObject<any>; // Reference to the video player component

  // Player Controls
  togglePlayPause: () => void; // Toggle play/pause state
  formatTime: (frame: number) => string; // Convert frame number to timestamp
  handleTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void; // Handle timeline scrubbing

  // Overlay Operations
  handleOverlayChange: (updatedOverlay: Overlay) => void; // Handle changes to overlay properties
  addOverlay: (overlay: Overlay) => void; // Add new overlay
  deleteOverlay: (id: number) => void; // Remove overlay
  duplicateOverlay: (id: number) => void; // Clone existing overlay
  splitOverlay: (id: number, splitPosition: number) => void; // Split overlay at given position

  // Video Dimensions and Aspect Ratio
  aspectRatio: AspectRatio; // Current aspect ratio setting
  setAspectRatio: (ratio: AspectRatio) => void; // Update aspect ratio
  playerDimensions: { width: number; height: number }; // Current player dimensions
  updatePlayerDimensions: (width: number, height: number) => void; // Update player size
  getAspectRatioDimensions: () => { width: number; height: number }; // Calculate dimensions based on ratio

  // Video Properties
  durationInFrames: number; // Total number of frames
  durationInSeconds: number; // Total duration in seconds
  renderMedia: () => void; // Trigger media rendering
  renderMediaState: any; // General state object with proper typing
  saveProject: (state: VideoProjectState) => Promise<boolean>; // Handle saving the editor state
  isSaveDisabled: boolean; // Whether saving is disabled
  isSaving: boolean; // Whether saving is in progress
  videoProjectId: string;
  videoProjectName: string;
  videoProjectStatus: string;
  updateVideoProjectStatus: (status: string) => Promise<boolean>;
  updateProjectName: (name: string) => Promise<boolean>;
  // Timeline
  deleteOverlaysByRow: (row: number) => void; // Delete overlays by row

  // Add these new history-related props
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // New style management prop
  updateOverlayStyles: (
    overlayId: number,
    styles: Partial<CaptionStyles>,
  ) => void;

  // New resetOverlays prop
  resetOverlays: () => void;
}

// Create the context with undefined as default value
const EditorContext = createContext<EditorContextProps | undefined>(undefined);

// Provider component that wraps parts of the app that need access to the context
export const EditorProvider: React.FC<{
  value: EditorContextProps;
  children: ReactNode;
}> = ({ value, children }) => {
  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};

// Custom hook that components can use to access the context
// Throws an error if used outside of EditorProvider
export const useEditorContext = (): EditorContextProps => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditorContext must be used within an EditorProvider");
  }
  return context;
};
