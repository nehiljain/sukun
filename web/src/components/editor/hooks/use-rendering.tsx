import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Track, Item } from "../types";

export const useRendering = (
  video_asset_id: string | undefined,
  tracks: Track[],
  durationInFrames: number,
  fps: number,
  handleSave: () => Promise<void>,
) => {
  const [isRendering, setIsRendering] = useState(false);

  const handleRenderVideo = useCallback(async () => {
    try {
      // First save the current state
      await handleSave();

      setIsRendering(true);
      toast.info("Starting video render process...");

      // Get CSRF token for Django
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];

      // Create a deep copy of tracks to modify
      let tracksForRender = JSON.parse(JSON.stringify(tracks));

      // First, upload all voice blobs to the server
      const voiceItemPromises: Promise<any>[] = [];

      // Find all voice items with blobs and upload them
      tracksForRender.forEach((track: Track, trackIndex: number) => {
        track.items.forEach((item: Item, itemIndex: number) => {
          if (item.type === "voice" && item.blob) {
            // Create a promise to upload this voice blob
            const uploadPromise = new Promise(async (resolve, reject) => {
              try {
                // Find the original item with the real blob (not the JSON-stringified version)
                const originalItem = tracks[trackIndex].items.find(
                  (i) => i.id === item.id,
                );
                const blob = originalItem?.blob;

                if (!blob) {
                  resolve({
                    success: false,
                    itemPath: [trackIndex, itemIndex],
                  });
                  return;
                }

                // Create form data for file upload
                const formData = new FormData();
                // Use proper filename with extension
                const fileName = `voice-${item.id}.webm`;
                formData.append("audio_file", blob, fileName);
                formData.append("video_asset_id", video_asset_id || "");

                // Upload the voice file
                console.log("Uploading voice recording...");
                const response = await fetch(
                  "/api/video-assets/voice-recordings/upload/",
                  {
                    method: "POST",
                    headers: {
                      "X-CSRFToken": csrfToken || "",
                      // Don't set Content-Type header when using FormData
                    },
                    body: formData,
                    credentials: "include",
                  },
                );

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error("Upload error response:", errorText);
                  throw new Error(
                    `Failed to upload voice recording: ${response.status} ${response.statusText}`,
                  );
                }

                // Parse response carefully to avoid JSON parsing errors
                let result;
                try {
                  const responseText = await response.text();
                  result = JSON.parse(responseText);
                } catch (parseError) {
                  console.error("Error parsing response:", parseError);
                  throw new Error("Invalid response from server");
                }

                console.log("Upload successful:", result);

                // Update the item in our copy with the real server URL
                resolve({
                  success: true,
                  itemPath: [trackIndex, itemIndex],
                  serverUrl: result.url,
                  filePath: result.file_path,
                });
              } catch (error) {
                console.error("Error uploading voice recording:", error);
                reject(error);
              }
            });

            voiceItemPromises.push(uploadPromise);
          }
        });
      });

      // Wait for all uploads to complete
      if (voiceItemPromises.length > 0) {
        toast.info(`Uploading ${voiceItemPromises.length} voice recordings...`);

        try {
          const results = await Promise.all(voiceItemPromises);

          // Update the tracks copy with server URLs
          results.forEach((result) => {
            if (result.success) {
              const [trackIndex, itemIndex] = result.itemPath;
              // Replace blob URL with server URL and remove blob property
              tracksForRender[trackIndex].items[itemIndex].src =
                result.serverUrl;
              tracksForRender[trackIndex].items[itemIndex].audioFilePath =
                result.filePath;
              // Remove the blob property as it can't be serialized
              delete tracksForRender[trackIndex].items[itemIndex].blob;
            }
          });
        } catch (uploadError) {
          console.error("Error during voice uploads:", uploadError);
          toast.error("Failed to upload voice recordings. Please try again.");
          setIsRendering(false);
          return;
        }
      }

      // Prepare the render data with updated tracks
      const renderData = {
        video_asset_id,
        tracks: tracksForRender,
        durationInFrames,
        fps,
      };

      // Send render request to backend
      const response = await fetch(
        `/api/video-assets/${video_asset_id}/render/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken || "",
          },
          credentials: "include",
          body: JSON.stringify(renderData),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to start render process");
      }

      const result = await response.json();

      // Show success message with link to rendered video
      toast.success(
        <div>
          Render job started!
          <div className="text-xs mt-1">
            You'll receive a notification when it's complete.
          </div>
        </div>,
      );
    } catch (error) {
      console.error("Error rendering video:", error);
      toast.error("Failed to render video. Please try again.");
    } finally {
      setIsRendering(false);
    }
  }, [tracks, durationInFrames, fps, video_asset_id, handleSave]);

  return {
    isRendering,
    handleRenderVideo,
  };
};
