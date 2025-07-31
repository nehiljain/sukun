import posthog from "posthog-js";
import { toast } from "@/hooks/use-toast";

/**
 * Handles video download with proper PostHog tracking
 * @param url - URL of the file to download
 * @param filename - Filename of the file to download
 * @param tracking_payload - Tracking payload for PostHog
 */
export const handleDownload = (
  url: string,
  filename: string,
  tracking_payload: Record<string, string>,
  // pipelineId: string,
  // source: "tourify" | "project_list" = "tourify",
): void => {
  if (!url) return;

  // Track video export started
  posthog.capture("tourify_video_export_started", tracking_payload);

  try {
    // Create an anchor element to trigger the download
    const downloadLink = document.createElement("a");
    downloadLink.href = url;

    // Extract filename from URL or create a default one
    downloadLink.download = filename;

    // Append to body, click, and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Track video export completed
    posthog.capture("tourify_video_export_completed", tracking_payload);

    toast({
      title: "Download Started",
      description: "Your download has started. Check your downloads folder.",
    });
  } catch (error) {
    console.error("Download error:", error);
    toast({
      title: "Download Failed",
      description:
        "There was a problem downloading your file. Please try again.",
      variant: "destructive",
    });

    posthog.capture("tourify_video_export_failed", tracking_payload);
  }
};
