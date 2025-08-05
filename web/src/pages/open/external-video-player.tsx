import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ddApiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import posthog from "posthog-js";
import { Skeleton } from "@/components/ui/skeleton";
import { UnlinkIcon } from "lucide-react";

function getAspectRatio(aspectRatio: string) {
  const [width, height] = aspectRatio.split(":");
  const ratio = width / height;
  return ratio.toString();
}

// Video metadata type definition
type VideoMetadata = {
  duration: string;
  resolution: string;
  aspectRatio: string;
};

export default function VideoPlayer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decodedVideoId, setDecodedVideoId] = useState<string>("");
  const [videos, setVideos] = useState<
    {
      title: string;
      description: string;
      video_name: string;
      video_url: string;
      aspect_ratio: string;
    }[]
  >([]);
  const [projectName, setProjectName] = useState("");
  const { video_id } = useParams();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [legacyVideo, setLegacyVideo] = useState(false);

  // New state for video metadata
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata[]>([]);

  // Reference to video elements
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const validateVideo = async () => {
      if (video_id) {
        try {
          const decoded = atob(video_id);
          setLegacyVideo(true);
          setDecodedVideoId(decoded);
        } catch (err) {
          if (err instanceof DOMException) {
            ddApiClient
              .get(`/api/render-videos/${video_id}/`)
              .then((res) => {
                setDecodedVideoId(res.data.video_id);
                setLegacyVideo(false);
                setVideos([
                  {
                    title: res.data.name,
                    description: res.data.description,
                    video_name: res.data.name,
                    video_url: res.data.video_url,
                    aspect_ratio: getAspectRatio(res.data.aspect_ratio),
                  },
                ]);

                // Initialize metadata array with empty values
                setVideoMetadata([
                  {
                    duration: "",
                    resolution: "",
                    aspectRatio: res.data.aspect_ratio || "",
                  },
                ]);

                setCount(1);
                setLoading(false);
              })
              .catch((err) => {
                setError(`Failed to fetch video: ${err}`);
                setLoading(false);
              });
          } else {
            setError(`Invalid video ID format: ${err}`);
          }
          setLoading(false);
          return;
        }
      }

      try {
        if (decodedVideoId && legacyVideo) {
          // Fetch metadata first
          const metadataResponse = await fetch(
            `https://storage.googleapis.com/demodrive-media/${decodedVideoId}/metadata.json`,
          );

          if (!metadataResponse.ok) {
            throw new Error("Metadata not found");
          }

          const metadata = await metadataResponse.json();
          setProjectName(metadata.project_name || "Project");
          const videos = metadata.files.map((file: any) => ({
            title: file.name,
            description: file.description,
            video_name: file.video_name,
            video_url:
              file.video_url ||
              `https://storage.googleapis.com/demodrive-media/${decodedVideoId}/${file.video_name}`,
            aspect_ratio: file.aspect_ratio || "16:9",
          }));

          // Initialize metadata array with empty values and aspect ratios
          const initialMetadata = videos.map((video) => ({
            duration: "",
            resolution: "",
            aspectRatio: video.aspect_ratio || "16:9",
          }));

          setVideoMetadata(initialMetadata);
          setVideos(videos);
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load video");
        setLoading(false);
      }
    };

    validateVideo();
  }, [video_id, legacyVideo]);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Handler for when video metadata is loaded
  const handleVideoMetadataLoaded = (
    index: number,
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    const videoElement = event.currentTarget;
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    const duration = videoElement.duration;

    // Format duration to mm:ss
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    const formattedDuration = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;

    // Format resolution
    const resolution = `${width}×${height}`;

    // Update the metadata state
    setVideoMetadata((prevMetadata) => {
      const updatedMetadata = [...prevMetadata];
      updatedMetadata[index] = {
        ...updatedMetadata[index],
        duration: formattedDuration,
        resolution: resolution,
      };
      return updatedMetadata;
    });
  };

  // Add handler for video play event
  const handleVideoPlay = (
    index: number,
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    const video = videos[index];
    const metadata = videoMetadata[index];

    posthog.capture("video_played", {
      video_title: video.title,
      video_url: video.video_url,
      project_name: projectName,
      video_duration: metadata.duration,
      video_resolution: metadata.resolution,
      aspect_ratio: metadata.aspectRatio,
      video_index: index + 1,
      total_videos: count,
      legacy_video: legacyVideo,
      video_id: decodedVideoId,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <Navbar
          buttons={[
            {
              label: "Sign Up",
              variant: "primary",
              onClick: () => {
                window.location.href = "/";
              },
            },
          ]}
        />
        <Card className="w-full pt-24 flex flex-grow animate-pulse">
          <div className="w-full max-w-5xl mx-auto pb-24 sm:pb-12 md:pb-0">
            <div className="p-1">
              <div className="relative mx-auto rounded-lg">
                <div className="relative w-full h-[calc(100vh-300px)] flex items-center justify-center">
                  <Skeleton className="w-full h-full max-h-[calc(100vh-300px)] aspect-video" />
                </div>
              </div>
            </div>
            <div className="flex flex-row items-center gap-4 mt-4">
              <Skeleton className="h-10 w-16" />
              <div className="w-full">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </div>
          </div>
        </Card>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen">
        <Navbar
          buttons={[
            {
              label: "Sign Up",
              variant: "primary",
              onClick: () => {
                window.location.href = "/";
              },
            },
          ]}
        />
        <div className="flex flex-grow justify-center text-white items-center flex-col gap-4">
          <UnlinkIcon className="w-40 h-40" />
          <p className="text-2xl">Error: {error}</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Navbar
        buttons={[
          {
            label: "Sign Up",
            variant: "primary",
            onClick: () => {
              window.location.href = "/";
            },
          },
        ]}
      />
      <Card className="w-full pt-24 flex flex-col flex-grow">
        {projectName && (
          <CardHeader className="w-[95%] md:w-1/2 mx-auto text-center">
            <CardTitle>{projectName}</CardTitle>
          </CardHeader>
        )}
        <Carousel
          className="w-full max-w-5xl mx-auto pb-24 sm:pb-12 md:pb-0"
          setApi={setApi}
        >
          <CarouselContent>
            {videos.map((video, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                  <div className="relative mx-auto transition-all duration-300 hover:shadow-[0_0_30px_15px_rgba(219,39,119,0.2),0_0_30px_15px_rgba(59,130,246,0.2)] rounded-lg">
                    {/* Video container with aspect ratio handling */}
                    <div className="relative w-full h-[calc(100vh-300px)] flex items-center justify-center">
                      <div
                        className={cn(
                          "relative w-full h-full",
                          video.aspect_ratio === "0.5625"
                            ? "max-w-[calc((100vh-300px)*0.5625)]"
                            : "max-h-[calc((100vw/1.7778))]",
                        )}
                      >
                        <video
                          src={video.video_url}
                          className="rounded-lg w-full h-full object-contain"
                          controls
                          autoPlay
                          muted
                          style={{
                            aspectRatio: video.aspect_ratio,
                            maxHeight: "calc(100vh - 300px)",
                          }}
                          onLoadedMetadata={(e) =>
                            handleVideoMetadataLoaded(index, e)
                          }
                          onPlay={(e) => handleVideoPlay(index, e)}
                          ref={(el) => {
                            if (videoRefs.current) {
                              videoRefs.current[index] = el;
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-row items-center gap-4 mt-4">
                  <div className="text-2xl md:text-3xl lg:text-4xl font-semibold">
                    <span className="text-primary">{index + 1}</span>
                    <span className="text-gray-500">/{count}</span>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold mb-2">
                      {video.title}
                    </h3>
                    {projectName && (
                      <h3 className="text-sm md:text-base mb-2">
                        <span className="text-accent">Project: </span>
                        {projectName}
                      </h3>
                    )}
                    <p className="text-sm md:text-base text-gray-600 mb-4">
                      {video.description}
                    </p>
                    {/* Video metadata badges */}
                    <div className="flex flex-wrap gap-2">
                      {videoMetadata[index]?.duration && (
                        <Badge variant="white">
                          {videoMetadata[index].duration}
                        </Badge>
                      )}
                      {videoMetadata[index]?.resolution && (
                        <Badge variant="white">
                          {videoMetadata[index].resolution}
                        </Badge>
                      )}
                      {videoMetadata[index]?.aspectRatio && (
                        <Badge variant="white">
                          {videoMetadata[index].aspectRatio}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="w-12 h-12 absolute left-4" />
          <CarouselNext className="w-12 h-12 absolute right-4" />
        </Carousel>
      </Card>
      <Footer />
    </div>
  );
}
