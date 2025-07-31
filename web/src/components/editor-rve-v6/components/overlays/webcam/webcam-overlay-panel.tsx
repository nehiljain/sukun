/**
 * WebcamOverlayPanel Component
 *
 * A panel that provides webcam recording functionality for the video editor.
 * Allows users to record themselves using their webcam and microphone,
 * with options to control the recording process and player behavior.
 */

import React, { useState, useRef, useEffect } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { useWebcamRecording } from "../../../hooks/use-webcam-recording";
import { WebcamDetails } from "./webcam-details";
import { Button } from "@/components/ui/button";
import { Video, Mic, Plus } from "lucide-react";
import { OverlayType } from "../../../types";

export const WebcamOverlayPanel: React.FC = () => {
  const {
    videoProjectId,
    currentFrame,
    setOverlays,
    playerRef,
    isPlaying,
    togglePlayPause,
    play,
  } = useEditorContext();

  // State for player muting during recording
  const [mutePlayerDuringRecording, setMutePlayerDuringRecording] =
    useState(false);
  const [continuePlayingDuringRecording, setContinuePlayingDuringRecording] =
    useState(true);
  const previousVolumeRef = useRef<number | null>(null);

  // Reference to the video preview element
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Initialize the webcam recording hook
  const {
    isRecording,
    startRecording,
    stopRecording,
    attachVideoPreview,
    hasVideoPreview,
  } = useWebcamRecording(videoProjectId, currentFrame, setOverlays);

  // Request camera access on component mount to show preview
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        // Request camera access to show preview
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        // Connect stream to video element
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current
            .play()
            .then(() => console.log("Preview started"))
            .catch((err) => console.error("Preview play error:", err));
        }

        // Clean up on unmount
        return () => {
          stream.getTracks().forEach((track) => track.stop());
        };
      } catch (err) {
        console.error("Error accessing camera for preview:", err);
      }
    };

    initializeCamera();
  }, []);

  // Attach the video preview element when it's available
  useEffect(() => {
    if (videoPreviewRef.current) {
      attachVideoPreview(videoPreviewRef.current);
    }
  }, [attachVideoPreview]);

  // Handle player muting when recording starts/stops
  useEffect(() => {
    if (!playerRef.current) return;

    if (isRecording && mutePlayerDuringRecording) {
      // Store the current volume before muting
      previousVolumeRef.current = playerRef.current.volume;
      playerRef.current.volume = 0;
    } else if (!isRecording && previousVolumeRef.current !== null) {
      // Restore the previous volume when recording stops
      playerRef.current.volume = previousVolumeRef.current;
      previousVolumeRef.current = null;
    }
  }, [isRecording, mutePlayerDuringRecording, playerRef]);

  // Handle player playback when recording starts
  const handleStartRecording = async () => {
    // Handle player state based on settings
    if (continuePlayingDuringRecording) {
      // If we should continue playing during recording, ensure the player is playing
      if (!isPlaying && playerRef.current) {
        // Try to use play from context, fall back to playerRef if needed
        if (typeof play === "function") {
          play();
        } else if (playerRef.current.play) {
          playerRef.current.play();
        }
      }
    } else {
      // If we shouldn't continue playing during recording, ensure the player is paused
      if (isPlaying) {
        togglePlayPause();
      }
    }

    await startRecording();
  };

  // Add a new webcam overlay to the timeline
  const addWebcamOverlay = () => {
    // This would be implemented if we had a direct webcam overlay type
    // For now, the recording process handles adding items to the timeline
    console.log("Adding webcam overlay is handled by the recording process");
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Webcam Recording</h3>
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1"
          onClick={addWebcamOverlay}
          disabled={isRecording}
        >
          <Plus className="h-3 w-3" />
          <span className="text-xs">Add</span>
        </Button>
      </div>

      {/* Video Preview - Make sure it's visible and properly sized */}
      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100/40 dark:bg-black/40">
        <video
          ref={videoPreviewRef}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          muted
        />
        {!hasVideoPreview && (
          <div className="absolute inset-0 flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
              <Video className="h-8 w-8" />
              <span className="text-xs">Camera preview will appear here</span>
            </div>
          </div>
        )}
      </div>

      {/* Webcam Settings */}
      <WebcamDetails
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={stopRecording}
        mutePlayerDuringRecording={mutePlayerDuringRecording}
        setMutePlayerDuringRecording={setMutePlayerDuringRecording}
        continuePlayingDuringRecording={continuePlayingDuringRecording}
        setContinuePlayingDuringRecording={setContinuePlayingDuringRecording}
        videoPreviewRef={videoPreviewRef}
      />
    </div>
  );
};
