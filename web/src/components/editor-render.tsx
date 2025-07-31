/* eslint-disable react-refresh/only-export-components */
import { registerRoot, Composition, getInputProps } from "remotion";
import { AbsoluteFill, Sequence, Audio } from "remotion";
import React from "react";
import { Overlay, OverlayType } from "@/components/editor-rve-v6/types";

// Import specialized overlay components
import { VideoLayerContent } from "@/components/editor-rve-v6/components/overlays/video/video-layer-content";
import { TextLayerContent } from "@/components/editor-rve-v6/components/overlays/text/text-layer-content";
import { ImageLayerContent } from "@/components/editor-rve-v6/components/overlays/images/image-layer-content";
import { CaptionLayerContent } from "@/components/editor-rve-v6/components/overlays/captions/caption-layer-content";
import { RectangleLayerContent } from "@/components/editor-rve-v6/components/overlays/rectangle/rectangle-layer-content";
import { ButtonClickLayerContent } from "@/components/editor-rve-v6/components/overlays/button-click/button-click-layer-content";

// Components to render overlays
const OverlayComp: React.FC<{
  overlay: Overlay;
}> = ({ overlay }) => {
  if (overlay.type === OverlayType.TEXT) {
    return (
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: `${overlay.left}px`,
            top: `${overlay.top}px`,
            width: `${overlay.width}px`,
            height: `${overlay.height}px`,
            transform: overlay.rotation
              ? `rotate(${overlay.rotation}deg)`
              : "none",
          }}
        >
          <TextLayerContent overlay={overlay} />
        </div>
      </AbsoluteFill>
    );
  }

  if (overlay.type === OverlayType.VIDEO) {
    return (
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: `${overlay.left}px`,
            top: `${overlay.top}px`,
            width: `${overlay.width}px`,
            height: `${overlay.height}px`,
            transform: overlay.rotation
              ? `rotate(${overlay.rotation}deg)`
              : "none",
          }}
        >
          <VideoLayerContent overlay={overlay} />
        </div>
      </AbsoluteFill>
    );
  }

  if (overlay.type === OverlayType.IMAGE) {
    return (
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: `${overlay.left}px`,
            top: `${overlay.top}px`,
            width: `${overlay.width}px`,
            height: `${overlay.height}px`,
            transform: overlay.rotation
              ? `rotate(${overlay.rotation}deg)`
              : "none",
          }}
        >
          <ImageLayerContent overlay={overlay} />
        </div>
      </AbsoluteFill>
    );
  }

  if (overlay.type === OverlayType.SOUND) {
    return (
      <AbsoluteFill>
        <Audio
          src={overlay.src}
          volume={overlay.styles?.volume || 1}
          startFrom={overlay.startFromSound || 0}
        />
      </AbsoluteFill>
    );
  }

  if (overlay.type === OverlayType.CAPTION) {
    return (
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: `${overlay.left}px`,
            top: `${overlay.top}px`,
            width: `${overlay.width}px`,
            height: `${overlay.height}px`,
            transform: overlay.rotation
              ? `rotate(${overlay.rotation}deg)`
              : "none",
          }}
        >
          <CaptionLayerContent overlay={overlay} />
        </div>
      </AbsoluteFill>
    );
  }

  if (overlay.type === OverlayType.RECTANGLE) {
    return (
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: `${overlay.left}px`,
            top: `${overlay.top}px`,
            width: `${overlay.width}px`,
            height: `${overlay.height}px`,
            transform: overlay.rotation
              ? `rotate(${overlay.rotation}deg)`
              : "none",
          }}
        >
          <RectangleLayerContent overlay={overlay} />
        </div>
      </AbsoluteFill>
    );
  }

  if (overlay.type === OverlayType.BUTTON_CLICK) {
    return (
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: `${overlay.left}px`,
            top: `${overlay.top}px`,
            width: `${overlay.width}px`,
            height: `${overlay.height}px`,
            transform: overlay.rotation
              ? `rotate(${overlay.rotation}deg)`
              : "none",
          }}
        >
          <ButtonClickLayerContent overlay={overlay} />
        </div>
      </AbsoluteFill>
    );
  }

  throw new Error(`Unknown overlay type: ${JSON.stringify(overlay)}`);
};

// Main composition component
const EditorVideoComposition: React.FC<{
  overlays: Overlay[];
}> = ({ overlays }) => {
  return (
    <AbsoluteFill className="bg-gray-900">
      {overlays.map((overlay) => (
        <Sequence
          key={overlay.id}
          from={overlay.from}
          durationInFrames={overlay.durationInFrames}
        >
          <OverlayComp overlay={overlay} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Register the root component
const RemotionRoot: React.FC = () => {
  const { fps, durationInFrames, width, height, overlays } = getInputProps();

  return (
    <>
      <Composition
        id="EditorVideoComposition"
        component={EditorVideoComposition}
        fps={fps}
        width={width}
        height={height}
        durationInFrames={durationInFrames}
        defaultProps={{ overlays }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
