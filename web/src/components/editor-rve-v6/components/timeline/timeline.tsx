/**
 * Timeline Component
 *
 * A complex timeline interface that allows users to manage video overlays through
 * drag-and-drop interactions, splitting, duplicating, and deletion operations.
 * The timeline visualizes overlay positions and durations across video frames.
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useTimeline } from "../../contexts/timeline-context";
import { useTimelineDragAndDrop } from "../../hooks/use-timeline-drag-and-drop";
import { useTimelineEventHandlers } from "../../hooks/use-timeline-event-handlers";
import { useTimelineState } from "../../hooks/use-timeline-state";
import { useTimelineRowsShortcuts } from "../../hooks/use-timeline-rows-shortcuts";
import { Overlay } from "../../types";
import GhostMarker from "./ghost-marker";
import TimelineGrid from "./timeline-grid";
import TimelineMarker from "./timeline-marker";
import TimeMarkers from "./timeline-markers";

interface TimelineProps {
  /** Array of overlay objects to be displayed on the timeline */
  overlays: Overlay[];
  /** Total duration of the video in frames */
  durationInFrames: number;
  /** ID of the currently selected overlay */
  selectedOverlayId: number | null;
  /** Callback to update the selected overlay */
  setSelectedOverlayId: (id: number | null) => void;
  /** Current playhead position in frames */
  currentFrame: number;
  /** Callback when an overlay is modified */
  onOverlayChange: (updatedOverlay: Overlay) => void;
  /** Callback to update the current frame position */
  setCurrentFrame: (frame: number) => void;
  /** Callback for timeline click events */
  onTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** Callback to delete an overlay */
  onOverlayDelete: (id: number) => void;
  /** Callback to duplicate an overlay */
  onOverlayDuplicate: (id: number) => void;
  /** Callback to split an overlay at a specific position */
  onSplitOverlay: (id: number, splitPosition: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  overlays,
  durationInFrames,
  selectedOverlayId,
  setSelectedOverlayId,
  currentFrame,
  onOverlayChange,
  setCurrentFrame,
  onTimelineClick,
  onOverlayDelete,
  onOverlayDuplicate,
  onSplitOverlay,
}) => {
  // State for tracking hover position during split operations
  const [lastKnownHoverInfo, setLastKnownHoverInfo] = useState<{
    itemId: number;
    position: number;
  } | null>(null);

  const { visibleRows, timelineRef, zoomScale, handleWheelZoom } =
    useTimeline();

  // State for context menu visibility
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  // Custom hooks for timeline functionality
  const {
    isDragging,
    draggedItem,
    ghostElement,
    ghostMarkerPosition,
    dragInfo,
    handleDragStart: timelineStateHandleDragStart,
    updateGhostElement,
    resetDragState,
    setGhostMarkerPosition,
  } = useTimelineState(durationInFrames, visibleRows, timelineRef);

  const { handleDragStart, handleDrag, handleDragEnd } = useTimelineDragAndDrop(
    {
      overlays,
      durationInFrames,
      onOverlayChange,
      updateGhostElement,
      resetDragState,
      timelineRef,
      dragInfo,
      maxRows: visibleRows,
    },
  );

  const { handleMouseMove, handleTouchMove, handleTimelineMouseLeave } =
    useTimelineEventHandlers({
      handleDrag,
      handleDragEnd,
      isDragging,
      timelineRef,
      setGhostMarkerPosition,
    });

  // Event Handlers
  const combinedHandleDragStart = useCallback(
    (
      overlay: Overlay,
      clientX: number,
      clientY: number,
      action: "move" | "resize-start" | "resize-end",
    ) => {
      timelineStateHandleDragStart(overlay, clientX, clientY, action);
      handleDragStart(overlay, clientX, clientY, action);
    },
    [timelineStateHandleDragStart, handleDragStart],
  );

  const handleTimelineClick = useCallback(
    (clickPosition: number) => {
      const newFrame = Math.round(clickPosition * durationInFrames);
      setCurrentFrame(newFrame);
    },
    [durationInFrames, setCurrentFrame],
  );

  const handleDeleteItem = useCallback(
    (id: number) => onOverlayDelete(id),
    [onOverlayDelete],
  );

  const handleDuplicateItem = useCallback(
    (id: number) => onOverlayDuplicate(id),
    [onOverlayDuplicate],
  );

  const handleItemHover = useCallback(
    (itemId: number, hoverPosition: number) => {
      setLastKnownHoverInfo({
        itemId,
        position: Math.round(hoverPosition),
      });
    },
    [],
  );

  const handleSplitItem = useCallback(
    (id: number) => {
      if (lastKnownHoverInfo?.itemId === id) {
        onSplitOverlay(id, lastKnownHoverInfo.position);
      }
    },
    [lastKnownHoverInfo, onSplitOverlay],
  );

  const handleContextMenuChange = useCallback(
    (isOpen: boolean) => setIsContextMenuOpen(isOpen),
    [],
  );

  const handleRemoveGap = useCallback(
    (rowIndex: number, gapStart: number) => {
      // Find all items that come after the gap in the same row
      const overlaysToShift = overlays
        .filter(
          (overlay) => overlay.row === rowIndex && overlay.from > gapStart,
        )
        .sort((a, b) => a.from - b.from);

      if (overlaysToShift.length === 0) return;

      // Calculate the gap size based on the first overlay after the gap
      const firstOverlayAfterGap = overlaysToShift[0];
      const gapSize = firstOverlayAfterGap.from - gapStart;

      // Create all updates at once
      const updates = overlaysToShift.map((overlay) => ({
        ...overlay,
        from: overlay.from - gapSize,
      }));

      // Apply all updates
      updates.forEach((update) => onOverlayChange(update));
    },
    [overlays, onOverlayChange],
  );

  useTimelineRowsShortcuts({
    handleDeleteOverlay: handleDeleteItem,
    handleSplitItem: handleSplitItem,
    selectedOverlayId,
    lastKnownHoverInfo,
  });

  useEffect(() => {
    const element = timelineRef.current;
    if (!element) return;

    element.addEventListener("wheel", handleWheelZoom, { passive: false });
    return () => element.removeEventListener("wheel", handleWheelZoom);
  }, [handleWheelZoom]);

  // Render
  return (
    <div className="flex flex-col w-full">
      <div
        className="relative overflow-x-auto scrollbar-hide w-full"
        style={{
          scrollbarWidth: "none" /* Firefox */,
          msOverflowStyle: "none" /* IE and Edge */,
        }}
      >
        <div
          ref={timelineRef}
          className="pl-2 pr-2 pb-2 relative bg-gray-900 dark:bg-gray-900 bg-white"
          style={{
            width: `${100 * zoomScale}%`,
            minWidth: "100%",
            willChange: "width, transform",
            transform: `translateZ(0)`,
          }}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onMouseUp={handleDragEnd}
          onTouchEnd={handleDragEnd}
          onMouseLeave={handleTimelineMouseLeave}
          onClick={onTimelineClick}
        >
          <div className="relative h-full">
            {/* Timeline header with frame markers */}
            <div className="h-[1.3rem]">
              <TimeMarkers
                durationInFrames={durationInFrames}
                handleTimelineClick={handleTimelineClick}
                zoomScale={zoomScale}
              />
            </div>

            {/* Current frame indicator */}
            <TimelineMarker
              currentFrame={currentFrame}
              totalDuration={durationInFrames}
            />

            {/* Drag operation visual feedback */}
            <GhostMarker
              position={ghostMarkerPosition}
              isDragging={isDragging}
              isContextMenuOpen={isContextMenuOpen}
            />

            {/* Main timeline grid with overlays */}
            <TimelineGrid
              overlays={overlays}
              currentFrame={currentFrame}
              isDragging={isDragging}
              draggedItem={draggedItem}
              selectedOverlayId={selectedOverlayId}
              setSelectedOverlayId={setSelectedOverlayId}
              handleDragStart={combinedHandleDragStart}
              totalDuration={durationInFrames}
              ghostElement={ghostElement}
              onDeleteItem={handleDeleteItem}
              onDuplicateItem={handleDuplicateItem}
              onSplitItem={handleSplitItem}
              onHover={handleItemHover}
              onContextMenuChange={handleContextMenuChange}
              onRemoveGap={handleRemoveGap}
              zoomScale={zoomScale}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
