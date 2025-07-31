import React, { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Plus, Minus, Settings, Undo2, Redo2 } from "lucide-react";
import { useEditorContext } from "../../contexts/editor-context";
import { useTimeline } from "../../contexts/timeline-context";
import {
  MAX_ROWS,
  INITIAL_ROWS,
  ZOOM_CONSTRAINTS,
  ASPECT_RATIO_OPTIONS,
} from "../../constants";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTimelineShortcuts } from "../../hooks/use-timeline-shortcuts";

// Types
type AspectRatioOption = (typeof ASPECT_RATIO_OPTIONS)[number];

/**
 * Props for the TimelineControls component.
 * @interface TimelineControlsProps
 */
interface TimelineControlsProps {
  /** Indicates whether the timeline is currently playing */
  isPlaying: boolean;
  /** Function to toggle between play and pause states */
  togglePlayPause: () => void;
  /** The current frame number in the timeline */
  currentFrame: number;
  /** The total duration of the timeline in frames */
  totalDuration: number;
  /** Function to format frame numbers into a time string */
  formatTime: (frames: number) => string;
}

/**
 * TimelineControls component provides video playback controls and aspect ratio selection.
 * It displays:
 * - Play/Pause button
 * - Current time / Total duration
 * - Aspect ratio selector (hidden on mobile)
 *
 * @component
 * @param {TimelineControlsProps} props - Component props
 * @returns {React.ReactElement} Rendered TimelineControls component
 *
 * @example
 * ```tsx
 * <TimelineControls
 *   isPlaying={isPlaying}
 *   togglePlayPause={handlePlayPause}
 *   currentFrame={currentFrame}
 *   totalDuration={duration}
 *   formatTime={formatTimeFunction}
 * />
 * ```
 */
