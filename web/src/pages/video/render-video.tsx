import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

// API
import { ddApiClient } from "@/lib/api-client";

// UI Elements
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

// Types
import { IRenderVideo } from "@/types/video-gen";

// Components
import ChatWindow from "@/components/chat/ChatWindow";

interface TranscriptEntry {
  id: number;
  start: number;
  end: number;
  text: string;
}

export default function RenderVideoPage() {
  const { render_video_id } = useParams<{ render_video_id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [renderVideo, setRenderVideo] = useState<IRenderVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [activeTranscriptId, setActiveTranscriptId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const fetchRenderVideo = async () => {
      if (!render_video_id) return;

      try {
        setIsLoading(true);
        const response = await ddApiClient.get(
          `/api/render-videos/${render_video_id}/`,
        );

        if (response.status !== 200) {
          throw new Error(
            `Failed to fetch render video: ${response.statusText}`,
          );
        }

        setRenderVideo(response.data);

        // Fetch transcripts if available
        if (response.data.transcript_url) {
          const transcriptResponse = await fetch(response.data.transcript_url);
          const transcriptText = await transcriptResponse.text();
          const parsedTranscripts = parseSRT(transcriptText);
          setTranscripts(parsedTranscripts);
        }
      } catch (err) {
        console.error("Error fetching render video:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load render video",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRenderVideo();
  }, [render_video_id]);

  // Handle video time updates to sync with transcripts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const activeTranscript = transcripts.find(
        (transcript) =>
          currentTime >= transcript.start && currentTime <= transcript.end,
      );

      if (activeTranscript && activeTranscript.id !== activeTranscriptId) {
        setActiveTranscriptId(activeTranscript.id);

        // Scroll transcript into view
        const transcriptElement = document.getElementById(
          `transcript-${activeTranscript.id}`,
        );
        if (transcriptElement && transcriptRef.current) {
          transcriptRef.current.scrollTo({
            top: transcriptElement.offsetTop - transcriptRef.current.offsetTop,
            behavior: "smooth",
          });
        }
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [transcripts, activeTranscriptId]);

  const handleStatusUpdate = async (status: string) => {
    if (!render_video_id) return;

    try {
      setIsUpdatingStatus(true);
      const response = await ddApiClient.post(
        `/api/render-videos/${render_video_id}/status_update/`,
        {
          status: status as any,
        },
      );

      if (response.status === 200) {
        setRenderVideo((prev) =>
          prev ? { ...prev, status: status as any } : null,
        );
        toast.success("Video status updated successfully");
      } else {
        throw new Error("Failed to update video status");
      }
    } catch (error) {
      console.error("Error updating video status:", error);
      toast.error("Error updating video status. Try again later.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const parseSRT = (srtContent: string): TranscriptEntry[] => {
    const entries: TranscriptEntry[] = [];
    const blocks = srtContent.trim().split("\n\n");

    blocks.forEach((block) => {
      const lines = block.split("\n");
      if (lines.length >= 3) {
        const id = parseInt(lines[0]);
        const [start, end] = lines[1].split(" --> ").map((time) => {
          const [hours, minutes, seconds] = time.split(":");
          return (
            parseFloat(hours) * 3600 +
            parseFloat(minutes) * 60 +
            parseFloat(seconds.replace(",", "."))
          );
        });
        const text = lines.slice(2).join(" ");

        entries.push({ id, start, end, text });
      }
    });

    return entries;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-[calc(100vh-5rem)]" />
      </div>
    );
  }

  if (error || !renderVideo) {
    return (
      <div className="container mx-auto py-10">
        <Card className="p-6">
          <h1 className="text-2xl font-bold text-red-500">Error</h1>
          <p>{error || "Render video not found"}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen container mx-auto py-10 overflow-hidden">
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <CardTitle>{renderVideo.name}</CardTitle>
            <CardDescription>Highlights</CardDescription>
            <StatusBadge status={renderVideo.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side - Video player and actions */}
            <div className="space-y-6">
              <div className="aspect-video relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  src={renderVideo.video_url}
                  poster={renderVideo.thumbnail_url}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex gap-4">
                {/* <Button
                  variant="outline"
                  onClick={() => window.open(renderVideo.video_url, "_blank")}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button> */}
                {renderVideo.status !== "accepted" &&
                  renderVideo.status !== "rejected" && (
                    <>
                      <Button
                        onClick={() => handleStatusUpdate("accepted")}
                        variant="primary"
                        disabled={isUpdatingStatus}
                        className="flex-1"
                      >
                        {isUpdatingStatus && (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        )}
                        Accept Video
                      </Button>
                      <Button
                        onClick={() => handleStatusUpdate("rejected")}
                        variant="destructive"
                        disabled={isUpdatingStatus}
                        className="flex-1"
                      >
                        {isUpdatingStatus && (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        )}
                        Reject Video
                      </Button>
                    </>
                  )}
              </div>

              {/* Transcripts section */}
              {transcripts.length > 0 && (
                <Card className="p-4">
                  <h2 className="text-lg font-semibold mb-4">Transcript</h2>
                  <div
                    ref={transcriptRef}
                    className="max-h-[300px] overflow-y-auto space-y-2"
                  >
                    {transcripts.map((transcript) => (
                      <div
                        key={transcript.id}
                        id={`transcript-${transcript.id}`}
                        className={`p-2 rounded ${
                          activeTranscriptId === transcript.id
                            ? "bg-primary/10"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = transcript.start;
                          }
                        }}
                      >
                        <p className="text-sm">{transcript.text}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right side - Chat window */}
            <div className="h-[calc(100vh-30vh)]">
              <ChatWindow
                entityId={render_video_id}
                entityType="render-videos"
                // className="h-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
