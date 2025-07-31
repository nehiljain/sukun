import React from "react";
import { useCurrentFrame } from "remotion";
import { RectangleOverlay } from "../../../types";
import { animationTemplates } from "../../../templates/animation-templates";

/**
 * Props for the RectangleLayerContent component
 */
interface RectangleLayerContentProps {
  /** The overlay configuration object containing rectangle properties and styles */
  overlay: RectangleOverlay;
}

/**
 * RectangleLayerContent component renders a customizable rectangle with animations
 * 
 * This component provides a rectangle overlay with:
 * - Customizable fill and stroke
 * - Border radius control
 * - Standard enter/exit animations
 * - Optional drawing animation
 * 
 * @param props.overlay - Configuration object for the rectangle overlay
 */
export const RectangleLayerContent: React.FC<RectangleLayerContentProps> = ({
  overlay,
}) => {
  const frame = useCurrentFrame();
  const {
    fill,
    fillOpacity,
    stroke,
    strokeWidth,
    strokeOpacity,
    borderRadius,
    animation,
  } = overlay.styles;
  
  // Determine if we're in the exit phase
  const isExitPhase = frame >= overlay.durationInFrames - 30;
  
  // Apply enter/exit animations
  const enterAnimation =
    !isExitPhase && animation?.enter
      ? animationTemplates[animation.enter]?.enter(
          frame,
          overlay.durationInFrames
        )
      : {};
        
  const exitAnimation =
    isExitPhase && animation?.exit
      ? animationTemplates[animation.exit]?.exit(
          frame,
          overlay.durationInFrames
        )
      : {};
  
  // Calculate draw animation progress if enabled
  let drawProgress = 1;
  if (animation?.draw?.enabled && frame < animation.draw.duration) {
    drawProgress = frame / animation.draw.duration;
    
    // Adjust for direction
    if (animation.draw.direction === 'counterclockwise') {
      drawProgress = 1 - drawProgress;
    }
  }
  
  // Calculate stroke-dasharray and stroke-dashoffset for drawing animation
  const perimeter = 2 * (overlay.width + overlay.height);
  const dashArray = animation?.draw?.enabled ? `${perimeter}` : 'none';
  const dashOffset = animation?.draw?.enabled 
    ? perimeter * (1 - drawProgress)
    : 0;
  
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${overlay.width} ${overlay.height}`}
      style={{
        opacity: overlay.styles.opacity,
        transform: overlay.styles.transform || "none",
        ...(isExitPhase ? exitAnimation : enterAnimation),
      }}
    >
      <rect
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={overlay.width - strokeWidth}
        height={overlay.height - strokeWidth}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        rx={borderRadius}
        ry={borderRadius}
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
}; 