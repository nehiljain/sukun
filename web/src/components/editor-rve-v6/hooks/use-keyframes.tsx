import React from "react";
import { Overlay, OverlayType } from "../types";
import { FPS } from "../constants";

interface UseKeyframesProps {
  overlay: Overlay;
  containerRef: React.RefObject<HTMLDivElement>;
  currentFrame: number;
  zoomScale: number;
}

/**
 * A custom hook that extracts and manages keyframes from video overlays for timeline preview.
 *
 * @param {Object} props - The hook properties
 * @param {Overlay} props.overlay - The video overlay object containing source and duration information
 * @param {React.RefObject<HTMLDivElement>} props.containerRef - Reference to the container element for width calculations
 * @param {number} props.currentFrame - The current frame position in the timeline
 * @param {number} props.zoomScale - The current zoom level of the timeline
 *
 * @returns {Object} An object containing:
 *   - frames: Array of extracted frame data URLs
 *   - previewFrames: Array of frame numbers to show in the timeline
 *   - isFrameVisible: Function to determine if a preview frame should be visible
 *
 * @description
 * This hook handles:
 * - Extracting preview frames from video overlays
 * - Calculating optimal number of keyframes based on container width and zoom level
 * - Managing frame visibility based on current timeline position
 * - Responsive updates when container size changes
 */
export const useKeyframes = ({
  overlay,
  containerRef,
  currentFrame,
  zoomScale,
}: UseKeyframesProps) => {
  // State for frames and container width
  const [frames, setFrames] = React.useState<string[]>([]);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Set up ResizeObserver to watch for width changes
  React.useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Extract frames when overlay loads
  React.useEffect(() => {
    if (overlay.type !== OverlayType.VIDEO || !("src" in overlay)) return;

    const extractFrames = async () => {
      if (!videoRef.current) {
        videoRef.current = document.createElement("video");
        videoRef.current.crossOrigin = "anonymous";
        videoRef.current.preload = "auto";
        videoRef.current.muted = true;
      }

      const video = videoRef.current;
      video.src = overlay.src;

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", {
        alpha: false,
        willReadFrequently: true,
      });

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const totalFrames = Math.ceil(overlay.durationInFrames / FPS);
      const extractedFrames: string[] = [];

      canvas.width = Math.min(video.videoWidth, 320);
      canvas.height = Math.min(video.videoHeight, 180);

      for (let i = 0; i < totalFrames; i++) {
        const timeInSeconds = (i * FPS) / FPS;

        video.currentTime = timeInSeconds;
        await new Promise((resolve) => {
          video.onseeked = resolve;
        });

        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
        extractedFrames.push(canvas.toDataURL("image/webp", 0.6));
      }

      setFrames(extractedFrames);
    };

    extractFrames().catch(console.error);

    return () => {
      if (videoRef.current) {
        videoRef.current.src = "";
        videoRef.current = null;
      }
    };
  }, [overlay]);

  // Calculate optimal number of keyframes
  const numberOfKeyframes = React.useMemo(() => {
    const MINIMUM_KEYFRAME_WIDTH = 60;
    const MAXIMUM_KEYFRAMES = Math.min(120, overlay.durationInFrames);

    // Create discrete zoom levels instead of continuous scaling
    let discreteZoomLevel;
    if (zoomScale <= 1) {
      discreteZoomLevel = 1;
    } else if (zoomScale <= 2) {
      discreteZoomLevel = 1.5;
    } else if (zoomScale <= 3) {
      discreteZoomLevel = 2;
    } else if (zoomScale <= 4) {
      discreteZoomLevel = 2.5;
    } else if (zoomScale <= 5) {
      discreteZoomLevel = 3;
    } else {
      discreteZoomLevel = 3.5;
    }

    const effectiveWidth = containerWidth * discreteZoomLevel;
    const maxByWidth = Math.floor(effectiveWidth / MINIMUM_KEYFRAME_WIDTH);
    const durationInSeconds = overlay.durationInFrames / FPS;
    const suggestedKeyframes = Math.ceil(durationInSeconds * discreteZoomLevel);

    return Math.min(
      MAXIMUM_KEYFRAMES,
      Math.min(maxByWidth, suggestedKeyframes),
    );
  }, [overlay.durationInFrames, containerWidth, zoomScale]);

  // Calculate frame intervals and preview frames
  const previewFrames = React.useMemo(() => {
    const frameInterval = overlay.durationInFrames / numberOfKeyframes;
    return Array.from({ length: numberOfKeyframes }, (_, index) =>
      Math.floor(index * frameInterval),
    );
  }, [overlay.durationInFrames, numberOfKeyframes]);

  const isFrameVisible = React.useCallback(
    (previewFrame: number) => {
      const absolutePreviewFrame = overlay.from + previewFrame;
      const frameThreshold = FPS / 4;
      return currentFrame >= absolutePreviewFrame - frameThreshold;
    },
    [overlay.from, currentFrame],
  );

  return {
    frames,
    previewFrames,
    isFrameVisible,
  };
};
