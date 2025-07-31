import React from "react";
import { Overlay } from "../../types";
import { FPS } from "../../constants";
import { useKeyframes } from "../../hooks/use-keyframes";

/**
 * Props for the TimelineKeyframes component
 */
interface TimelineKeyframesProps {
  /** The overlay object containing video/animation data */
  overlay: Overlay;
  /** The current frame number in the timeline */
  currentFrame: number;
  /** Scale factor for timeline zoom level */
  zoomScale: number;
}

/**
 * TimelineKeyframes component displays a timeline of video frames
 * with preview thumbnails at regular intervals.
 *
 * @component
 * @param props.overlay - The overlay object containing video/animation data
 * @param props.currentFrame - The current frame number in the timeline
 * @param props.zoomScale - Scale factor for timeline zoom level
 *
 * @example
 * ```tsx
 * <TimelineKeyframes
 *   overlay={videoOverlay}
 *   currentFrame={30}
 *   zoomScale={1}
 * />
 * ```
 */
export const TimelineKeyframes: React.FC<TimelineKeyframesProps> = ({
  overlay,
  currentFrame,
  zoomScale,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { frames, previewFrames } = useKeyframes({
    overlay,
    containerRef,
    currentFrame,
    zoomScale,
  });

  return (
    <div
      ref={containerRef}
      className="flex h-full overflow-hidden w-full bg-blue-200 dark:bg-gray-900 "
    >
      <div className="flex h-full w-full">
        {previewFrames.map((previewFrame, index) => {
          const frameIndex = Math.floor(previewFrame / FPS);

          return (
            <div
              key={index}
              className={`relative border-r border-slate-900 dark:border-white last:border-r-0
               flex-1`}
            >
              {frames[frameIndex] ? (
                <img
                  src={frames[frameIndex]}
                  alt={`Frame ${previewFrame}`}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="sync"
                />
              ) : (
                <div className="h-full w-full bg-blue-200 dark:bg-gray-800 " />
              )}
              <div className="absolute inset-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
