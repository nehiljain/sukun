import React, { useEffect, useRef, useState } from "react";

interface VideoPreviewProps {
  onAttach: (videoElement: HTMLVideoElement | null) => void;
  isRecording: boolean;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  onAttach,
  isRecording,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStream, setHasStream] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Attach the video element to the hook
    if (videoRef.current) {
      console.log("VideoPreview: Attaching video element to hook");
      onAttach(videoRef.current);

      // Add event listeners to track video status
      const video = videoRef.current;

      const handlePlaying = () => {
        console.log("VideoPreview: Video is playing");
        setHasStream(true);
      };

      const handleError = (e: Event) => {
        console.error("VideoPreview: Video error", e);
        setError("Failed to display camera feed");
        setHasStream(false);
      };

      // Check if srcObject is set
      if (video.srcObject) {
        console.log("VideoPreview: srcObject is already set");
        setHasStream(true);
      }

      video.addEventListener("playing", handlePlaying);
      video.addEventListener("error", handleError);

      return () => {
        video.removeEventListener("playing", handlePlaying);
        video.removeEventListener("error", handleError);
      };
    }

    // Clean up on unmount
    return () => {
      console.log("VideoPreview: Detaching video element");
      onAttach(null);
      setHasStream(false);
    };
  }, [onAttach, isRecording]);

  if (!isRecording) return null;

  return (
    <div className="absolute top-3 right-3 z-10 rounded-md overflow-hidden shadow-lg border border-primary bg-black/70 w-[256px] h-[144px] flex items-center justify-center">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-black/80 text-sm font-medium px-2 py-1 z-20">
          {error}
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block", // Ensure the video is displayed
        }}
      />

      {!hasStream && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="animate-spin mr-2 h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
          <span className="text-white text-sm">Connecting camera...</span>
        </div>
      )}

      <div className="absolute top-2 left-2 bg-red-500 rounded-full w-3 h-3 animate-pulse" />
      <div className="absolute bottom-2 right-2 bg-background/60 text-white text-xs font-medium px-2 py-1 rounded-md">
        Recording...
      </div>
    </div>
  );
};
