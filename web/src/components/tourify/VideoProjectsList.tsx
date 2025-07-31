import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Clock, UserPlus, Image, Music } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge } from "@/components/ui/status-badge";
import { useVideoPipelineList } from "./hooks";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { ddApiClient } from "@/lib/api-client";
import { MusicTrack } from "@/types/sound-gen";
import { handleDownload } from "@/utils/download";

const useTrack = (trackId: string | undefined) => {
  return useQuery({
    queryKey: ["track", trackId],
    queryFn: async () => {
      if (!trackId) return null;
      const response = await ddApiClient.get<MusicTrack>(
        `/api/tracks/${trackId}/`,
      );
      return response.data;
    },
    enabled: !!trackId,
  });
};

// Helper function to determine the appropriate object-fit style based on the aspect ratio
const getObjectFitStyle = (aspectRatio: string | undefined) => {
  // For portrait videos (9:16), use "contain" to show full height
  if (aspectRatio === "9:16") {
    return "contain";
  }
  // For all other aspect ratios (16:9, 1:1) or undefined, use "cover"
  return "cover";
};

export const VideoProjectsList = () => {
  const { isAuthenticated } = useAuth();
  const { data: pipeline_runs, isLoading, error } = useVideoPipelineList();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="h-6 w-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        Failed to load video projects. Please try again later.
      </div>
    );
  }

  if (!pipeline_runs?.length) {
    return (
      <div className="text-center py-8 text-slate-400">
        No video projects found. Create your first video project to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
      {pipeline_runs.map((pipeline_run) => {
        // Get the aspect ratio from video_project if available
        const aspectRatio = pipeline_run.video_project?.aspect_ratio;

        return (
          <Card
            key={pipeline_run.id}
            className="bg-slate-900/70 border-slate-700 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden hover:border-slate-600 transition-colors"
          >
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg font-semibold text-white">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      <span>
                        {pipeline_run.input_payload?.media_files?.length || 0}
                      </span>
                    </div>
                    <div className="w-px h-5 bg-slate-700" />
                    <TrackMoods
                      trackId={pipeline_run.input_payload?.track_id}
                    />
                  </div>
                </CardTitle>
              </div>
              <div className="flex items-center text-sm text-slate-400">
                <StatusBadge
                  status={
                    pipeline_run.render_video?.status || pipeline_run.status
                  }
                />
                <Clock className="ml-1 h-4 w-4 mr-1" />
                {formatDistanceToNow(new Date(pipeline_run.created_at), {
                  addSuffix: true,
                })}
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {pipeline_run.render_video?.video_url ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
                    <video
                      src={pipeline_run.render_video.video_url}
                      className="w-full h-full"
                      style={{
                        objectFit: getObjectFitStyle(aspectRatio),
                      }}
                      controls
                      muted
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg bg-slate-800 flex items-center justify-center">
                    <Play className="h-8 w-8 text-slate-600" />
                  </div>
                )}

                {pipeline_run.render_video?.video_url && (
                  <div className="flex justify-end gap-2">
                    {!isAuthenticated && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          window.open(window.location.origin + "/", "_blank");
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white"
                        data-ph-capture-attribute-action="signup_to_edit"
                        data-ph-capture-attribute-pipeline_id={pipeline_run.id}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Signup to Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        handleDownload(
                          pipeline_run.render_video?.video_url || "",
                          `listing-shorts-${pipeline_run.id}-${Date.now()}.mp4`,
                          {
                            pipeline_id: pipeline_run.id,
                            source: "project_list",
                          },
                        )
                      }
                      className="bg-white/10 hover:bg-white/20 text-white"
                      data-ph-capture-attribute-action="download_video"
                      data-ph-capture-attribute-pipeline_id={pipeline_run.id}
                      data-ph-capture-attribute-source="project_list"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const TrackMoods = ({ trackId }: { trackId: string | undefined }) => {
  const { data: track } = useTrack(trackId);

  if (!track) return null;

  return (
    <div className="flex items-center gap-2">
      <Music className="h-5 w-5" />
      <span>{track.moods.map((mood) => mood.name).join(", ")}</span>
    </div>
  );
};
