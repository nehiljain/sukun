import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { ItemComp } from "./ItemComp";
import { Track as TrackType } from "../types";

// Track component to render items in a track
export const Track: React.FC<{
  track: TrackType;
}> = ({ track }) => {
  return (
    <AbsoluteFill>
      {track.items.map((item) => (
        <Sequence
          key={item.id}
          from={item.from}
          durationInFrames={item.durationInFrames}
        >
          <ItemComp item={item} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
