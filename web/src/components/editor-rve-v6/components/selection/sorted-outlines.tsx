import React from "react";
import { Sequence } from "remotion";
import { SelectionOutline } from "./selected-outline";
import { Overlay } from "../../types";

/**
 * Reorders overlays to ensure selected overlay appears on top of others
 * @param overlays - Array of overlay objects to sort
 * @param selectedOverlayId - ID of the currently selected overlay
 * @returns Reordered array with selected overlay at the end (top)
 */
const displaySelectedOverlayOnTop = (
  overlays: Overlay[],
  selectedOverlayId: number | null,
): Overlay[] => {
  const selectedOverlays = overlays.filter(
    (overlay) => overlay.id === selectedOverlayId,
  );
  const unselectedOverlays = overlays.filter(
    (overlay) => overlay.id !== selectedOverlayId,
  );

  return [...unselectedOverlays, ...selectedOverlays];
};

/**
 * Renders a sorted list of selection outlines for overlays
 * The selected overlay is always rendered last (on top)
 * Each outline is wrapped in a Remotion Sequence component for timeline positioning
 *
 * @param props
 * @param props.overlays - Array of overlay objects to render
 * @param props.selectedOverlayId - ID of currently selected overlay
 * @param props.changeOverlay - Callback to modify an overlay's properties
 * @param props.setSelectedOverlayId - State setter for selected overlay ID
 */
export const SortedOutlines: React.FC<{
  overlays: Overlay[];
  selectedOverlayId: number | null;
  changeOverlay: (
    overlayId: number,
    updater: (overlay: Overlay) => Overlay,
  ) => void;
  setSelectedOverlayId: React.Dispatch<React.SetStateAction<number | null>>;
}> = ({ overlays, selectedOverlayId, changeOverlay, setSelectedOverlayId }) => {
  const overlaysToDisplay = React.useMemo(
    () => displaySelectedOverlayOnTop(overlays, selectedOverlayId),
    [overlays, selectedOverlayId],
  );

  const isDragging = React.useMemo(
    () => overlays.some((overlay) => overlay.isDragging),
    [overlays],
  );

  return overlaysToDisplay.map((overlay) => {
    return (
      <Sequence
        key={overlay.id}
        from={overlay.from}
        durationInFrames={overlay.durationInFrames}
        layout="none"
      >
        <SelectionOutline
          changeOverlay={changeOverlay}
          overlay={overlay}
          setSelectedOverlayId={setSelectedOverlayId}
          selectedOverlayId={selectedOverlayId}
          isDragging={isDragging}
        />
      </Sequence>
    );
  });
};
