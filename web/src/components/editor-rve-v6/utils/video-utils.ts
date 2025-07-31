/**
 * Utility functions for video processing
 */

/**
 * Generates a thumbnail from a video URL
 *
 * This function creates a video element, loads the video, and captures a frame
 * to use as a thumbnail. It returns a promise that resolves to a data URL
 * containing the thumbnail image.
 *
 * @param videoUrl - The URL of the video to generate a thumbnail from
 * @param timeInSeconds - The time in seconds at which to capture the thumbnail (default: 0)
 * @returns Promise resolving to a data URL containing the thumbnail image
 */
export const generateVideoThumbnail = (
  videoUrl: string,
  timeInSeconds: number = 0,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create a video element
    const video = document.createElement("video");
    video.crossOrigin = "anonymous"; // Handle CORS if needed
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    // Set up event handlers
    video.onloadedmetadata = () => {
      // Seek to the specified time
      video.currentTime = Math.min(timeInSeconds, video.duration);
    };

    video.onseeked = () => {
      // Create a canvas to capture the frame
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the video frame to the canvas
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert the canvas to a data URL
        try {
          const dataUrl = canvas.toDataURL("image/jpeg");
          resolve(dataUrl);
        } catch (error) {
          // If we can't generate a thumbnail (e.g., due to CORS), use a fallback
          reject(error);
        }
      } else {
        reject(new Error("Could not get canvas context"));
      }

      // Clean up
      video.pause();
      video.src = "";
      video.load();
    };

    video.onerror = () => {
      reject(new Error("Error loading video"));
    };

    // Start loading the video
    video.load();
  });
};

/**
 * Attempts to generate a thumbnail from a video URL, with fallback to a placeholder
 *
 * @param videoUrl - The URL of the video to generate a thumbnail from
 * @returns Promise resolving to a thumbnail URL (either generated or placeholder)
 */
export const getThumbnailWithFallback = async (
  videoUrl: string,
): Promise<string> => {
  return "https://placehold.co/600x400/333/white?text=Video";
  try {
    // Try to generate a thumbnail from the video
    return await generateVideoThumbnail(videoUrl);
  } catch (error) {
    console.warn("Could not generate thumbnail, using placeholder:", error);
    // Return a placeholder image if thumbnail generation fails
    return "https://placehold.co/600x400/333/white?text=Video";
  }
};

/**
 * Interface for video metadata
 */
export interface VideoMetadata {
  durationInSeconds: number;
  durationInFrames: number;
  width: number;
  height: number;
}

/**
 * Gets metadata from a video URL including duration and dimensions
 *
 * @param videoUrl - The URL of the video to get metadata from
 * @param frameRate - The frame rate to use for calculating frames (default: 30)
 * @returns Promise resolving to video metadata
 */
export const getVideoMetadata = (
  videoUrl: string,
  frameRate: number = 30,
): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous"; // Handle CORS if needed
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    // Set up event handlers
    video.onloadedmetadata = () => {
      const durationInSeconds = video.duration;
      const durationInFrames = Math.round(durationInSeconds * frameRate);
      const width = video.videoWidth;
      const height = video.videoHeight;

      // Clean up
      video.pause();
      video.src = "";
      video.load();

      resolve({
        durationInSeconds,
        durationInFrames,
        width,
        height,
      });
    };

    video.onerror = () => {
      reject(new Error("Error loading video metadata"));
    };

    // Start loading the video
    video.load();
  });
};
