import React, { createContext, useContext, ReactNode } from "react";
import { Item, Track, VideoAsset } from "../types";

// Define the context type
type EditorContextType = {
  // Video asset
  videoAsset: VideoAsset | null;

  // Tracks and items
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  selectedItem: Item | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<Item | null>>;
  durationInFrames: number;

  // Player state
  currentFrame: number;
  fps: number;
  playerRef: React.RefObject<any>;
  cursorPosition: { x: number; y: number } | null;
  playerDimensions: { width: number; height: number };
  playerContainerRef: React.RefObject<HTMLDivElement>;

  // Functions
  handleAddItem: (type: string) => void;
  handleUpdateItem: (updatedItem: Item) => void;
  handleDeleteItem: (itemId: string) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  handleSave: () => Promise<void>;
  handleRenderVideo: () => Promise<void>;

  // State flags
  isRendering: boolean;
  isSaving: boolean;
  isRecording: boolean;

  // Voice recording
  startRecording: () => Promise<void>;
  stopRecording: () => void;
};

// Create the context with a default undefined value
const EditorContext = createContext<EditorContextType | undefined>(undefined);

// Provider component
export const EditorProvider: React.FC<{
  children: ReactNode;
  value: EditorContextType;
}> = ({ children, value }) => {
  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};

// Custom hook to use the editor context
export const useEditor = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
};
