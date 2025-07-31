import React from "react";
import { useCurrentFrame } from "remotion";
import { ImageOverlay } from "../../../types";
import { animationTemplates } from "../../../templates/animation-templates";
import { Img } from "remotion";

/**
 * Props for the ImageLayerContent component
 * @interface ImageLayerContentProps
 * @property {ImageOverlay} overlay - The image overlay object containing source and style information
 */
interface ImageLayerContentProps {
  overlay: ImageOverlay;
}

/**
 * ImageLayerContent Component
 *
 * @component
 * @description
 * Renders an image layer in the video editor with animation support.
 * Features include:
 * - Enter/exit animations
 * - Style customization (fit, position, opacity)
 * - Transform effects
 * - Visual effects (filters, shadows, borders)
 *
 * The component handles both the visual presentation and animation
 * timing for image overlays.
 *
 * @example
 * ```tsx
 * <ImageLayerContent
 *   overlay={{
 *     src: "path/to/image.jpg",
 *     styles: {
 *       objectFit: "cover",
 *       animation: {
 *         enter: "fadeIn",
 *         exit: "fadeOut"
 *       }
 *     }
 *   }}
 * />
 * ```
 */
export const ImageLayerContent: React.FC<ImageLayerContentProps> = ({
  overlay,
}) => {
  const frame = useCurrentFrame();
  const isExitPhase = frame >= overlay.durationInFrames - 30;

  // Extract animation parameters with defaults
  const enterDuration = overlay.styles.animation?.enterDuration || 15;
  const exitDuration = overlay.styles.animation?.exitDuration || 15;
  const enterEasing = overlay.styles.animation?.enterEasing || "easeOut";
  const exitEasing = overlay.styles.animation?.exitEasing || "easeIn";

  /**
   * Apply enter animation only during entry phase
   */
  const enterAnimation =
    !isExitPhase && overlay.styles.animation?.enter
      ? animationTemplates[overlay.styles.animation.enter]?.enter(
          frame,
          overlay.durationInFrames,
          enterDuration,
          enterEasing,
        )
      : {};

  /**
   * Apply exit animation only during exit phase
   */
  const exitAnimation =
    isExitPhase && overlay.styles.animation?.exit
      ? animationTemplates[overlay.styles.animation.exit]?.exit(
          frame,
          overlay.durationInFrames,
          exitDuration,
          exitEasing,
        )
      : {};

  /**
   * Combine base styles with current animation phase
   */
  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: overlay.styles.objectFit || "cover",
    objectPosition: overlay.styles.objectPosition,
    opacity: overlay.styles.opacity,
    transform: overlay.styles.transform || "none",
    filter: overlay.styles.filter || "none",
    borderRadius: overlay.styles.borderRadius || "0px",
    boxShadow: overlay.styles.boxShadow || "none",
    border: overlay.styles.border || "none",
    ...(isExitPhase ? exitAnimation : enterAnimation),
  };

  return <Img src={overlay.src} style={imageStyle} alt="" />;
};
