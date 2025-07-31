import React, { useCallback } from "react";
import { FPS } from "../../constants";

/**
 * Props for the TimeMarkers component
 * @typedef {Object} TimeMarkersProps
 * @property {number} durationInFrames - Total number of frames in the timeline
 * @property {function} handleTimelineClick - Callback function when timeline is clicked
 * @property {number} zoomScale - Current zoom level of the timeline
 */
type TimeMarkersProps = {
  durationInFrames: number;
  handleTimelineClick: (clickPosition: number) => void;
  zoomScale: number;
};

/**
 * Renders timeline markers with adaptive scaling based on zoom level
 * Displays time indicators and clickable markers for timeline navigation
 */
const TimeMarkers = ({
  durationInFrames,
  handleTimelineClick,
  zoomScale,
}: TimeMarkersProps): JSX.Element => {
  const generateMarkers = (): JSX.Element[] => {
    const markers: JSX.Element[] = [];
    // Calculate total seconds more precisely using frames
    const totalSeconds = durationInFrames / FPS;

    // Dynamic interval calculation based on zoom level
    const baseInterval = (() => {
      const targetMarkerCount = Math.max(
        8,
        Math.min(40, Math.floor(25 * zoomScale)),
      );
      const rawInterval = totalSeconds / targetMarkerCount;

      // Adjusted nice intervals to include more precise measurements
      const niceIntervals = [
        0.04, 0.08, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300,
      ];
      return niceIntervals.reduce((prev, curr) =>
        Math.abs(curr - rawInterval) < Math.abs(prev - rawInterval)
          ? curr
          : prev,
      );
    })();

    // Calculate sub-intervals for different marker types
    const majorInterval = baseInterval;
    const minorInterval = baseInterval / 4;
    const microInterval = baseInterval / 8;
    const labelInterval = majorInterval * 2; // Show labels at twice the major interval

    // Generate marker elements
    for (let time = 0; time <= totalSeconds; time += microInterval) {
      const [minutes, seconds] = [Math.floor(time / 60), time % 60];
      const isMainMarker = Math.abs(time % majorInterval) < 0.001;
      const isIntermediateMarker = Math.abs(time % minorInterval) < 0.001;
      const shouldShowLabel =
        isMainMarker && Math.abs(time % labelInterval) < 0.001;

      const markerElement = (
        <div
          key={time}
          className="absolute top-0 flex flex-col items-center"
          style={{
            left: `${(time / totalSeconds) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div
            className={`
              ${
                isMainMarker
                  ? "h-2 w-[1px] bg-gray-300 dark:bg-gray-600/50"
                  : isIntermediateMarker
                    ? "h-1 w-px bg-gray-300 dark:bg-gray-600/40"
                    : "h-0.5 w-px bg-gray-200 dark:bg-gray-600/30"
              }
              transition-all duration-150 ease-in-out
              group-hover:bg-blue-500/50 dark:group-hover:bg-blue-300/50
            `}
          />
          {shouldShowLabel && (
            <span
              className={`
                text-[8px] font-light tracking-tight
                ${
                  isMainMarker
                    ? "text-gray-700 dark:text-gray-300/90"
                    : "text-gray-500 dark:text-gray-500/60"
                }
                mt-0.5 select-none
                duration-150
              `}
            >
              {minutes > 0
                ? `${minutes}m ${seconds.toString().padStart(2, "0")}s`
                : `${seconds.toFixed(2)}s`}
            </span>
          )}
        </div>
      );

      markers.push(markerElement);
    }

    return markers;
  };

  /**
   * Handles click events on the timeline
   * Calculates the relative position of the click and calls the handler
   */
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const { left, width } = event.currentTarget.getBoundingClientRect();
      const clickPosition = (event.clientX - left) / width;
      // Convert click position to frame-accurate position
      const framePosition =
        Math.round(clickPosition * durationInFrames) / durationInFrames;
      handleTimelineClick(framePosition);
    },
    [handleTimelineClick, durationInFrames],
  );

  return (
    <div
      className="absolute top-0 left-0 right-0 h-12
        cursor-pointer
        z-10"
      onClick={handleClick}
    >
      {generateMarkers()}
    </div>
  );
};

export default TimeMarkers;
