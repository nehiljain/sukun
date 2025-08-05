import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IMediaItem } from "@/types/media";
import { ddApiClient } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scissors, Pencil, Download, Wand } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SplitImageDialog } from "@/components/split-image-dialog";
import { useImageSplit } from "@/components/medias/useImageSplit";
import { useMediaLibrary } from "@/hooks/use-media-library";
import { toast } from "sonner";
import { MotionMagicDialog } from "@/components/motion-magic-dialog";

export default function MediaEntry() {
  const { media_id } = useParams<{ media_id: string }>();
  const navigate = useNavigate();
  const [media, setMedia] = useState<IMediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [mediaName, setMediaName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const {
    splitImagePreview,
    isSplittingImage,
    getImageSplitPreview,
    splitImageToPortrait,
    cancelSplitImage,
  } = useImageSplit();

  const { updateMediaName } = useMediaLibrary();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);
  const [transcriptCues, setTranscriptCues] = useState<
    {
      start: number;
      end: number;
      text: string;
      id: string;
    }[]
  >([]);
  const [activeCueIdx, setActiveCueIdx] = useState<number>(-1);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const [isMotionMagicLoading, setIsMotionMagicLoading] = useState(false);
  const [motionMagicError, setMotionMagicError] = useState<string | null>(null);
  const [motionMagicDialogOpen, setMotionMagicDialogOpen] = useState(false);

  // Helper: get all selectable images (main + splits)
  const selectableImages: { url: string; index: string | number }[] =
    media?.type === "image"
      ? [
          { url: media.storage_url_path, index: "main" },
          ...(
            (media.metadata?.image_splits as {
              url: string;
              index: number;
            }[]) || []
          ).map((split) => ({
            url: split.url,
            index: split.index,
          })),
        ]
      : [];

  // Handle Motion Magic submit (from dialog)
  const handleMotionMagicDialogSubmit = async ({
    selectedImages,
    prompt,
    aspectRatio,
    duration,
    cameraMotion,
  }: {
    selectedImages: string[];
    prompt: string;
    aspectRatio: string;
    duration: string;
    cameraMotion: string;
  }) => {
    if (!media || selectedImages.length === 0) return;
    setIsMotionMagicLoading(true);
    setMotionMagicError(null);
    try {
      const response = await ddApiClient.post(
        `/api/media/${media.id}/motion_magic/`,
        {
          prompt,
          image_urls: selectedImages,
          aspect_ratio: aspectRatio,
          duration,
          camera_motion: cameraMotion,
        },
      );
      if (response.status !== 200)
        throw new Error(response.statusText || "Failed to start job");
      setMedia((prev) =>
        prev ? { ...prev, luma_video_url: response.data.luma_video_url } : null,
      );
      toast.success("Motion Magic video generated!", {
        description: "Your video is ready.",
      });
      setMotionMagicDialogOpen(false);
    } catch (err) {
      setMotionMagicError(
        err instanceof Error ? err.message : "Failed to generate video",
      );
      toast.error("Error", { description: "Failed to generate video" });
    } finally {
      setIsMotionMagicLoading(false);
    }
  };

  useEffect(() => {
    const fetchMedia = async () => {
      if (!media_id) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await ddApiClient.get(`/api/media/${media_id}/`);
        if (response.status !== 200) {
          throw new Error(response.statusText || "Failed to fetch media");
        }
        setMedia(response.data);
        setMediaName(response.data.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load media");
      } finally {
        setIsLoading(false);
      }
    };
    fetchMedia();
  }, [media_id]);

  // Fetch and parse WebVTT transcript
  useEffect(() => {
    let isMounted = true;
    const fetchTranscript = async () => {
      if (!media?.metadata?.transcript_url) return;
      setIsTranscriptLoading(true);
      setTranscriptError(null);
      try {
        const controller = new AbortController();
        const res = await fetch(media.metadata.transcript_url, {
          signal: controller.signal,
        });
        if (!res.ok)
          throw new Error(`Failed to fetch transcript: ${res.statusText}`);
        const vtt = await res.text();
        if (!isMounted) return;
        if (!vtt.trim()) throw new Error("Transcript file is empty");
        if (!vtt.startsWith("WEBVTT"))
          throw new Error("Invalid WebVTT file: Missing WEBVTT header");

        const cues: { start: number; end: number; text: string; id: string }[] =
          [];
        const lines = vtt.split(/\r?\n/);
        let i = 0;

        // Skip header and empty lines
        while (
          i < lines.length &&
          (lines[i] === "WEBVTT" || !lines[i].trim())
        ) {
          i++;
        }

        while (i < lines.length) {
          let id = "";
          // Handle cue identifier (optional)
          if (lines[i] && !lines[i].includes("-->") && !/^\d/.test(lines[i])) {
            id = lines[i].trim();
            i++;
          }
          if (lines[i]?.includes("-->")) {
            const [start, end] = lines[i].split("-->").map((s) => s.trim());
            try {
              const parseTime = (s: string) => {
                // Support both hh:mm:ss(.ms) and mm:ss(.ms) formats
                const parts = s.split(":");
                let hours = 0,
                  minutes = 0,
                  seconds = 0,
                  ms = 0;
                if (parts.length === 3) {
                  // hh:mm:ss(.ms)
                  hours = parseInt(parts[0]);
                  minutes = parseInt(parts[1]);
                  if (parts[2].includes(".")) {
                    const [sec, msStr] = parts[2].split(".");
                    seconds = parseInt(sec);
                    ms = parseInt(msStr.padEnd(3, "0"));
                  } else {
                    seconds = parseInt(parts[2]);
                  }
                } else if (parts.length === 2) {
                  // mm:ss(.ms)
                  minutes = parseInt(parts[0]);
                  if (parts[1].includes(".")) {
                    const [sec, msStr] = parts[1].split(".");
                    seconds = parseInt(sec);
                    ms = parseInt(msStr.padEnd(3, "0"));
                  } else {
                    seconds = parseInt(parts[1]);
                  }
                } else {
                  throw new Error(`Invalid timestamp: ${s}`);
                }
                return hours * 3600 + minutes * 60 + seconds + ms / 1000;
              };
              const startTime = parseTime(start);
              const endTime = parseTime(end);
              if (startTime >= endTime)
                throw new Error(
                  `Invalid cue times: start ${start} >= end ${end}`,
                );
              let text = "";
              i++;
              // Collect text until the next cue or end, allowing empty lines within text
              while (
                i < lines.length &&
                (lines[i] === "" ||
                  (!lines[i].includes("-->") &&
                    !/^\d{2}:\d{2}:\d{2}\.\d{1,3}/.test(lines[i])))
              ) {
                text += (text ? "\n" : "") + (lines[i] || "");
                i++;
              }
              const trimmedText = text.trim();
              if (trimmedText) {
                // Only add cues with non-empty text
                cues.push({
                  start: startTime,
                  end: endTime,
                  text: trimmedText,
                  id: id || `${startTime}-${cues.length}`,
                });
              }
            } catch (err) {
              console.warn(
                `Skipping invalid cue at line ${i + 1}: ${err.message}`,
              );
              i++;
            }
          } else {
            i++;
          }
        }
        if (cues.length === 0)
          throw new Error("No valid cues found in transcript");
        if (isMounted) setTranscriptCues(cues);
      } catch (err) {
        if (isMounted)
          setTranscriptError(
            err instanceof Error ? err.message : "Failed to load transcript",
          );
      } finally {
        if (isMounted) setIsTranscriptLoading(false);
      }
    };
    fetchTranscript();
    return () => {
      isMounted = false;
    };
  }, [media?.metadata?.transcript_url]);

  // Sync transcript with video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || transcriptCues.length === 0) return;
    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const idx = transcriptCues.findIndex(
        (cue) => current >= cue.start && current < cue.end,
      );
      setActiveCueIdx(idx);
      if (idx !== -1 && transcriptBoxRef.current) {
        const cueElem = document.getElementById(
          `cue-${transcriptCues[idx].id}`,
        );
        if (cueElem && transcriptBoxRef.current) {
          const box = transcriptBoxRef.current;
          const boxRect = box.getBoundingClientRect();
          const cueRect = cueElem.getBoundingClientRect();
          if (cueRect.top < boxRect.top || cueRect.bottom > boxRect.bottom) {
            cueElem.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    };
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [transcriptCues]);

  // Seek video when clicking transcript
  const handleCueClick = (start: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = start;
      videoRef.current.focus();
    }
  };

  // Split image logic
  const handleOpenSplitDialog = () => {
    if (!media || media.type !== "image") return;
    // Check if this is a landscape image
    const img = new window.Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      if (aspectRatio <= 1) {
        alert("Only landscape images can be split into portrait format");
        return;
      }
      getImageSplitPreview(media.id);
      setSplitDialogOpen(true);
    };
    img.onerror = () => {
      alert("Failed to load image for split preview");
    };
    img.src = media.storage_url_path;
  };

  const handleConfirmSplit = async (
    singleMode: boolean,
    excludedIndices?: number[],
  ) => {
    if (!media) return;
    const result = await splitImageToPortrait(
      media.id,
      singleMode,
      excludedIndices,
    );
    if (result) {
      setSplitDialogOpen(false);
      cancelSplitImage();
      // Optionally, refetch media or show a success message
    }
  };

  const handleCloseSplitDialog = () => {
    setSplitDialogOpen(false);
    cancelSplitImage();
  };

  // Add handlers for editing media name
  const handleEditName = () => {
    if (media?.name) {
      setMediaName(media.name);
    }
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!media || !mediaName.trim() || mediaName.trim() === media.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateMediaName(media.id, mediaName.trim());
      setMedia((prev) => (prev ? { ...prev, name: mediaName.trim() } : null));
      toast.success("Name Updated", {
        description: "Media name has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating media name:", error);
      toast.error("Error", {
        description: "Failed to update media name",
      });
    } finally {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {isEditingName ? (
              <input
                value={mediaName}
                onChange={(e) => setMediaName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleNameKeyDown}
                className="text-xl font-semibold max-w-md border-b border-gray-300 focus:outline-none focus:border-primary bg-transparent px-2 py-1 rounded"
                autoFocus
                aria-label="Edit media name"
              />
            ) : (
              <CardTitle
                onClick={handleEditName}
                className="cursor-pointer hover:underline flex items-center gap-2"
                tabIndex={0}
                aria-label="Edit media name"
                onKeyDown={(e) => e.key === "Enter" && handleEditName()}
              >
                {mediaName || "Untitled Media"}
                <Pencil className="h-4 w-4 opacity-50" />
              </CardTitle>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full mb-4" />
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : media ? (
            <div className="flex flex-col md:flex-col items-center w-full max-w-6xl mx-auto gap-8">
              {/* Media Preview */}
              {(media.type === "image" || media.type === "video") && (
                <img
                  src={media.thumbnail_url || media.storage_url_path}
                  alt={media.name}
                  className="w-full max-w-lg rounded-lg object-cover"
                  style={{
                    aspectRatio: media.aspect_ratio || "16/9",
                    maxHeight: "calc(100vh - 300px)",
                  }}
                />
              )}
              {media.type === "studio_recording" && (
                <div className="flex flex-row">
                  <div className="w-full md:w-2/3 flex justify-center mb-8 md:mb-0">
                    <video
                      ref={videoRef}
                      src={media.storage_url_path}
                      poster={media.thumbnail_url}
                      controls
                      className="w-full rounded-lg object-cover"
                      style={{
                        aspectRatio: media.aspect_ratio || "16/9",
                        maxHeight: "calc(100vh - 300px)",
                      }}
                      tabIndex={0}
                      aria-label="Media video player"
                    />
                  </div>
                  {media.metadata?.transcript_url && (
                    <div
                      ref={transcriptBoxRef}
                      className="w-full md:w-1/3 max-h-96 overflow-y-auto rounded-lg p-4 shadow-sm"
                      tabIndex={0}
                      aria-label="Transcript"
                    >
                      <h3 className="text-lg font-semibold mb-2">Transcript</h3>
                      {isTranscriptLoading ? (
                        <Skeleton className="h-40 w-full" />
                      ) : transcriptError ? (
                        <div className="text-red-500">{transcriptError}</div>
                      ) : transcriptCues.length === 0 ? (
                        <div className="text-gray-500">
                          No transcript available.
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {transcriptCues.map((cue, idx) => (
                            <li
                              key={cue.id}
                              id={`cue-${cue.id}`}
                              className={`px-2 py-1 rounded cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-primary focus:bg-primary/10 ${
                                idx === activeCueIdx
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "hover:bg-primary/10"
                              }`}
                              tabIndex={0}
                              aria-label={`Transcript cue: ${cue.text}`}
                              onClick={() => handleCueClick(cue.start)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ")
                                  handleCueClick(cue.start);
                              }}
                            >
                              <span className="block text-xs text-gray-400 mb-0.5">
                                {new Date(cue.start * 1000)
                                  .toISOString()
                                  .substr(11, 8)}
                              </span>
                              <span>{cue.text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-4 justify-center mb-8">
                {/* Download button for all media */}

                {/* Split image button for landscape images */}
                {media.type === "image" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(media.storage_url_path, "_blank")
                      }
                      aria-label="Download Media"
                    >
                      Download Media
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleOpenSplitDialog}
                      aria-label="Split to Portrait Format"
                    >
                      <Scissors className="mr-2 h-4 w-4" />
                      Split to Portrait Format
                    </Button>
                    {/* Motion Magic Video Generation Section */}
                    <Button
                      variant="outline"
                      onClick={() => setMotionMagicDialogOpen(true)}
                      aria-label="Open Motion Magic Dialog"
                    >
                      <Wand className="mr-2 h-4 w-4" />
                      Motion Magic
                    </Button>
                    <MotionMagicDialog
                      isOpen={motionMagicDialogOpen}
                      onClose={() => setMotionMagicDialogOpen(false)}
                      images={selectableImages}
                      onSubmit={handleMotionMagicDialogSubmit}
                      isLoading={isMotionMagicLoading}
                      error={motionMagicError}
                      videoUrl={
                        (media as { luma_video_url?: string }).luma_video_url
                      }
                    />
                  </>
                )}
                {/* Studio recording download buttons */}
                {(media.type === "studio_recording" ||
                  (media.metadata &&
                    (media.metadata.raw_url ||
                      media.metadata["720p_url"] ||
                      media.metadata.audio_url))) && (
                  <>
                    {media.metadata?.raw_url && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(media.metadata?.raw_url, "_blank")
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />{" "}
                        {media.resolution || "Raw"} Video
                      </Button>
                    )}
                    {media.metadata?.["720p_url"] && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(media.metadata?.["720p_url"], "_blank")
                        }
                      >
                        <Download className="mr-2 h-4 w-4" /> 720p Video
                      </Button>
                    )}
                    {media.metadata?.["1080p_url"] && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(media.metadata?.["1080p_url"], "_blank")
                        }
                      >
                        <Download className="mr-2 h-4 w-4" /> 1080p Video
                      </Button>
                    )}
                    {media.metadata?.audio_url && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(media.metadata?.audio_url, "_blank")
                        }
                      >
                        <Download className="mr-2 h-4 w-4" /> Audio
                      </Button>
                    )}
                    {media.metadata?.transcript_url && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(media.metadata?.transcript_url, "_blank")
                        }
                      >
                        <Download className="mr-2 h-4 w-4" /> Transcript
                      </Button>
                    )}
                  </>
                )}
              </div>
              {/* Metadata */}
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Type
                  </h3>
                  <span
                    className="ml-2 px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold capitalize"
                    aria-label={media.type}
                  >
                    {media.type.replace("_", " ")}
                  </span>
                </div>
                {media.resolution && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Resolution
                    </h3>
                    <p className="mt-1">{media.resolution || "None"}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Created
                  </h3>
                  <p className="mt-1">
                    {formatDistanceToNow(new Date(media.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {media.aspect_ratio && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Aspect Ratio
                    </h3>
                    <p className="mt-1">{media.aspect_ratio || "None"}</p>
                  </div>
                )}
                {media.metadata?.device_identifier && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Device Identifier
                    </h3>
                    <p className="mt-1">
                      {media.metadata?.device_identifier || "None"}
                    </p>
                  </div>
                )}
                {media.metadata?.image_splits && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Image Splits
                    </h3>
                    <div className="mt-1 flex flex-row gap-2">
                      {media.metadata.image_splits.map((split) => (
                        <a
                          key={split.index}
                          href={split.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={split.url}
                            alt={`Image Split ${split.index}`}
                            className="w-16 h-16 object-cover rounded-md"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {media.metadata?.motion_magic_video_urls && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Motion Magic Videos
                    </h3>
                    <div className="mt-1 flex flex-row gap-2">
                      {media.metadata.motion_magic_video_urls.map((url) => (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <video
                            src={url}
                            alt="Motion Magic Video"
                            className="w-16 h-16 object-cover rounded-md"
                          ></video>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Tags
                  </h3>
                  <p className="mt-1">{media.tags?.join(", ") || "None"}</p>
                </div> */}
                {/* Image metadata */}
                {/* <div className="flex flex-row gap-2">
                {Object.entries(media.caption_metadata || {}).map(([key, value]) => (
                  <div key={key}>
                    <h3 className="text-sm font-medium text-muted-foreground">{key}</h3>
                    <p className="mt-1">{String(value)}</p>
                  </div>
                ))}
                </div> */}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      {/* Split Image Dialog */}
      <SplitImageDialog
        isOpen={splitDialogOpen}
        onClose={handleCloseSplitDialog}
        previewUrls={splitImagePreview}
        isLoading={isSplittingImage}
        onConfirm={handleConfirmSplit}
      />
    </div>
  );
}
