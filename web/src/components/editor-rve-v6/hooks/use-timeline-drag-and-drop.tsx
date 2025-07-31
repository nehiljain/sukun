import { useCallback, useMemo } from "react";
import { Overlay, OverlayType } from "../types";

interface DragInfo {
  id: number;
  action: "move" | "resize-start" | "resize-end";
  startX: number;
  startY: number;
  startPosition: number;
  startDuration: number;
  startRow: number;
  ghostLeft?: number;
  ghostWidth?: number;
  ghostTop?: number;
}

interface UseTimelineDragAndDropProps {
  overlays: Overlay[];
  durationInFrames: number;
  onOverlayChange: (updatedOverlay: Overlay) => void;
  updateGhostElement: (
    newLeft: number,
    newWidth: number,
    newTop: number,
  ) => void;
  resetDragState: () => void;
  timelineRef: React.RefObject<HTMLDivElement>;
  dragInfo: React.MutableRefObject<DragInfo | null>;
  maxRows: number;
}

/**
 * Hook to handle drag and drop functionality for timeline overlays.
 * Manages overlay positioning, resizing, and collision detection.
 *
 * @param props.overlays - Array of overlay items to manage
 * @param props.durationInFrames - Total duration of the timeline in frames
 * @param props.onOverlayChange - Callback when an overlay is modified
 * @param props.updateGhostElement - Function to update the ghost element's position during drag
 * @param props.resetDragState - Function to reset the drag state
 * @param props.timelineRef - Reference to the timeline DOM element
 * @param props.dragInfo - Mutable reference holding the current drag state
 * @param props.maxRows - Maximum number of rows in the timeline
 * @returns Object containing drag handler functions
 */
