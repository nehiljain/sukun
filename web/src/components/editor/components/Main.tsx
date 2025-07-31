import React from "react";
import { AbsoluteFill } from "remotion";
import { Track } from "./Track";
import { Track as TrackType } from "../types";

// Main component for Remotion to render
export const Main: React.FC<{
  tracks: TrackType[];
}> = ({ tracks }) => {
  return (
    <AbsoluteFill className="bg-gray-900">
      {tracks.map((track) => (
        <Track track={track} key={track.name} />
      ))}
    </AbsoluteFill>
  );
};
