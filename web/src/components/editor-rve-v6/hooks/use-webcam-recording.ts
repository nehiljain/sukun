import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Overlay,
  OverlayType,
  SoundOverlay,
  ClipOverlay,
} from "../../editor-rve-v6/types";

export const useWebcamRecording = (
  video_asset_id: string | undefined,
  currentFrame: number,
  setOverlays: React.Dispatch<React.SetStateAction<Overlay[]>>,
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] =
    useState<string>("");
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] =
    useState<string>("");
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);
  const [videoChunks, setVideoChunks] = useState<BlobPart[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Add state for preview
  const [hasVideoPreview, setHasVideoPreview] = useState(false);

  // This function can be used to attach the video stream to a video element
  const attachVideoPreview = useCallback(
    (videoElement: HTMLVideoElement | null) => {
      videoPreviewRef.current = videoElement;

      if (videoElement) {
        console.log("useVoiceRecording: Attaching video element", videoElement);

        // If we already have a stream, attach it immediately
        if (mediaStreamRef.current) {
          console.log("useVoiceRecording: Using existing media stream");

          try {
            // First, make sure we clean up any existing connections
            if (videoElement.srcObject) {
              console.log("useVoiceRecording: Cleaning up existing srcObject");
              videoElement.srcObject = null;
            }

            // Assign the media stream to the video element
            videoElement.srcObject = mediaStreamRef.current;

            // Attempt to play the video
            videoElement
              .play()
              .then(() => {
                console.log("useVoiceRecording: Video playback started");
                setHasVideoPreview(true);
              })
              .catch((error) => {
                console.error(
                  "useVoiceRecording: Failed to play video preview:",
                  error,
                );
                setHasVideoPreview(false);
              });
          } catch (err) {
            console.error(
              "useVoiceRecording: Error connecting stream to video:",
              err,
            );
            setHasVideoPreview(false);
          }
        } else {
          console.log("useVoiceRecording: No media stream available yet");
          setHasVideoPreview(false);
        }
      } else {
        console.log(
          "useVoiceRecording: Video element is null, removing preview",
        );
        setHasVideoPreview(false);
      }
    },
    [],
  );

  const startRecording = useCallback(
    async (videoDeviceId?: string, audioDeviceId?: string) => {
      try {
        // Get microphone and camera permissions and streams
        console.log("useWebcamRecording: Requesting media permissions");

        // Configure constraints based on selected devices
        const constraints: MediaStreamConstraints = {
          audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
          video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        mediaStreamRef.current = stream;
        console.log(
          "useWebcamRecording: Media permissions granted, stream obtained",
        );

        // Connect stream to video preview if available
        if (videoPreviewRef.current) {
          console.log("useWebcamRecording: Connecting stream to video preview");
          try {
            videoPreviewRef.current.srcObject = stream;
            await videoPreviewRef.current.play();
            console.log(
              "useWebcamRecording: Video preview connected and playing",
            );
            setHasVideoPreview(true);
          } catch (playError) {
            console.error(
              "useWebcamRecording: Failed to play video preview:",
              playError,
            );
            // Continue with recording even if preview fails
          }
        } else {
          console.log("useWebcamRecording: No video preview element available");
        }

        // Create and configure audio recorder
        let audioRecorderInstance;
        let videoRecorderInstance;

        // Try different MIME types based on browser support for audio
        const audioMimeTypes = [
          "audio/webm",
          "audio/mp4",
          "audio/ogg;codecs=opus",
          "audio/wav",
          "", // Empty string means browser default
        ];

        let selectedAudioType = "";
        for (const type of audioMimeTypes) {
          if (!type || MediaRecorder.isTypeSupported(type)) {
            selectedAudioType = type;
            break;
          }
        }

        // Try different MIME types for video
        const videoMimeTypes = [
          "video/webm",
          "video/mp4",
          "video/webm;codecs=vp9",
          "video/webm;codecs=h264",
          "", // Empty string means browser default
        ];

        let selectedVideoType = "";
        for (const type of videoMimeTypes) {
          if (!type || MediaRecorder.isTypeSupported(type)) {
            selectedVideoType = type;
            break;
          }
        }

        // Create audio recorder with audio tracks only
        const audioStream = new MediaStream(stream.getAudioTracks());
        const audioOptions = selectedAudioType
          ? { mimeType: selectedAudioType }
          : {};
        audioRecorderInstance = new MediaRecorder(audioStream, audioOptions);
        setAudioRecorder(audioRecorderInstance);

        // Create video recorder
        const videoOptions = selectedVideoType
          ? { mimeType: selectedVideoType }
          : {};
        videoRecorderInstance = new MediaRecorder(stream, videoOptions);
        setVideoRecorder(videoRecorderInstance);

        // Set up audio event handlers
        setAudioChunks([]);
        audioRecorderInstance.ondataavailable = (e) => {
          if (e.data.size > 0) {
            setAudioChunks((chunks) => [...chunks, e.data]);
          }
        };

        // Set up video event handlers
        setVideoChunks([]);
        videoRecorderInstance.ondataavailable = (e) => {
          if (e.data.size > 0) {
            setVideoChunks((chunks) => [...chunks, e.data]);
          }
        };

        // Start recording - request data every 250ms to better capture short recordings
        audioRecorderInstance.start(250);
        videoRecorderInstance.start(250);
        setIsRecording(true);
        setIsPaused(false);

        toast.info("Voice and camera recording started");
      } catch (error) {
        console.error("Failed to start recording:", error);
        toast.error(
          "Could not access microphone or camera. Please check permissions.",
        );
      }
    },
    [],
  );

  // Add a pause recording function
  const pauseRecording = useCallback(() => {
    if (!audioRecorder || !videoRecorder || !isRecording || isPaused) return;

    try {
      audioRecorder.pause();
      videoRecorder.pause();
      setIsPaused(true);
      toast.info("Recording paused");
    } catch (error) {
      console.error("Failed to pause recording:", error);
      toast.error("Failed to pause recording");
    }
  }, [audioRecorder, videoRecorder, isRecording, isPaused]);

  // Add a resume recording function
  const resumeRecording = useCallback(() => {
    if (!audioRecorder || !videoRecorder || !isRecording || !isPaused) return;

    try {
      audioRecorder.resume();
      videoRecorder.resume();
      setIsPaused(false);
      toast.info("Recording resumed");
    } catch (error) {
      console.error("Failed to resume recording:", error);
      toast.error("Failed to resume recording");
    }
  }, [audioRecorder, videoRecorder, isRecording, isPaused]);

  const stopRecording = useCallback(() => {
    if (!audioRecorder || !videoRecorder) return;

    // Track successful uploads
    let audioUploaded = false;
    let videoUploaded = false;

    // Handle audio recording completion
    audioRecorder.onstop = async () => {
      if (audioChunks.length === 0) {
        toast.error("No audio was recorded");
        return;
      }

      try {
        const mimeType = audioRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunks, { type: mimeType });

        // Upload to server immediately
        const formData = new FormData();
        const fileName = `voice-${Date.now()}.webm`;
        formData.append("media_type", "Audio");
        formData.append("file", audioBlob, fileName);

        const csrfToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("csrftoken="))
          ?.split("=")[1];

        toast.info("Uploading voice recording...");

        const response = await fetch("/api/media/upload/", {
          method: "POST",
          headers: {
            "X-CSRFToken": csrfToken || "",
          },
          body: formData,
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to upload audio");

        const result = await response.json();
        const audioUrl = result.url;

        // Create a sound overlay instead of track item
        const newSoundOverlay: SoundOverlay = {
          id: Date.now(),
          from: currentFrame,
          durationInFrames: 150,
          type: OverlayType.SOUND,
          mediaId: result.id,
          content: fileName,
          src: audioUrl,
          row: 0,
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          isDragging: false,
          rotation: 0,
          styles: {
            volume: 1,
          },
        };

        setOverlays((prev) => [...prev, newSoundOverlay]);

        audioUploaded = true;
        if (videoUploaded) {
          toast.success(
            "Voice and camera recordings uploaded and added to timeline",
          );
        }
      } catch (error) {
        console.error("Error processing audio:", error);
        toast.error("Failed to process or upload audio recording");
      }
    };

    // Handle video recording completion
    videoRecorder.onstop = async () => {
      if (videoChunks.length === 0) {
        toast.error("No video was recorded");
        return;
      }

      try {
        const mimeType = videoRecorder.mimeType || "video/webm";
        const videoBlob = new Blob(videoChunks, { type: mimeType });

        // Upload to server immediately
        const formData = new FormData();
        const fileName = `camera-${Date.now()}.webm`;
        formData.append("media_type", "Screen");
        formData.append("file", videoBlob, fileName);

        const csrfToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("csrftoken="))
          ?.split("=")[1];

        toast.info("Uploading camera recording...");

        const response = await fetch("/api/media/upload/", {
          method: "POST",
          headers: {
            "X-CSRFToken": csrfToken || "",
          },
          body: formData,
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to upload camera recording");

        const result = await response.json();
        const videoUrl = result.url;

        // Create a video overlay instead of track item
        const newVideoOverlay: ClipOverlay = {
          id: Date.now(),
          from: currentFrame,
          durationInFrames: 150,
          type: OverlayType.VIDEO,
          content: fileName,
          src: videoUrl,
          row: 0,
          left: 50, // Position in the center of the frame
          top: 50, // Position in the center of the frame
          width: 320, // Default width
          height: 240, // Default height
          isDragging: false,
          rotation: 0,
          styles: {
            volume: 1,
            objectFit: "contain",
          },
        };

        setOverlays((prev) => [...prev, newVideoOverlay]);

        videoUploaded = true;
        if (audioUploaded) {
          toast.success(
            "Voice and camera recordings uploaded and added to timeline",
          );
        }
      } catch (error) {
        console.error("Error processing video:", error);
        toast.error("Failed to process or upload camera recording");
      }
    };

    // Stop the recorders
    audioRecorder.stop();
    videoRecorder.stop();
    setIsRecording(false);
    setAudioRecorder(null);
    setVideoRecorder(null);

    // Clean up the preview
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
      setHasVideoPreview(false);
    }

    // Clean up
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, [
    audioRecorder,
    videoRecorder,
    audioChunks,
    videoChunks,
    currentFrame,
    video_asset_id,
    setOverlays,
  ]);

  // Clean up function
  const cleanupMedia = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
      setHasVideoPreview(false);
    }
  }, []);

  return {
    isRecording,
    isPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cleanupAudio: cleanupMedia, // Renamed for backward compatibility
    attachVideoPreview,
    hasVideoPreview,
    setSelectedVideoDeviceId,
    setSelectedAudioDeviceId,
  };
};