export const useTimelineDragAndDrop = ({
  overlays,
  durationInFrames,
  onOverlayChange,
  updateGhostElement,
  resetDragState,
  timelineRef,
  dragInfo,
  maxRows,
}: UseTimelineDragAndDropProps) => {
  const snapToGrid = useCallback((value: number) => {
    const GRID_SIZE = 1;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  // Memoize sorted overlays to avoid sorting on every render
  const sortedOverlays = useMemo(() => {
    return [...overlays].sort((a, b) => a.from - b.from);
  }, [overlays]);

  const checkOverlapAndAdjust = useCallback(
    (
      currentId: number,
      newFrom: number,
      newDuration: number,
      newRow: number,
    ): { from: number; row: number } => {
      let adjustedFrom = newFrom;
      let adjustedRow = newRow;

      // First, try to fit in the current row
      for (let row = adjustedRow; row < maxRows; row++) {
        // Get all overlays in the current row, sorted by position
        const overlaysInRow = sortedOverlays
          .filter((overlay) => overlay.id !== currentId && overlay.row === row)
          .sort((a, b) => a.from - b.from);

        // Find gaps between overlays
        const availableSpaces: { start: number; end: number }[] = [];

        // Add initial space if available
        if (overlaysInRow.length === 0 || overlaysInRow[0].from > 0) {
          availableSpaces.push({
            start: 0,
            end: overlaysInRow.length ? overlaysInRow[0].from : Infinity,
          });
        }

        // Find gaps between overlays
        for (let i = 0; i < overlaysInRow.length; i++) {
          const currentOverlay = overlaysInRow[i];
          const nextOverlay = overlaysInRow[i + 1];

          const currentEnd =
            currentOverlay.from + currentOverlay.durationInFrames;

          if (nextOverlay) {
            if (nextOverlay.from > currentEnd) {
              availableSpaces.push({
                start: currentEnd,
                end: nextOverlay.from,
              });
            }
          } else {
            // Add space after last overlay if available
            if (currentEnd < Infinity) {
              availableSpaces.push({
                start: currentEnd,
                end: Infinity,
              });
            }
          }
        }

        // Find the best fitting space
        const bestSpace = availableSpaces.find(
          (space) =>
            space.end - space.start >= newDuration &&
            adjustedFrom >= space.start &&
            adjustedFrom <= space.end - newDuration,
        );

        if (bestSpace) {
          // If we found a suitable space, use it
          adjustedFrom = Math.max(
            bestSpace.start,
            Math.min(adjustedFrom, bestSpace.end - newDuration),
          );
          return { from: adjustedFrom, row };
        }

        // If no suitable space found in current row, try the next row
        adjustedRow = row + 1;
      }

      // If we couldn't find space in any row, place at the end of the last row
      const lastRow = maxRows - 1;
      const lastOverlayInLastRow = sortedOverlays
        .filter(
          (overlay) => overlay.row === lastRow && overlay.id !== currentId,
        )
        .reduce(
          (latest, overlay) =>
            Math.max(latest, overlay.from + overlay.durationInFrames),
          0,
        );

      adjustedFrom = Math.max(lastOverlayInLastRow, 0);

      return { from: adjustedFrom, row: lastRow };
    },
    [sortedOverlays, maxRows],
  );

  const handleDragStart = useCallback(
    (
      overlay: Overlay,
      clientX: number,
      clientY: number,
      action: "move" | "resize-start" | "resize-end",
    ) => {
      if (timelineRef.current) {
        dragInfo.current = {
          id: overlay.id,
          action,
          startX: clientX,
          startY: clientY,
          startPosition: overlay.from,
          startDuration: overlay.durationInFrames,
          startRow: overlay.row || 0,
        };

        updateGhostElement(
          (overlay.from / durationInFrames) * 100,
          (overlay.durationInFrames / durationInFrames) * 100,
          (overlay.row || 0) * (100 / maxRows),
        );
      }
    },
    [durationInFrames, maxRows, updateGhostElement],
  );

  const handleDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragInfo.current || !timelineRef.current) return;

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const deltaX = clientX - dragInfo.current.startX;
      const deltaY = clientY - dragInfo.current.startY;
      const deltaTime = snapToGrid(
        (deltaX / timelineRect.width) * durationInFrames,
      );

      const rowHeight = timelineRect.height / maxRows;
      const deltaRow = Math.round(deltaY / rowHeight);

      let newLeft = (dragInfo.current.startPosition / durationInFrames) * 100;
      let newWidth = (dragInfo.current.startDuration / durationInFrames) * 100;
      let newRow = dragInfo.current.startRow + deltaRow;

      // Clamp the row within bounds
      newRow = Math.max(0, Math.min(maxRows - 1, newRow));

      switch (dragInfo.current.action) {
        case "move":
          newLeft =
            ((dragInfo.current.startPosition + deltaTime) / durationInFrames) *
            100;
          break;
        case "resize-start": {
          // Keep the end position fixed and adjust start position and width
          const originalEnd =
            dragInfo.current.startPosition + dragInfo.current.startDuration;
          const newStart = Math.max(
            0,
            Math.min(
              originalEnd - 1, // Ensure at least 1 frame duration
              dragInfo.current.startPosition + deltaTime,
            ),
          );

          newLeft = (newStart / durationInFrames) * 100;
          newWidth = ((originalEnd - newStart) / durationInFrames) * 100;
          break;
        }
        case "resize-end": {
          // Keep the start position fixed and only adjust width
          const newDuration = Math.max(
            1,
            dragInfo.current.startDuration + deltaTime,
          );
          newWidth = (newDuration / durationInFrames) * 100;
          break;
        }
      }

      // Ensure values are within valid ranges
      newLeft = Math.max(0, newLeft);
      newWidth = Math.max(0, newWidth);

      // Update ghost element directly without overlap checking
      updateGhostElement(newLeft, newWidth, newRow * (100 / maxRows));

      // Update dragInfo with new ghost position
      dragInfo.current.ghostLeft = newLeft;
      dragInfo.current.ghostWidth = newWidth;
      dragInfo.current.ghostTop = newRow * (100 / maxRows);
    },
    [durationInFrames, maxRows, snapToGrid, updateGhostElement],
  );

  const handleDragEnd = useCallback(() => {
    if (
      dragInfo.current &&
      dragInfo.current.ghostLeft !== undefined &&
      dragInfo.current.ghostWidth !== undefined &&
      dragInfo.current.ghostTop !== undefined
    ) {
      const updatedOverlay = overlays.find(
        (overlay) => overlay.id === dragInfo.current!.id,
      );
      if (updatedOverlay) {
        const newFrom = Math.max(
          0,
          snapToGrid((dragInfo.current.ghostLeft / 100) * durationInFrames),
        );
        const newDuration = Math.max(
          1,
          snapToGrid((dragInfo.current.ghostWidth / 100) * durationInFrames),
        );
        const newRow = Math.round(dragInfo.current.ghostTop / (100 / maxRows));

        // For video/sound/caption clips, adjust the content when trimming from the start
        let additionalUpdates = {};
        if (dragInfo.current.action === "resize-start") {
          const trimmedFrames = newFrom - dragInfo.current.startPosition;
          const trimmedMs = (trimmedFrames / 30) * 1000; // Assuming 30fps

          if (updatedOverlay.type === OverlayType.VIDEO) {
            additionalUpdates = {
              videoStartTime:
                (updatedOverlay.videoStartTime || 0) + trimmedFrames,
            };
          } else if (updatedOverlay.type === OverlayType.SOUND) {
            additionalUpdates = {
              startFromSound:
                (updatedOverlay.startFromSound || 0) + trimmedFrames,
            };
          } else if (updatedOverlay.type === OverlayType.CAPTION) {
            // Adjust caption timings when trimming from start
            additionalUpdates = {
              captions: updatedOverlay.captions.map((caption) => ({
                ...caption,
                startMs: caption.startMs - trimmedMs,
                endMs: caption.endMs - trimmedMs,
                words: caption.words.map((word) => ({
                  ...word,
                  startMs: word.startMs - trimmedMs,
                  endMs: word.endMs - trimmedMs,
                })),
              })),
            };
          }
        }

        const { from: adjustedFrom, row: adjustedRow } = checkOverlapAndAdjust(
          updatedOverlay.id,
          newFrom,
          newDuration,
          newRow,
        );

        onOverlayChange({
          ...updatedOverlay,
          ...additionalUpdates,
          from: adjustedFrom,
          durationInFrames: newDuration,
          row: adjustedRow,
        });
      }
    }

    resetDragState();
  }, [
    overlays,
    durationInFrames,
    maxRows,
    snapToGrid,
    checkOverlapAndAdjust,
    onOverlayChange,
    resetDragState,
  ]);

  return {
    /**
     * Initializes drag operation for an overlay
     * @param overlay - The overlay being dragged
     * @param clientX - Initial mouse X position
     * @param clientY - Initial mouse Y position
     * @param action - Type of drag operation: 'move', 'resize-start', or 'resize-end'
     */
    handleDragStart,

    /**
     * Updates overlay position/size during drag
     * @param clientX - Current mouse X position
     * @param clientY - Current mouse Y position
     */
    handleDrag,

    /**
     * Finalizes drag operation and updates overlay state
     * Handles collision detection and adjusts position if needed
     */
    handleDragEnd,
  };
};
