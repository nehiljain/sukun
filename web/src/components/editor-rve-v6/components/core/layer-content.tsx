import React from "react";
import { Overlay } from "../../types";
import { TextLayerContent } from "../overlays/text/text-layer-content";
import { Audio } from "remotion";
import { OverlayType } from "../../types";
import { CaptionLayerContent } from "../overlays/captions/caption-layer-content";
import { VideoLayerContent } from "../overlays/video/video-layer-content";
import { ImageLayerContent } from "../overlays/images/image-layer-content";
import { RectangleLayerContent } from "../overlays/rectangle/rectangle-layer-content";
import { ButtonClickLayerContent } from "../overlays/button-click/button-click-layer-content";

/**
 * Props for the LayerContent component
 * @interface LayerContentProps
 * @property {Overlay} overlay - The overlay object containing type and content information
 */
interface LayerContentProps {
  overlay: Overlay;
}

/**
 * LayerContent Component
 *
 * @component
 * @description
 * A component that renders different types of content layers in the video editor.
 * It acts as a switch component that determines which specific layer component
 * to render based on the overlay type.
 *
 * Supported overlay types:
 * - VIDEO: Renders video content with VideoLayerContent
 * - TEXT: Renders text overlays with TextLayerContent
 * - SHAPE: Renders colored shapes
 * - IMAGE: Renders images with ImageLayerContent
 * - CAPTION: Renders captions with CaptionLayerContent
 * - SOUND: Renders audio elements using Remotion's Audio component
 * - RECTANGLE: Renders customizable rectangles with RectangleLayerContent
 * - BUTTON_CLICK: Renders button click content with ButtonClickLayerContent
 *
 * Each layer type maintains consistent sizing through commonStyle,
 * with specific customizations applied as needed.
 *
 * @example
 * ```tsx
 * <LayerContent overlay={{
 *   type: OverlayType.TEXT,
 *   content: "Hello World",
 *   // ... other overlay properties
 * }} />
 * ```
 */
export const LayerContent: React.FC<LayerContentProps> = ({ overlay }) => {
  /**
   * Common styling applied to all layer types
   * Ensures consistent dimensions across different content types
   */
  const commonStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
  };

  switch (overlay.type) {
    case OverlayType.VIDEO:
      return (
        <div style={{ ...commonStyle }}>
          <VideoLayerContent overlay={overlay} />
        </div>
      );

    case OverlayType.TEXT:
      return (
        <div style={{ ...commonStyle }}>
          <TextLayerContent overlay={overlay} />
        </div>
      );

    case OverlayType.IMAGE:
      return (
        <div style={{ ...commonStyle }}>
          <ImageLayerContent overlay={overlay} />
        </div>
      );

    case OverlayType.CAPTION:
      return (
        <div
          style={{
            ...commonStyle,
            position: "relative",
            overflow: "hidden",
            display: "flex",
          }}
        >
          <CaptionLayerContent overlay={overlay} />
        </div>
      );

    case OverlayType.SOUND:
      return (
        <Audio
          src={overlay.src}
          startFrom={overlay.startFromSound || 0}
          volume={overlay.styles?.volume ?? 1}
        />
      );
      
    case OverlayType.RECTANGLE:
      return (
        <div style={{ ...commonStyle }}>
          <RectangleLayerContent overlay={overlay} />
        </div>
      );

    case OverlayType.BUTTON_CLICK:
      return (
        <div style={{ ...commonStyle }}>
          <ButtonClickLayerContent overlay={overlay} />
        </div>
      );

    default:
      return null;
  }
};
