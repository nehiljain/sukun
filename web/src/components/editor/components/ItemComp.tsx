import React from "react";
import { AbsoluteFill, OffthreadVideo, Audio } from "remotion";
import { Item } from "../types";
import { getAnimationById } from "@/remotion-src/components/animations/registry";

// Component to render different item types
export const ItemComp: React.FC<{
  item: Item;
}> = ({ item }) => {
  if (item.type === "solid") {
    return <AbsoluteFill style={{ backgroundColor: item.color }} />;
  }

  if (item.type == "text") {
    return (
      <AbsoluteFill className="flex items-center justify-center">
        <h1
          style={{
            fontSize: `${item.fontSize || 24}px`,
            color: item.color || "#ffffff",
            fontWeight: item.fontWeight || "bold",
            textAlign: item.textAlign || "center",
          }}
        >
          {item.text}
        </h1>
      </AbsoluteFill>
    );
  }

  if (item.type === "video") {
    return (
      <AbsoluteFill>
        <OffthreadVideo
          src={item.src || "/static/placeholder_video.mp4"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>
    );
  }

  // Add support for voice/audio items
  if (item.type === "voice" || item.type === "audio") {
    return (
      <AbsoluteFill>
        <Audio src={item.src} volume={item.volume || 1} />
      </AbsoluteFill>
    );
  }

  // For animation types, look up the component in the registry
  const animationEntry = getAnimationById(item.type);
  if (animationEntry) {
    const AnimationComponent = animationEntry.component;
    return (
      <AbsoluteFill>
        <AnimationComponent {...item} />
      </AbsoluteFill>
    );
  }

  throw new Error(`Unknown item type: ${JSON.stringify(item)}`);
};