export const TimelineControls: React.FC<TimelineControlsProps> = ({
  isPlaying,
  togglePlayPause,
  currentFrame,
  totalDuration,
  formatTime,
}) => {
  // Context
  const {
    aspectRatio,
    setAspectRatio,
    deleteOverlaysByRow,
    undo,
    redo,
    canUndo,
    canRedo,
    resetOverlays,
  } = useEditorContext();

  const { visibleRows, addRow, removeRow, zoomScale, setZoomScale } =
    useTimeline();

  // Add this hook to enable shortcuts
  useTimelineShortcuts({
    handlePlayPause: () => {
      togglePlayPause();
    },
    undo,
    redo,
    canUndo,
    canRedo,
    zoomScale,
    setZoomScale,
  });

  // Keep track of previous frame to detect resets
  const prevFrameRef = React.useRef(currentFrame);
  const isPlayingRef = React.useRef(isPlaying);

  useEffect(() => {
    // Only update the ref when isPlaying changes
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    // Only run the check if we're actually playing
    if (isPlayingRef.current) {
      // Detect when frame suddenly drops to 0 from near the end
      if (prevFrameRef.current > totalDuration - 2 && currentFrame === 0) {
        togglePlayPause();
      }
    }

    prevFrameRef.current = currentFrame;
  }, [currentFrame, totalDuration, togglePlayPause]); // Removed isPlaying from dependencies

  // Handlers
  const handlePlayPause = () => {
    togglePlayPause();
  };

  const handleAspectRatioChange = (value: AspectRatioOption) => {
    setAspectRatio(value);
  };

  const handleRemoveRow = () => {
    // Delete overlays on the last row before removing it
    deleteOverlaysByRow(visibleRows - 1);
    removeRow();
  };

  const handleSliderChange = useCallback(
    (value: number[]) => {
      setZoomScale(value[0] / 100);
    },
    [setZoomScale],
  );

  return (
    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/30 px-3 py-2.5 backdrop-blur-sm">
      {/* Left section: Undo/Redo */}
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={50}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={undo}
                disabled={!canUndo}
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-gray-700 dark:text-zinc-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="bg-white dark:bg-gray-900 text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-700"
              align="start"
            >
              <div className="flex items-center gap-1">
                <span className="text-gray-700 dark:text-zinc-200">Undo</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-gray-800 dark:bg-gray-800 text-white rounded-md border border-gray-700">
                  ⌘Z
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={redo}
                disabled={!canRedo}
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-gray-700 dark:text-zinc-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="bg-white dark:bg-gray-900 text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-700"
              align="start"
            >
              <div className="flex items-center gap-1">
                <span className="text-gray-700 dark:text-zinc-200">Redo</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-gray-800 dark:bg-gray-800 text-white rounded-md border border-gray-700">
                  ⌘Y
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {/* Center section: All controls */}
      <div className="flex items-center space-x-3">
        {/* Play/Pause and time display */}
        <div className="flex items-center space-x-2">
          <TooltipProvider delayDuration={50}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handlePlayPause}
                  size="sm"
                  variant="default"
                  className="h-7 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  {isPlaying ? (
                    <Pause className="h-3 w-3 text-gray-700 dark:text-white" />
                  ) : (
                    <Play className="h-3 w-3 text-gray-700 dark:text-white" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={5}
                className="bg-white dark:bg-gray-900 text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-700"
                align="center"
              >
                <div className="flex items-center gap-1">
                  <span className="text-gray-700 dark:text-zinc-200">
                    {isPlaying ? "Pause" : "Play"}
                  </span>
                  <kbd className="px-1 py-0.5 text-[10px] font-mono bg-gray-800 dark:bg-gray-800 text-white rounded-md border border-gray-700">
                    ⌥ Space
                  </kbd>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center space-x-1">
            <span className="text-xs font-medium text-gray-900 dark:text-white tabular-nums">
              {formatTime(currentFrame)}
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-zinc-500">
              /
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 tabular-nums">
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>

        {/* Vertical separator */}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Zoom control */}
        <div className="flex items-center space-x-2">
          <Label className="text-xs text-gray-500 dark:text-zinc-400">
            Zoom
          </Label>
          <Slider
            value={[zoomScale * 100]}
            onValueChange={handleSliderChange}
            min={ZOOM_CONSTRAINTS.min * 100}
            max={ZOOM_CONSTRAINTS.max * 100}
            step={ZOOM_CONSTRAINTS.step * 100}
            className="w-24"
          />
        </div>

        {/* Vertical separator */}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Row controls */}
        <div className="flex items-center space-x-2">
          <Label className="text-xs text-gray-500 dark:text-zinc-400">
            Rows
          </Label>
          <div className="flex items-center gap-1">
            <Button
              onClick={handleRemoveRow}
              disabled={visibleRows <= INITIAL_ROWS}
              size="icon"
              variant="ghost"
              className="h-7 w-7"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-gray-500 dark:text-zinc-400 w-8 text-center">
              {visibleRows}/{MAX_ROWS}
            </span>
            <Button
              onClick={addRow}
              disabled={visibleRows >= MAX_ROWS}
              size="icon"
              variant="ghost"
              className="h-7 w-7"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Vertical separator */}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Aspect ratio controls */}
        <div className="flex items-center space-x-2">
          <Label className="text-xs text-gray-500 dark:text-zinc-400">
            Ratio
          </Label>
          <div className="flex gap-1">
            {ASPECT_RATIO_OPTIONS.map((ratio) => (
              <Button
                key={ratio}
                onClick={() => handleAspectRatioChange(ratio)}
                size="sm"
                variant={aspectRatio === ratio ? "default" : "ghost"}
                className={`h-7 px-2 ${
                  aspectRatio === ratio
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "text-gray-700 dark:text-zinc-300"
                }`}
              >
                {ratio}
              </Button>
            ))}
          </div>
        </div>

        {/* Vertical separator */}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Reset button */}
        {/* <Button
          onClick={handleReset}
          variant="ghost"
          size="sm"
          className="h-7 text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Reset
        </Button> */}
      </div>
      {/* Right section - empty for balance */}
      <div className="w-[72px]" />{" "}
      {/* Same width as left section for visual balance */}
    </div>
  );
};
