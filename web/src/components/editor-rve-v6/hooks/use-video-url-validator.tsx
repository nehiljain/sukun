import { useState } from "react";
import { VideoMetadata, getVideoMetadata } from "../utils/video-utils";

/**
 * Custom hook for validating video URLs
 * 
 * This hook provides functionality to:
 * - Validate if a URL is a valid video resource
 * - Check if the URL is from a supported video platform
 * - Handle errors during validation
 * - Get video metadata (duration, dimensions)
 * 
 * @returns Object containing validation state and functions
 */
export function useVideoUrlValidator() {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);

  /**
   * Validates if a URL points to a valid video resource
   * 
   * @param url - The URL to validate
   * @param frameRate - The frame rate to use for calculating frames (default: 30)
   * @returns Promise resolving to a boolean indicating if the URL is valid
   */
  const validateUrl = async (url: string, frameRate: number = 30): Promise<boolean> => {
    // Reset state
    setIsValidating(true);
    setError(null);
    setPreviewUrl(null);
    setVideoMetadata(null);

    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      setError("Please enter a valid URL");
      setIsValidating(false);
      return false;
    }

    // Check if URL ends with common video extensions
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
    const hasVideoExtension = videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
    
    // If it's a direct video URL with a video extension, it's likely valid
    if (hasVideoExtension) {
      try {
        // Get video metadata
        const metadata = await getVideoMetadata(url, frameRate);
        setVideoMetadata(metadata);
        setPreviewUrl(url);
        setIsValidating(false);
        return true;
      } catch (error) {
        console.error("Error getting video metadata:", error);
        setError("Could not load video metadata. Please check the URL and try again.");
        setIsValidating(false);
        return false;
      }
    }
    
    // For URLs without video extensions (like YouTube, Vimeo, etc.)
    // In a real implementation, you would validate these URLs with their respective APIs
    // For now, we'll just check if they're from common video platforms
    const videoHosts = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'];
    const url_obj = new URL(url);
    const isVideoHost = videoHosts.some(host => url_obj.hostname.includes(host));
    
    if (isVideoHost) {
      // For a real implementation, you would extract the actual video URL here
      // For now, we'll just show an error message
      setError("Embedded videos from platforms like YouTube are not supported yet. Please use a direct video URL.");
      setIsValidating(false);
      return false;
    }
    
    // For all other URLs, we'll try to fetch the URL to see if it's a video
    // This is a simplified approach and might not work for all cases
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('video/')) {
        try {
          // Get video metadata
          const metadata = await getVideoMetadata(url, frameRate);
          setVideoMetadata(metadata);
          setPreviewUrl(url);
          setIsValidating(false);
          return true;
        } catch (error) {
          console.error("Error getting video metadata:", error);
          setError("Could not load video metadata. Please check the URL and try again.");
          setIsValidating(false);
          return false;
        }
      } else {
        setError("The URL does not point to a valid video resource");
        setIsValidating(false);
        return false;
      }
    } catch (error) {
      setError("Could not validate the video URL. Please check the URL and try again.");
      setIsValidating(false);
      return false;
    }
  };

  /**
   * Resets the validation state
   */
  const resetValidation = () => {
    setError(null);
    setPreviewUrl(null);
    setVideoMetadata(null);
    setIsValidating(false);
  };

  return {
    isValidating,
    error,
    previewUrl,
    videoMetadata,
    validateUrl,
    resetValidation,
  };
} 