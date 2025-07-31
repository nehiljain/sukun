import React, { useState, useRef, useMemo } from "react";
import { formatTimeCode } from "@/lib/utils";
import { Track, Item, Comment } from "../types";
import { calculateTimelineDuration } from "../utils/timeline";

export const Timeline: React.FC<{
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  currentFrame: number;
  fps: number;
  durationInFrames: number;
  selectedItem: Item | null;
  onSelectItem: (item: Item | null) => void;
  comments: Comment[];
}> = ({
  tracks,
  setTracks,
  currentFrame,
  fps,
  durationInFrames,
  selectedItem,
  onSelectItem,
  comments,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragItem, setDragItem] = useState<{
    item: Item;
    trackIndex: number;
    offsetX?: number;
  } | null>(null);

  // Add state for resizing
  const [isResizing, setIsResizing] = useState(false);
  const [resizeItem, setResizeItem] = useState<{
    item: Item;
    trackIndex: number;
    startX: number;
    initialDuration: number;
  } | null>(null);

  // Calculate time markers based on duration length
  const timeMarkers = useMemo(() => {
    // For longer durations, use larger intervals to prevent overcrowding
    let interval = fps; // Default: 1 second intervals

    if (durationInFrames > 1800) {
      // > 1 minute at 30fps
      interval = fps * 5; // 5 second intervals
    }
    if (durationInFrames > 3600) {
      // > 2 minutes at 30fps
      interval = fps * 10; // 10 second intervals
    }
    if (durationInFrames > 7200) {
      // > 4 minutes at 30fps
      interval = fps * 30; // 30 second intervals
    }
    if (durationInFrames > 18000) {
      // > 10 minutes at 30fps
      interval = fps * 60; // 1 minute intervals
    }

    // Create an array of time marker positions
    const markers = [];
    for (let frame = 0; frame <= durationInFrames; frame += interval) {
      markers.push(frame);
    }
    return { markers, interval };
  }, [durationInFrames, fps]);

  const handleTimelineScroll = (e: React.WheelEvent) => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleDragStart = (
    item: Item,
    trackIndex: number,
    e: React.DragEvent,
  ) => {
    // Store the initial mouse position relative to the timeline
    const timelineRect = timelineRef.current?.getBoundingClientRect();
    if (timelineRect) {
      const mouseX = e.clientX - timelineRect.left;
      const itemLeft = (item.from / durationInFrames) * timelineRect.width;
      const offsetX = mouseX - itemLeft;

      // Store this offset in the dragItem state
      setDragItem({
        item,
        trackIndex,
        offsetX: offsetX,
      });
    } else {
      setDragItem({ item, trackIndex, offsetX: 0 });
    }

    // Hide the drag image completely
    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);

    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent, trackIndex: number) => {
    e.preventDefault();
    if (!isDragging || !dragItem) return;

    const timelineRect = timelineRef.current?.getBoundingClientRect();
    if (!timelineRect) return;

    const pixelsPerFrame = timelineRect.width / durationInFrames;

    // Account for the initial click offset when calculating the new position
    const offsetX = dragItem.offsetX || 0;
    const newFrame = Math.max(
      0,
      Math.floor((e.clientX - timelineRect.left - offsetX) / pixelsPerFrame),
    );

    if (dragItem.trackIndex !== trackIndex || dragItem.item.from !== newFrame) {
      setTracks((prev) => {
        const newTracks = [...prev];
        // Remove from old position
        newTracks[dragItem.trackIndex].items = newTracks[
          dragItem.trackIndex
        ].items.filter((i) => i.id !== dragItem.item.id);
        // Add to new position
        newTracks[trackIndex].items.push({
          ...dragItem.item,
          from: newFrame,
        });
        return newTracks;
      });
      setDragItem({
        ...dragItem,
        item: { ...dragItem.item, from: newFrame },
        trackIndex,
      });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragItem(null);
  };

  // Add resize handlers
  const handleResizeStart = (
    e: React.MouseEvent,
    item: Item,
    trackIndex: number,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setIsResizing(true);
    setResizeItem({
      item,
      trackIndex,
      startX: e.clientX,
      initialDuration: item.durationInFrames,
    });

    // Add event listeners for mouse move and up
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !resizeItem || !timelineRef.current) return;

    const timelineRect = timelineRef.current.getBoundingClientRect();
    const pixelsPerFrame = timelineRect.width / durationInFrames;

    // Calculate frame difference
    const deltaX = e.clientX - resizeItem.startX;
    const frameDelta = Math.round(deltaX / pixelsPerFrame);

    // Calculate new duration (minimum 1 frame)
    const newDuration = Math.max(1, resizeItem.initialDuration + frameDelta);

    // Update the item
    setTracks((prev) => {
      const newTracks = [...prev];
      const trackItems = newTracks[resizeItem.trackIndex].items;
      const itemIndex = trackItems.findIndex(
        (i) => i.id === resizeItem.item.id,
      );

      if (itemIndex !== -1) {
        trackItems[itemIndex] = {
          ...trackItems[itemIndex],
          durationInFrames: newDuration,
        };
      }

      return newTracks;
    });

    // Update selected item if it's the one being resized
    if (selectedItem && selectedItem.id === resizeItem.item.id) {
      onSelectItem({
        ...selectedItem,
        durationInFrames: newDuration,
      });
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeItem(null);

    // Remove event listeners
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  };

  // Add function to create a new track
  const handleAddTrack = () => {
    setTracks((prevTracks) => [
      ...prevTracks,
      {
        name: `Track ${prevTracks.length + 1}`,
        items: [],
      },
    ]);
  };

  return (
    <div className="bg-card border-t border-border">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-foreground text-sm">
          {formatTimeCode(currentFrame, fps)}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">
            Total: {formatTimeCode(durationInFrames, fps)}
          </span>
          <button
            onClick={handleAddTrack}
            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Add Track
          </button>
        </div>
      </div>

      <div
        ref={timelineRef}
        className="relative overflow-x-auto"
        onWheel={handleTimelineScroll}
      >
        {/* Time markers */}
        <div className="h-6 border-b border-border flex">
          {timeMarkers.markers.map((frame, i) => (
            <div
              key={i}
              className="flex-none border-l border-border px-2"
              style={{
                width: `${(timeMarkers.interval / durationInFrames) * 100}%`,
              }}
            >
              <span className="text-xs text-muted-foreground">
                {formatTimeCode(frame, fps)}
              </span>
            </div>
          ))}
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-10 pointer-events-none"
          style={{
            left: `${(currentFrame / durationInFrames) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-accent rounded-full" />
        </div>

        {/* Comment markers */}
        <div className="absolute top-0 left-0 right-0 h-5 z-20 pointer-events-none">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="absolute w-1 h-full bg-red-500"
              style={{
                left: `${(comment.timestamp / durationInFrames) * 100}%`,
                transform: "translateX(-50%)",
              }}
              title={`Comment at ${formatTimeCode(comment.timestamp, fps)}`}
            />
          ))}
        </div>

        {/* Tracks */}
        <div className="relative">
          {tracks.map((track, trackIndex) => (
            <div
              key={trackIndex}
              className="h-16 border-b border-border relative"
              onDragOver={(e) => handleDragOver(e, trackIndex)}
            >
              {track.items.map((item) => (
                <div
                  key={item.id}
                  draggable={!isResizing}
                  onDragStart={(e) => handleDragStart(item, trackIndex, e)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectItem(item)}
                  className={`absolute h-12 top-2 rounded-md cursor-move ${
                    selectedItem?.id === item.id ? "ring-2 ring-ring" : ""
                  } ${
                    item.type === "solid"
                      ? "bg-red-300"
                      : item.type === "text"
                        ? "bg-red-700"
                        : item.type === "voice"
                          ? "bg-green-600"
                          : "bg-chart-3 bg-accent"
                  } group`}
                  style={{
                    left: `${(item.from / durationInFrames) * 100}%`,
                    width: `${(item.durationInFrames / durationInFrames) * 100}%`,
                  }}
                >
                  <div className="px-2 py-1 text-xs text-foreground truncate">
                    {item.type === "text"
                      ? item.text
                      : item.type === "voice"
                        ? "Voice Recording"
                        : item.type}
                  </div>

                  {/* Resize handle */}
                  <div
                    className="absolute top-0 right-0 w-2 h-full bg-ring opacity-0 group-hover:opacity-100 cursor-ew-resize"
                    onMouseDown={(e) => handleResizeStart(e, item, trackIndex)}
                    title="Resize item"
                  />

                  {/* Duration indicator */}
                  <div className="absolute bottom-0 right-1 text-[10px] text-foreground opacity-70">
                    {formatTimeCode(item.from, fps)} -{" "}
                    {formatTimeCode(item.from + item.durationInFrames, fps)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
