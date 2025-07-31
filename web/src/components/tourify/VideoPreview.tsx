import React, { useEffect, useRef, useState } from "react";
import { GeneratedVideo } from "./types";
import posthog from "posthog-js";
import { motion } from "motion/react";

enum VideoState {
  LOADING = "LOADING",
  PREPARING = "PREPARING",
  PROCESSING = "PROCESSING",
  ERROR = "ERROR",
  READY = "READY",
  INITIAL = "INITIAL",
}

interface PipelineStatus {
  status: "created" | "pending" | "processing" | "completed" | "failed";
  error_message?: string;
  render_video?: {
    video_url?: string;
    thumbnail_url?: string;
  };
  aspect_ratio?: string;
}

interface VideoPreviewProps {
  video: GeneratedVideo | null;
  pipelineId?: string | null;
  onStopAudio?: () => void;
  pipelineStatus?: PipelineStatus;
  isPipelineLoading?: boolean;
  aspectRatio?: string;
}

export function VideoPreview({
  video,
  pipelineId = null,
  onStopAudio,
  pipelineStatus: pipelineData,
  isPipelineLoading = false,
  aspectRatio = "16:9",
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>(aspectRatio);

  useEffect(() => {
    if (pipelineData?.aspect_ratio) {
      setVideoAspectRatio(pipelineData.aspect_ratio);
    } else if (aspectRatio) {
      setVideoAspectRatio(aspectRatio);
    }
  }, [pipelineData?.aspect_ratio, aspectRatio]);

  useEffect(() => {
    // Try to play the video when it becomes available
    if (
      videoRef.current &&
      ((pipelineData?.status === "completed" &&
        pipelineData.render_video?.video_url) ||
        video?.url)
    ) {
      videoRef.current.play().catch((err) => {
        console.log("Auto-play failed:", err);
      });
    }
  }, [pipelineData?.status, pipelineData?.render_video?.video_url, video?.url]);

  // Handle video play events
  const handleVideoPlay = () => {
    if (onStopAudio) onStopAudio();

    // Track video play event
    posthog.capture("tourify_video_played", {
      pipeline_id: pipelineId,
      auto_played: false,
    });
  };

  // Handle the end of video playback
  const handleVideoEnded = () => {
    posthog.capture("tourify_video_finished", {
      pipeline_id: pipelineId,
    });
  };

  // Handle video interactions for analytics
  const handleVideoInteraction = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Track pause events
    const handlePause = () => {
      posthog.capture("tourify_video_paused", {
        pipeline_id: pipelineId,
        current_time: video.currentTime,
        duration: video.duration,
        percent_watched: ((video.currentTime / video.duration) * 100).toFixed(
          2,
        ),
      });
    };

    // Track seeking events (throttled to avoid too many events)
    let lastSeekTime = 0;
    const handleSeek = () => {
      const now = Date.now();
      // Only track seeks that are at least 1 second apart
      if (now - lastSeekTime > 1000) {
        lastSeekTime = now;
        posthog.capture("tourify_video_seek", {
          pipeline_id: pipelineId,
          current_time: video.currentTime,
          duration: video.duration,
        });
      }
    };

    // Add event listeners
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeked", handleSeek);

    // Clean up listeners when component unmounts
    return () => {
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeked", handleSeek);
    };
  };

  // Set up video event listeners when the ref is attached
  useEffect(() => {
    if (videoRef.current) {
      return handleVideoInteraction();
    }
  }, []);

  // Track when video becomes available
  useEffect(() => {
    if (
      pipelineData?.status === "completed" &&
      pipelineData.render_video?.video_url
    ) {
      posthog.capture("tourify_video_available", {
        pipeline_id: pipelineId,
      });
    }
  }, [pipelineData?.status, pipelineData?.render_video?.video_url, pipelineId]);

  const getCurrentVideoState = (): { state: VideoState; message?: string } => {
    if (isPipelineLoading) {
      return { state: VideoState.LOADING, message: "Loading video status..." };
    }

    if (!pipelineData && !video?.url) {
      return { state: VideoState.INITIAL };
    }

    if (pipelineData) {
      switch (pipelineData.status) {
        case "created":
        case "pending":
          return {
            state: VideoState.PREPARING,
            message: "Preparing your video...",
          };
        case "processing":
          return {
            state: VideoState.PROCESSING,
            message: "Creating your property video...",
          };
        case "failed":
          return {
            state: VideoState.ERROR,
            message: pipelineData.error_message || "Failed to create video",
          };
        case "completed":
          return pipelineData.render_video?.video_url
            ? { state: VideoState.READY }
            : { state: VideoState.ERROR, message: "Video URL not found" };
      }
    }

    return video?.url
      ? { state: VideoState.READY }
      : { state: VideoState.INITIAL };
  };

  // Determine the appropriate object-fit style based on the aspect ratio
  const getObjectFitStyle = (aspectRatio: string) => {
    // For portrait videos (9:16), use "contain" to show full height
    if (aspectRatio === "9:16") {
      return "contain";
    }
    // For all other aspect ratios (16:9, 1:1), use "cover"
    return "cover";
  };

  const renderVideoPlayer = (videoUrl: string, thumbnailUrl?: string) => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="w-full h-full"
        style={{ objectFit: getObjectFitStyle(videoAspectRatio) }}
        src={videoUrl}
        controls
        autoPlay
        playsInline
        poster={thumbnailUrl || "/video-placeholder.jpg"}
        onPlay={handleVideoPlay}
        onEnded={handleVideoEnded}
      />
    </div>
  );

  const renderContent = () => {
    const { state, message } = getCurrentVideoState();
    console.log("State", state);
    switch (state) {
      case VideoState.LOADING:
      case VideoState.PREPARING:
      case VideoState.PROCESSING:
        return renderLoadingState(message!);

      case VideoState.ERROR:
        return renderErrorState(message!);

      case VideoState.READY:
        console.log("Ready State", pipelineData?.render_video?.video_url);
        if (pipelineData?.render_video?.video_url) {
          return renderVideoPlayer(
            pipelineData.render_video.video_url,
            pipelineData.render_video.thumbnail_url,
          );
        }
        return renderVideoPlayer(video!.url, video!.thumbnailUrl);

      case VideoState.INITIAL:
      default:
        console.log("Initial State");
        return renderInitialState();
    }
  };

  const renderLoadingState = (message: string) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 flex items-center justify-center backdrop-blur-sm"
    >
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          {/* Outer spinning ring */}
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
            className="h-16 w-16 rounded-full border-4 border-indigo-400 border-r-transparent"
          />

          {/* Wave rings for AI "magic" effect */}
          {[0, 1, 2, 3, 4].map((index) => (
            <motion.div
              key={index}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2,
                ease: "easeOut",
              }}
              className="absolute inset-0 m-auto h-16 w-16 rounded-full border-2 border-indigo-300"
            />
          ))}

          {/* Sparkling particles for magical touch */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
            <motion.div
              key={index}
              initial={{
                opacity: 0,
                x: (Math.random() - 0.5) * 40,
                y: (Math.random() - 0.5) * 40,
              }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              className="absolute h-1 w-1 rounded-full bg-white"
              style={{ top: "50%", left: "50%" }}
            />
          ))}

          {/* Center dot with pulsing glow */}
          <motion.div
            animate={{
              scale: [0.8, 1.1, 0.8],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 m-auto h-4 w-4 rounded-full bg-indigo-400"
          />
        </div>

        {/* Animated message with glow */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-white font-light"
          style={{ textShadow: "0 0 8px rgba(255,255,255,0.8)" }}
        >
          {message}
        </motion.p>
      </div>
    </motion.div>
  );

  const renderErrorState = (message: string) => (
    <div className="absolute inset-0 bg-gradient-to-br from-red-800/90 via-red-900/95 to-black/90 flex items-center justify-center backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-red-400 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>
        <p className="text-lg text-white font-light">{message}</p>
      </div>
    </div>
  );
  const renderInitialState = () => (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 via-slate-900/70 to-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-indigo-400"
          >
            <path d="m22 8-6 4 6 4V8Z" />
            <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
          </svg>
        </div>
      </div>

      <div className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
        <p className="text-slate-300 text-sm font-light">
          Upload images & select music to begin
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full aspect-video overflow-hidden rounded-2xl shadow-2xl relative">
      {renderContent()}
    </div>
  );
}
