/**
 * TimelineGrid Component
 * Renders a grid-based timeline view for managing overlay items across multiple rows.
 * Supports drag and drop, resizing, and various item management operations.
 */

import React, { useMemo } from "react";
import { ROW_HEIGHT } from "../../constants";
import { useTimeline } from "../../contexts/timeline-context";
import { Overlay } from "../../types";
import GapIndicator from "./timeline-gap-indicator";
import TimelineItem from "./timeline-item";

/**
 * Props for the TimelineGrid component
 * @interface TimelineGridProps
 */
interface TimelineGridProps {
  /** Array of overlay items to display in the timeline */
  overlays: Overlay[];
  /** Indicates if an item is currently being dragged */
  isDragging: boolean;
  /** The overlay item currently being dragged, if any */
  draggedItem: Overlay | null;
  /** ID of the currently selected overlay */
  selectedOverlayId: number | null;
  /** Callback to update the selected overlay ID */
  setSelectedOverlayId: (id: number | null) => void;
  /** Callback triggered when dragging starts */
  handleDragStart: (
    overlay: Overlay,
    clientX: number,
    clientY: number,
    action: "move" | "resize-start" | "resize-end",
  ) => void;
  /** Total duration of the timeline in seconds */
  totalDuration: number;
  /** Visual element showing drag preview */
  ghostElement: {
    left: number; // Position from left as percentage
    width: number; // Width as percentage
    top: number; // Vertical position
  } | null;
  /** Callback to delete an overlay item */
  onDeleteItem: (id: number) => void;
  /** Callback to duplicate an overlay item */
  onDuplicateItem: (id: number) => void;
  /** Callback to split an overlay item at current position */
  onSplitItem: (id: number) => void;
  /** Callback when hovering over an item */
  onHover: (itemId: number, position: number) => void;
  /** Callback when context menu state changes */
  onContextMenuChange: (open: boolean) => void;
  /** Callback to remove gap between items */
  onRemoveGap?: (rowIndex: number, gapStart: number, gapEnd: number) => void;
  /** Current frame of the timeline */
  currentFrame: number;
  /** Zoom scale of the timeline */
  zoomScale: number;
}

/**
 * TimelineGrid component that displays overlay items in a row-based timeline view
 */
const TimelineGrid: React.FC<TimelineGridProps> = ({
  overlays,
  isDragging,
  draggedItem,
  selectedOverlayId,
  setSelectedOverlayId,
  handleDragStart,
  totalDuration,
  ghostElement,
  onDeleteItem,
  onDuplicateItem,
  onSplitItem,
  onHover,
  onContextMenuChange,
  onRemoveGap,
  currentFrame,
  zoomScale,
}) => {
  const { visibleRows } = useTimeline();

  // Create a memoized selectedItem object
  const selectedItem = useMemo(
    () => (selectedOverlayId !== null ? { id: selectedOverlayId } : null),
    [selectedOverlayId],
  );

  /**
   * Finds gaps between overlay items in a single timeline row
   * @param rowItems - Array of Overlay items in the current row
   * @returns Array of gap objects, each containing start and end times
   *
   * @example
   * // For a row with items: [0-30], [50-80], [100-120]
   * // Returns: [{start: 30, end: 50}, {start: 80, end: 100}]
   *
   * @description
   * This function identifies empty spaces (gaps) between overlay items in a timeline row:
   * 1. Converts each item into start and end time points
   * 2. Sorts all time points chronologically
   * 3. Identifies three types of gaps:
   *    - Gaps at the start (if first item doesn't start at 0)
   *    - Gaps between items
   *    - Gaps at the end are not included as they're considered infinite
   */
  const findGapsInRow = (rowItems: Overlay[]) => {
    if (rowItems.length === 0) return [];

    const timePoints = rowItems
      .flatMap((item) => [
        { time: item.from, type: "start" },
        { time: item.from + item.durationInFrames, type: "end" },
      ])
      .sort((a, b) => a.time - b.time);

    return timePoints.reduce(
      (gaps, point, index, points) => {
        // Handle gap at the start
        if (index === 0 && point.time > 0) {
          gaps.push({ start: 0, end: point.time });
        }

        // Handle gaps between items
        if (index < points.length - 1) {
          const currentTime = point.type === "end" ? point.time : null;
          const nextTime = points[index + 1].time;

          if (currentTime !== null && nextTime - currentTime > 0) {
            gaps.push({ start: currentTime, end: nextTime });
          }
        }

        return gaps;
      },
      [] as { start: number; end: number }[],
    );
  };

  return (
    <div
      className="relative mt-3 overflow-x-auto overflow-y-hidden bg-white dark:bg-gray-900"
      style={{ height: `${visibleRows * ROW_HEIGHT + 8}px` }}
    >
      <div className="absolute inset-0 flex flex-col space-y-2">
        {Array.from({ length: visibleRows }).map((_, rowIndex) => {
          const rowItems = overlays.filter(
            (overlay) => overlay.row === rowIndex,
          );
          const gaps = findGapsInRow(rowItems);

          return (
            <div
              key={rowIndex}
              className="flex-1 bg-slate-100/90 dark:bg-gray-800 rounded-md relative"
            >
              {rowItems.map((overlay, index) => (
                <TimelineItem
                  key={`${overlay.id}-${index}`}
                  item={overlay}
                  isDragging={isDragging}
                  draggedItem={draggedItem}
                  selectedItem={selectedItem}
                  setSelectedItem={(item) => setSelectedOverlayId(item.id)}
                  handleMouseDown={(action, e) =>
                    handleDragStart(overlay, e.clientX, e.clientY, action)
                  }
                  handleTouchStart={(action, e) => {
                    const touch = e.touches[0];
                    handleDragStart(
                      overlay,
                      touch.clientX,
                      touch.clientY,
                      action,
                    );
                  }}
                  totalDuration={totalDuration}
                  onDeleteItem={onDeleteItem}
                  onDuplicateItem={onDuplicateItem}
                  onSplitItem={onSplitItem}
                  onHover={onHover}
                  onContextMenuChange={onContextMenuChange}
                  currentFrame={currentFrame}
                  zoomScale={zoomScale}
                />
              ))}

              {/* Gap indicators */}
              {!isDragging &&
                gaps.map((gap, gapIndex) => (
                  <GapIndicator
                    key={`gap-${rowIndex}-${gapIndex}`}
                    gap={gap}
                    rowIndex={rowIndex}
                    totalDuration={totalDuration}
                    onRemoveGap={onRemoveGap}
                  />
                ))}

              {/* Ghost element with updated colors */}
              {ghostElement &&
                Math.floor(ghostElement.top / (100 / visibleRows)) ===
                  rowIndex && (
                  <div
                    className="absolute inset-y-0 rounded-sm border-blue-500 dark:border-white border bg-blue-100/30 dark:bg-gray-400/30 pointer-events-none"
                    style={{
                      left: `${ghostElement.left}%`,
                      width: `${Math.max(ghostElement.width, 1)}%`,
                      minWidth: "8px",
                      zIndex: 50,
                    }}
                  />
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineGrid;
