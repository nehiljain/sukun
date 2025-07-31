import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Pencil, Music2 } from "lucide-react";

// API
import { ddApiClient } from "@/lib/api-client";

// UI Elements
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { IMediaFile, IVideoProject, IRenderVideo } from "@/types/video-gen";

//Hooks
import { useVideoProjectState } from "@/components/editor-rve-v6/hooks/use-video-project-state";
import { useAuth } from "@/contexts/AuthContext";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";

// UI Components
import ChatWindow from "@/components/chat/ChatWindow";
import { MediaCard } from "@/components/medias/media-tile";
import { Separator } from "@/components/ui/separator";
import { MediaUploadButton } from "@/components/medias/MediaUploadButton";

// Convert IRenderVideo to IMediaItem format
const convertRenderToMediaItem = (render: IRenderVideo) => ({
  id: render.id,
  name: render.name,
  type: "video" as const,
  thumbnail_url: render.thumbnail_url || "",
  storage_url_path: render.video_url || "",
  created_at: render.created_at,
  status: render.status,
  aspect_ratio: render.aspect_ratio,
  tags: [], // Add empty tags array to satisfy IMediaItem interface
});

export default function VideoProjectEntry() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const { project_id } = useParams<{ project_id: string }>();
  const [videoProjectObj, setVideoProjectObj] = useState<IVideoProject | null>(
    null,
  );
  const [projectMedia, setProjectMedia] = useState<IMediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  const { updateProjectName } = useVideoProjectState(project_id);

  // Add state for renders and selected render
  const [renders, setRenders] = useState<IRenderVideo[]>([]);

  const handleEditName = () => {
    if (videoProjectObj?.name) {
      setProjectName(videoProjectObj.name);
    }
    setIsEditingName(true);
  };

  const updateProjectNameHandler = async () => {
    if (
      !project_id ||
      !projectName.trim() ||
      projectName.trim() == videoProjectObj?.name
    ) {
      setIsEditingName(false);
      return;
    }

    try {
      await updateProjectName(projectName.trim());
      setVideoProjectObj((prev) =>
        prev ? { ...prev, name: projectName.trim() } : null,
      );
      toast.success("Name Updated", {
        description: "Project name has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating project name:", error);
      toast.error("Error", {
        description: "Failed to update project name",
      });
    } finally {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      updateProjectNameHandler();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
    }
  };

  // const handleAcceptProject = useCallback(async () => {
  //   if (!project_id) return;

  //   try {
  //     setIsUpdatingStatus(true);
  //     const response = await ddApiClient.post(`/api/video-projects/${project_id}/accept/`);

  //     if (response.status === 200) {
  //       setProjectStatus(VideoProjectStatus.COMPLETE);
  //       toast.success("Video accepted successfully");
  //     } else {
  //       throw new Error("Failed to accept video");
  //     }
  //   } catch (error) {
  //     console.error("Error accepting video:", error);
  //     toast.error("Error accepting video. Try again later.");
  //   } finally {
  //     setIsUpdatingStatus(false);
  //   }
  // }, [project_id]);

  const fetchRenders = async () => {
    if (!project_id) return;

    try {
      const response = await ddApiClient.get(
        `/api/render-videos/?video_project_id=${project_id}`,
      );

      if (response.status !== 200) {
        throw new Error(`Failed to fetch renders: ${response.statusText}`);
      }

      const data = response.data;
      setRenders(data || []);
    } catch (err) {
      console.error("Error fetching renders:", err);
    }
  };

  const handleRenderSelect = (render: IRenderVideo) => {
    navigate(`/render-videos/${render.id}`);
  };

  useEffect(() => {
    fetchRenders();
  }, [project_id]);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!project_id) return;

      try {
        setIsLoading(true);
        const [projectResponse, mediaResponse] = await Promise.all([
          ddApiClient.get(`/api/video-projects/${project_id}/`),
          ddApiClient.get(`/api/video-projects/${project_id}/media/`),
        ]);

        if (projectResponse.status !== 200 || mediaResponse.status !== 200) {
          throw new Error(
            `Failed to fetch project details: ${projectResponse.statusText || mediaResponse.statusText}`,
          );
        }

        const [projectData, mediaData] = await Promise.all([
          projectResponse.data,
          mediaResponse.data,
        ]);

        setVideoProjectObj(projectData);
        setProjectMedia(mediaData.media);
        setProjectStatus(projectData.status);
      } catch (err) {
        console.error("Error fetching project details:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load project details",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [project_id]);

  return (
    <main className="text-foreground flex-1 p-12 space-y-12">
      <Card className="h-full">
        <CardHeader>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-1/3 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </>
          ) : error ? (
            <>
              <CardTitle>Video Project</CardTitle>
              <CardDescription className="text-red-500">
                {error}
              </CardDescription>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center justify-between gap-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        onBlur={updateProjectNameHandler}
                        onKeyDown={handleNameKeyDown}
                        className="text-xl font-semibold max-w-md"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <CardTitle
                      onClick={handleEditName}
                      className="cursor-pointer hover:underline flex items-center gap-2"
                      tabIndex={0}
                      aria-label="Edit project name"
                      onKeyDown={(e) => e.key === "Enter" && handleEditName()}
                    >
                      {videoProjectObj?.name || "Untitled Project"}
                      <Pencil className="h-4 w-4 opacity-50" />
                    </CardTitle>
                  )}
                  {projectStatus && (
                    <div className="flex gap-2">
                      <div className="flex-grow flex items-center justify-end mr-4">
                        {/* {projectStatus === VideoProjectStatus.GENERATED && (
                          <Button
                            onClick={handleAcceptProject}
                            variant="primary"
                            disabled={isUpdatingStatus}
                          >
                            {isUpdatingStatus && (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            )}
                            Accept Project
                          </Button>
                        )} */}
                        {/* {videoProjectObj?.status !==
                          VideoProjectStatus.DRAFT && (
                          <Button
                            onClick={() => setSelectedRender(renders[0])}
                            variant="secondary"
                            className="ml-2"
                          >
                            <Video className="h-3.5 w-3.5 mr-1.5" />
                            Exports
                          </Button>
                        )} */}
                      </div>
                    </div>
                  )}
                  <div className="mt-2 text-sm text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <div>
                        <span className="font-medium">Last updated:</span>{" "}
                        {videoProjectObj?.updated_at
                          ? formatDistanceToNow(
                              new Date(videoProjectObj.updated_at),
                              { addSuffix: true },
                            )
                          : "Unknown"}
                        <StatusBadge
                          className="ml-2"
                          status={projectStatus || ""}
                        />
                        <Badge variant="secondary" className="ml-2 text-sm">
                          {videoProjectObj?.aspect_ratio}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasPermission("video_gen.add_media") && project_id && (
                    <MediaUploadButton
                      video_project_id={project_id}
                      onUploadComplete={() => {
                        // Refresh media list after upload
                        setIsLoading(true);
                        ddApiClient
                          .get(`/api/video-projects/${project_id}/media/`)
                          .then((mediaResponse) => {
                            setProjectMedia(mediaResponse.data.media);
                            setIsLoading(false);
                          });
                      }}
                      className="min-w-[180px]"
                    />
                  )}
                  {hasPermission("videogen.video_project_edit") && (
                    <Link to={`/video-projects/${project_id}/editor`}>
                      <div className="flex flex-row items-center gap-2 bg-muted rounded-lg px-3 py-2">
                        <Pencil className="h-4 w-4" />
                        Editor
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!isLoading && videoProjectObj && (
            <>
              <div className="mb-6 flex items-center justify-between">
                {projectMedia.length > 0 && (
                  <div className="flex flex-col w-full gap-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-md text-foreground font-medium">
                        Input Media
                      </h2>
                      <Separator className="h-[1px] flex-grow bg-muted" />
                      {videoProjectObj?.metadata?.template_metadata?.mood && (
                        <div className="flex items-center gap-2">
                          <Music2 className="h-4 w-4" />
                          <span className="font-medium">Track:</span>
                          <span className="font-medium">
                            {videoProjectObj?.metadata?.template_metadata?.mood}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {projectMedia.slice(0, 5).map((media) => (
                        <Link
                          key={media.id}
                          to={`/medias/${media.id}`}
                          className="relative h-20 w-32 rounded-md overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                          title={media.name}
                          tabIndex={0}
                          aria-label={`Open media: ${media.name}`}
                        >
                          <img
                            src={media.thumbnail_url || media.storage_url_path}
                            alt={media.name}
                            className="h-full w-full object-cover cursor-pointer"
                          />
                        </Link>
                      ))}
                      {projectMedia.length > 5 && (
                        <div
                          onClick={() =>
                            navigate(
                              `/media-library?video_project_id=${project_id}`,
                            )
                          }
                          className="flex items-center justify-center h-20 w-32 rounded-md bg-muted text-xs font-medium"
                        >
                          +{projectMedia.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {renders.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-md text-foreground font-medium">
                      Generated Video Highlights for your project
                    </h2>
                    <Separator className="h-[1px] flex-grow bg-muted" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {renders.map((render) => (
                      <MediaCard
                        key={render.id}
                        item={convertRenderToMediaItem(render)}
                        onSelect={() => handleRenderSelect(render)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-md text-foreground font-medium">
                      Chat Assistant
                    </h2>
                    <Separator className="h-[1px] flex-grow bg-muted" />
                  </div>
                  <div className="w-full lg:flex-1">
                    <ChatWindow
                      entityId={project_id}
                      entityType="video-projects"
                      className="min-h-[calc(100vh-40vh)] max-h-[calc(100vh-40vh)]"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
