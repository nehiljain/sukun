import React, { createContext, useContext, useState, ReactNode } from "react";
import { Overlay } from "../types";

interface OverlayContextType {
  overlays: Overlay[];
  selectedOverlayId: number | null;
  setSelectedOverlayId: (id: number | null) => void;
  addOverlay: (overlay: Overlay) => void;
  updateOverlay: (overlay: Overlay) => void;
  removeOverlay: (id: number) => void;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

interface OverlayProviderProps {
  children: ReactNode;
  initialOverlays?: Overlay[];
}

/**
 * Provider component for managing overlay state in the video editor
 */
export const OverlayProvider: React.FC<OverlayProviderProps> = ({
  children,
  initialOverlays = [],
}) => {
  const [overlays, setOverlays] = useState<Overlay[]>(initialOverlays);
  const [selectedOverlayId, setSelectedOverlayId] = useState<number | null>(null);

  const addOverlay = (overlay: Overlay) => {
    setOverlays((prevOverlays) => [...prevOverlays, overlay]);
    setSelectedOverlayId(overlay.id);
  };

  const updateOverlay = (updatedOverlay: Overlay) => {
    setOverlays((prevOverlays) =>
      prevOverlays.map((overlay) =>
        overlay.id === updatedOverlay.id ? updatedOverlay : overlay
      )
    );
  };

  const removeOverlay = (id: number) => {
    setOverlays((prevOverlays) => prevOverlays.filter((overlay) => overlay.id !== id));
    if (selectedOverlayId === id) {
      setSelectedOverlayId(null);
    }
  };

  return (
    <OverlayContext.Provider
      value={{
        overlays,
        selectedOverlayId,
        setSelectedOverlayId,
        addOverlay,
        updateOverlay,
        removeOverlay,
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
};

/**
 * Hook for accessing the overlay context
 * @throws Error if used outside of an OverlayProvider
 */
export const useOverlayContext = (): OverlayContextType => {
  const context = useContext(OverlayContext);
  if (context === undefined) {
    throw new Error("useOverlayContext must be used within an OverlayProvider");
  }
  return context;
}; 