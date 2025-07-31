import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Track } from "../types";

export const useSaveState = (
  video_project_id: string | undefined,
  tracks: Track[],
  durationInFrames: number,
  fps: number,
  aspectRatio: number,
) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

      // Get CSRF token for Django
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];

      // Prepare data for saving
      const remotionState = {
        tracks,
        durationInFrames,
        fps,
        aspectRatio,
      };

      // Send save request to backend
      const response = await fetch(
        `/api/video-projects/${video_project_id}/save_state/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken || "",
          },
          credentials: "include",
          body: JSON.stringify(remotionState),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save project state");
      }

      toast.success("Project saved successfully");
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [tracks, durationInFrames, fps, aspectRatio, video_project_id]);

  return {
    isSaving,
    handleSave,
  };
};
