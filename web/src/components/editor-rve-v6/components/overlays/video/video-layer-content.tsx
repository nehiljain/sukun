import { OffthreadVideo, useCurrentFrame } from "remotion";
import { ClipOverlay, VideoEffectType } from "../../../types";
import { animationTemplates } from "../../../templates/animation-templates";
import { VideoZoomReveal } from "../../effects/video-zoom-reveal";

/**
 * Interface defining the props for the VideoLayerContent component
 */
interface VideoLayerContentProps {
  /** The overlay configuration object containing video properties and styles */
  overlay: ClipOverlay;
}

/**
 * VideoLayerContent component renders a video layer with animations and styling
 *
 * This component handles:
 * - Video playback using Remotion's OffthreadVideo
 * - Enter/exit animations based on the current frame
 * - Styling including transform, opacity, border radius, etc.
 * - Video timing and volume controls
 * - Special video effects like zoom reveal
 *
 * @param props.overlay - Configuration object for the video overlay including:
 *   - src: Video source URL
 *   - videoStartTime: Start time offset for the video
 *   - durationInFrames: Total duration of the overlay
 *   - styles: Object containing visual styling properties and animations
 *   - videoEffect: Optional video effect configuration
 */
export const VideoLayerContent: React.FC<VideoLayerContentProps> = ({
  overlay,
}) => {
  const frame = useCurrentFrame();

  // If the overlay has the zoom reveal effect, use that component
  if (overlay.videoEffect?.type === VideoEffectType.ZOOM_REVEAL) {
    return <VideoZoomReveal overlay={overlay} />;
  }

  // Calculate if we're in the exit phase (last 30 frames)
  const isExitPhase = frame >= overlay.durationInFrames - 30;

  // Extract animation parameters with defaults
  const enterDuration = overlay.styles.animation?.enterDuration || 15;
  const exitDuration = overlay.styles.animation?.exitDuration || 15;
  const enterEasing = overlay.styles.animation?.enterEasing || "easeOut";
  const exitEasing = overlay.styles.animation?.exitEasing || "easeIn";

  // Apply enter animation only during entry phase
  const enterAnimation =
    !isExitPhase && overlay.styles.animation?.enter
      ? animationTemplates[overlay.styles.animation.enter]?.enter(
          frame,
          overlay.durationInFrames,
          enterDuration,
          enterEasing,
        )
      : {};

  // Apply exit animation only during exit phase
  const exitAnimation =
    isExitPhase && overlay.styles.animation?.exit
      ? animationTemplates[overlay.styles.animation.exit]?.exit(
          frame,
          overlay.durationInFrames,
          exitDuration,
          exitEasing,
        )
      : {};

  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: overlay.styles.objectFit || "cover",
    opacity: overlay.styles.opacity,
    transform: overlay.styles.transform || "none",
    borderRadius: overlay.styles.borderRadius || "0px",
    filter: overlay.styles.filter || "none",
    ...(isExitPhase ? exitAnimation : enterAnimation),
  };

  // If we have a gradient border, wrap the video in a container
  if (overlay.styles.gradientBorder) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: overlay.styles.borderWidth || "3px",
          background: overlay.styles.gradientBorder,
          borderRadius: overlay.styles.borderRadius
            ? `calc(${overlay.styles.borderRadius} + 3px)`
            : "0px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#000", // Or any background color that matches your theme
            borderRadius: overlay.styles.borderRadius || "0px",
            overflow: "hidden",
          }}
        >
          <OffthreadVideo
            src={overlay.src}
            startFrom={overlay.videoStartTime || 0}
            style={videoStyle}
            volume={overlay.styles.volume ?? 1}
          />
        </div>
      </div>
    );
  }

  // If no gradient border, render video with regular border and box shadow
  return (
    <OffthreadVideo
      src={overlay.src}
      startFrom={overlay.videoStartTime || 0}
      style={{
        ...videoStyle,
        boxShadow: overlay.styles.boxShadow || "none",
        border: overlay.styles.border || "none",
      }}
      volume={overlay.styles.volume ?? 1}
    />
  );
};
