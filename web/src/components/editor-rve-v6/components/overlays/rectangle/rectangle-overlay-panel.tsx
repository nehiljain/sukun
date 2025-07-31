import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useTimeline } from "../../../contexts/timeline-context";
import { OverlayType, RectangleOverlay, Overlay } from "../../../types";
import { RectangleDetails } from "./rectangle-details";
import { Square } from "lucide-react";

/**
 * RectangleOverlayPanel component for adding and configuring rectangle overlays
 */
export const RectangleOverlayPanel: React.FC = () => {
  const { addOverlay, selectedOverlayId, overlays, durationInFrames } =
    useEditorContext();
  const { findNextAvailablePosition } = useTimelinePositioning();
  const { visibleRows } = useTimeline();
  const [localOverlay, setLocalOverlay] = useState<RectangleOverlay | null>(
    null,
  );

  // Update local overlay when selected overlay changes or when overlays change
  React.useEffect(() => {
    if (selectedOverlayId === null) {
      return;
    }

    const selectedOverlay = overlays.find(
      (overlay) => overlay.id === selectedOverlayId,
    );

    if (selectedOverlay?.type === OverlayType.RECTANGLE) {
      setLocalOverlay(selectedOverlay as RectangleOverlay);
    }
  }, [selectedOverlayId, overlays]);

  const handleAddRectangle = (borderRadius = 8) => {
    // Find the next available position in the timeline
    const position = findNextAvailablePosition(
      overlays,
      visibleRows,
      durationInFrames,
    );

    // Create a new rectangle overlay with a temporary ID
    // The actual ID will be assigned by the addOverlay function
    const newRectangleOverlay: Overlay = {
      id: -1, // Temporary ID, will be replaced by addOverlay
      from: position.from,
      row: position.row,
      left: 100, // Default left position
      top: 100, // Default top position
      width: 400,
      height: 200,
      durationInFrames: 60,
      rotation: 0,
      isDragging: false,
      type: OverlayType.RECTANGLE,
      styles: {
        fill: "#3B82F6",
        fillOpacity: 0.5,
        stroke: "#1D4ED8",
        strokeWidth: 2,
        strokeOpacity: 1,
        borderRadius: borderRadius,
        opacity: 1,
        zIndex: 1,
        transform: "none",
        animation: {
          enter: "fadeIn",
          exit: "fadeOut",
          draw: {
            enabled: true,
            duration: 30,
            direction: "clockwise",
          },
        },
      },
    };

    // Add the overlay to the editor
    addOverlay(newRectangleOverlay);
  };

  return (
    <div className="p-4 h-full bg-background">
      {!localOverlay ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Add Rectangle Overlay</h3>
            <p className="text-sm text-muted-foreground">
              Add a customizable rectangle to your video with optional drawing
              animation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              className="border rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors"
              onClick={() => handleAddRectangle(0)}
            >
              <div className="w-16 h-16 rounded-md bg-blue-500/50 border-2 border-blue-600 mb-2 flex items-center justify-center">
                <Square className="h-8 w-8 text-blue-700" />
              </div>
              <span className="text-sm font-medium">Basic Rectangle</span>
            </div>

            <div
              className="border rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors"
              onClick={() => handleAddRectangle(50)}
            >
              <div className="w-16 h-16 rounded-full bg-green-500/50 border-2 border-green-600 mb-2 flex items-center justify-center">
                <Square className="h-8 w-8 text-green-700" />
              </div>
              <span className="text-sm font-medium">Rounded Rectangle</span>
            </div>
          </div>

          <Button onClick={() => handleAddRectangle(8)} className="w-full">
            Add Custom Rectangle
          </Button>
        </div>
      ) : (
        <RectangleDetails overlay={localOverlay} />
      )}
    </div>
  );
};
