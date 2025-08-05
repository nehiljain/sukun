import { useState, useCallback } from "react";
import { toast } from "sonner";
import { VideoProjectState, VideoProjectStatus } from "@/types/video-gen";
import { ddApiClient } from "@/lib/api-client";
/**
 * Type for the video project state
 */

/**
 * Hook for managing video project state operations
 *
 * @param videoProjectId - The ID of the video project
 * @returns Object containing save function and loading state
 */
export const useVideoProjectState = (videoProjectId?: string) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveDisabled, setIsSaveDisabled] = useState(false);
  /**
   * Save the current state to the video project
   *
   * @param state - The state to save
   * @returns Promise that resolves when the save is complete
   */
  const saveProject = useCallback(
    async (state: VideoProjectState) => {
      if (!videoProjectId) {
        toast.error("No video project ID available");
        return false;
      }

      if (isSaveDisabled) {
        toast.error("Save is disabled, you need to create an account.");
        return false;
      }

      try {
        setIsSaving(true);

        const response = await ddApiClient.post(
          `/api/video-projects/${videoProjectId}/save_state/`,
          {
            state,
          },
        );

        if (response.status !== 200) {
          throw new Error("Failed to save project state");
        }

        const data = response.data;
        return data;
      } catch (error) {
        console.error("Error saving project state:", error);
        toast.error("Failed to save project state. Please try again.");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [videoProjectId, isSaveDisabled],
  );

  const updateProjectName = useCallback(
    async (name: string) => {
      if (!videoProjectId) {
        toast.error("No video project ID available");
        return false;
      }

      try {
        const response = await ddApiClient.patch(
          `/api/video-projects/${videoProjectId}/`,
          {
            name,
          },
        );

        if (response.status !== 200) {
          throw new Error("Failed to update project name");
        }

        const data = response.data;
        return data;
      } catch (error) {
        console.error("Error updating project name:", error);
        toast.error("Failed to update project name. Please try again.");
        return false;
      }
    },
    [videoProjectId],
  );

  const updateVideoProjectStatus = useCallback(
    async (status: VideoProjectStatus) => {
      if (!videoProjectId) {
        toast.error("No video project ID available");
        return false;
      }

      try {
        const response = await ddApiClient.patch(
          `/api/video-projects/${videoProjectId}/`,
          {
            status,
          },
        );

        if (response.status !== 200) {
          throw new Error("Failed to update project status");
        }
        const data = response.data;
        return data;
      } catch (error) {
        console.error("Error updating project status:", error);
        toast.error("Failed to update project status. Please try again.");
        return false;
      }
    },
    [videoProjectId],
  );

  return {
    saveProject,
    isSaving,
    isSaveDisabled,
    setIsSaveDisabled,
    updateProjectName,
    updateVideoProjectStatus,
  };
};
