import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { renderVideo, checkRenderProgress } from "../lambda-helpers/api";

// Define possible states for the rendering process
export type State =
  | { status: "init" } // Initial state
  | { status: "invoking" } // API call is being made
  | {
      // Video is being rendered
      renderId: string;
      progress: number;
      status: "rendering";
    }
  | {
      // Error occurred during rendering
      status: "error";
      error: Error;
    }
  | {
      // Rendering completed successfully
      url: string;
      size: number;
      status: "done";
    };

// Utility function to create a delay
const wait = async (milliSeconds: number) => {
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, milliSeconds);
  });
};

// Custom hook to manage video rendering process
export const useRendering = (videoProjectId: string) => {
  // Maintain current state of the rendering process
  const [state, setState] = useState<State>({
    status: "init",
  });

  const [renderSpeed, setRenderSpeed] = useState("fast");
  const [renderResolution, setRenderResolution] = useState("720p");

  // Main function to handle the rendering process
  const renderMedia = useCallback(async () => {
    console.log("Starting renderMedia process");
    setState({
      status: "invoking",
    });

    try {
      console.log("Calling render endpoint");

      // Use the renderVideo function from api.ts
      const data = await renderVideo({
        videoProjectId,
        renderResolution,
        renderSpeed,
      });

      console.log("Render initiated:", data);

      // Update state with the render ID from the response
      setState({
        status: "rendering",
        progress: 0,
        renderId: data.id,
      });

      // Poll for progress
      let pending = true;
      const renderId = data.id;

      while (pending) {
        await wait(3000); // Check every 3 seconds

        try {
          // Use the checkRenderProgress function from api.ts
          const renderVideoObject = await checkRenderProgress(renderId);
          console.log("Progress check:", renderVideoObject);

          // Check if rendering is complete
          if (
            renderVideoObject.status === "generated" &&
            renderVideoObject.video_url
          ) {
            setState({
              status: "done",
              url: renderVideoObject.video_url,
              size: 0, // Size information might not be available
            });
            pending = false;
            toast.success("Video rendered successfully!");
          }
          // Check if there was an error
          else if (renderVideoObject.status === "error") {
            setState({
              status: "error",
              error: new Error("Video rendering failed"),
            });
            pending = false;
            toast.error("Video rendering failed. Please try again.");
          }
          // Otherwise, continue polling with progress update
          else {
            setState((prev) => {
              if (prev.status === "rendering") {
                return {
                  ...prev,
                  progress: 0.5, // We don't have exact progress, so use an estimate
                };
              }
              return prev;
            });
          }
        } catch (err) {
          console.error("Error checking progress:", err);
          // Don't fail the whole process on a progress check error
          // Just wait and try again
        }
      }
    } catch (err) {
      console.error("Unexpected error during rendering:", err);
      setState({
        status: "error",
        error: err as Error,
      });
      toast.error("Failed to render video: " + (err as Error).message);
    }
  }, [videoProjectId, renderResolution, renderSpeed]);

  // Reset the rendering state back to initial
  const undo = useCallback(() => {
    setState({ status: "init" });
  }, []);

  // Return memoized values to prevent unnecessary re-renders
  return useMemo(
    () => ({
      renderMedia, // Function to start rendering
      state, // Current state of the render
      undo, // Function to reset the state
      renderSpeed,
      renderResolution,
      setRenderSpeed, // Function to set render speed
      setRenderResolution, // Function to set render resolution
    }),
    [
      renderMedia,
      setRenderSpeed,
      setRenderResolution,
      renderSpeed,
      renderResolution,
      state,
      undo,
    ],
  );
};
