import React from "react";
import { OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";
import { ClipOverlay, ZoomConfig } from "../../types";

/**
 * Props for the VideoZoomReveal component
 */
interface VideoZoomRevealProps {
  /** The overlay configuration object containing video properties and styles */
  overlay: ClipOverlay;
}

/**
 * Utility function for smoothing animations
 * @param t - Input value between 0 and 1
 * @returns Smoothed value between 0 and 1
 */
const smoothstep = (t: number): number => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};

/**
 * Enhanced interpolation function using bezier curves for smoother animations
 * @param t - Input value between 0 and 1
 * @param p1x - First control point x coordinate
 * @param p1y - First control point y coordinate
 * @param p2x - Second control point x coordinate
 * @param p2y - Second control point y coordinate
 * @returns Interpolated value
 */
const enhancedInterpolation = (
  t: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number
) => {
  const smoothT = smoothstep(t);
  
  const bezierPoint = (
    t: number,
    p0: number,
    p1: number,
    p2: number,
    p3: number
  ) => {
    const oneMinusT = 1 - t;
    return (
      Math.pow(oneMinusT, 3) * p0 +
      3 * Math.pow(oneMinusT, 2) * t * p1 +
      3 * oneMinusT * Math.pow(t, 2) * p2 +
      Math.pow(t, 3) * p3
    );
  };
  
  return bezierPoint(smoothT, 0, p1y, p2y, 1);
};

/**
 * VideoZoomReveal component that implements a zoom and pan effect for video overlays
 * 
 * This component provides a sophisticated animation that enables dynamic zoom, pan, 
 * and reveal effects on video content.
 * 
 * @param props.overlay - Configuration object for the video overlay
 */
export const VideoZoomReveal: React.FC<VideoZoomRevealProps> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const zoomConfig = overlay.videoEffect?.config;
  if (!zoomConfig || !zoomConfig.zoomConfigs.length) {
    // If no zoom config is defined, render standard video
    return (
      <OffthreadVideo
        src={overlay.src}
        startFrom={overlay.videoStartTime || 0}
        style={{
          width: "100%",
          height: "100%",
          objectFit: overlay.styles.objectFit || "cover",
          opacity: overlay.styles.opacity,
        }}
        volume={overlay.styles.volume ?? 1}
      />
    );
  }
  
  // Find the active zoom configuration based on current frame
  const activeZoomConfig = zoomConfig.zoomConfigs.find(
    (config) => frame >= config.startFrame && frame <= config.endFrame
  );
  
  // Default position and scale values
  let currentX = overlay.width / 2;
  let currentY = overlay.height / 2;
  let currentScale = 1;
  
  // Calculate position and scale based on the active zoom config
  if (activeZoomConfig) {
    const { startFrame, endFrame, startX, startY, startScale, holdX, holdY, holdScale, endX, endY, endScale, easingConfig } = activeZoomConfig;
    
    // Calculate total duration and phase durations
    const totalDuration = endFrame - startFrame;
    const zoomInDuration = Math.floor(totalDuration * 0.4); // 40% of total duration
    const holdDuration = Math.floor(totalDuration * 0.2); // 20% of total duration
    const zoomOutDuration = totalDuration - zoomInDuration - holdDuration; // 40% of total duration
    
    // Calculate phase boundaries
    const zoomInEnd = startFrame + zoomInDuration;
    const holdEnd = zoomInEnd + holdDuration;
    
    // Determine which phase we're in
    if (frame <= zoomInEnd) {
      // Zoom In phase
      const progress = (frame - startFrame) / zoomInDuration;
      const easedProgress = enhancedInterpolation(
        progress,
        easingConfig.p1x,
        easingConfig.p1y,
        easingConfig.p2x,
        easingConfig.p2y
      );
      
      currentX = startX + (holdX - startX) * easedProgress;
      currentY = startY + (holdY - startY) * easedProgress;
      currentScale = startScale + (holdScale - startScale) * easedProgress;
    } else if (frame <= holdEnd) {
      // Hold phase
      currentX = holdX;
      currentY = holdY;
      currentScale = holdScale;
    } else {
      // Zoom Out phase
      const progress = (frame - holdEnd) / zoomOutDuration;
      const easedProgress = enhancedInterpolation(
        progress,
        easingConfig.p1x,
        easingConfig.p1y,
        easingConfig.p2x,
        easingConfig.p2y
      );
      
      currentX = holdX + (endX - holdX) * easedProgress;
      currentY = holdY + (endY - holdY) * easedProgress;
      currentScale = holdScale + (endScale - holdScale) * easedProgress;
    }
  }
  
  // Calculate the transform with smooth scaling
  const transform = `scale(${currentScale})`;
  
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          transform,
          transformOrigin: `${currentX}px ${currentY}px`,
          willChange: "transform",
        }}
      >
        <OffthreadVideo
          src={overlay.src}
          startFrom={overlay.videoStartTime || 0}
          style={{
            width: "100%",
            height: "100%",
            objectFit: overlay.styles.objectFit || "cover",
            opacity: overlay.styles.opacity,
            borderRadius: overlay.styles.borderRadius || "0px",
            filter: overlay.styles.filter || "none",
            boxShadow: overlay.styles.boxShadow || "none",
            border: overlay.styles.border || "none",
          }}
          volume={overlay.styles.volume ?? 1}
        />
      </div>
      
      {/* Optional zoom indicator for debugging */}
      {zoomConfig.showZoomIndicator && activeZoomConfig && (
        <div
          style={{
            position: "absolute",
            left: currentX - 10,
            top: currentY - 10,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: "rgba(255, 0, 0, 0.5)",
            border: "2px solid red",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}; 