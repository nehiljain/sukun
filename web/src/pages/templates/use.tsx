import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { IVideoProject } from "@/types/video-gen";
import { ChevronLeft } from "lucide-react";
import { MusicSelector } from "@/components/tourify/MusicSelector";
import { useMusicTracks } from "@/components/tourify/hooks";
import { ddApiClient } from "@/lib/api-client";
import { MediaBrowser } from "@/components/medias/media-browser";
import { IMediaItem } from "@/types/media";

interface Media {
  id: string;
  name: string;
  thumbnail_url: string;
}

export default function TemplateUsePage() {
  const { template_id } = useParams<{ template_id: string }>();
  const navigate = useNavigate();
  const { data: musicTracks } = useMusicTracks();
  //   const { mediaItems: mediaList, isLoading: isLoadingMedia } = useMediaLibrary("image");
  // Template data
  const [template, setTemplate] = useState<IVideoProject | null>(null);

  // Form state
  const [projectName, setProjectName] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<IMediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch template data
  const { data: templateData, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ["template", template_id],
    queryFn: async () => {
      const response = await ddApiClient.get(`/api/templates/${template_id}/`);
      if (response.status !== 200) throw new Error("Failed to fetch template");
      return response.data;
    },
  });

  // Update template data when fetched
  useEffect(() => {
    if (templateData) {
      setTemplate(templateData);
      setProjectName(`${templateData.name}`);
      setSelectedMood("Happy");
    }
  }, [templateData]);

  //   Fetch media for selection
  const { data: mediaList, isLoading: isLoadingMedia } = useQuery<Media[]>({
    queryKey: ["media"],
    queryFn: async () => {
      const response = await ddApiClient.get("/api/media/");
      if (response.status !== 200) throw new Error("Failed to fetch media");
      return response.data;
    },
  });

  // Fetch genres and moods for selection
  //   const { data: genres } = useQuery<Genre[]>({
  //     queryKey: ["genres"],
  //     queryFn: async () => {
  //       const response = await ddApiClient.get("/api/genres/");
  //       if (response.status !== 200) throw new Error("Failed to fetch genres");
  //       return response.data;
  //     },
  //   });

  //   const { data: moods } = useQuery<Mood[]>({
  //     queryKey: ["moods"],
  //     queryFn: async () => {
  //       const response = await ddApiClient.get("/api/moods/");
  //       if (response.status !== 200) throw new Error("Failed to fetch moods");
  //       return response.data;
  //     },
  //   });

  const onMoodSelect = (moodId: string) => {
    setSelectedMood(moodId);
  };

  const handleCreateWithAI = async () => {
    if (!projectName || !selectedMood || selectedMedia.length === 0) {
      toast.error(
        "Please fill all required fields and select at least one media",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare media list with placeholder labels
      const media = selectedMedia.map((mediaItem, index) => ({
        placeholder: `Scene ${index + 1}`,
        media_id: mediaItem.id,
      }));

      const response = await ddApiClient.post(
        `/api/templates/${template_id}/use_template_ai/`,
        {
          name: projectName,
          genre: "",
          mood: selectedMood,
          media,
          address: selectedAddress,
        },
      );

      if (response.status !== 201) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to create AI project");
      }

      const data = response.data;

      toast.success("AI project created successfully!");

      navigate(`/video-projects/${data.id}/`);
    } catch (error: unknown) {
      console.error("Error creating AI project:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create AI project",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex">
      <main className="text-foreground flex-1 p-12 space-y-8">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div>
            <h1 className="text-3xl text-foreground font-bold">
              {isLoadingTemplate ? "Loading template..." : template?.name}
            </h1>
            <p className="text-foreground mt-2">{template?.description}</p>
          </div>
        </div>

        {isLoadingTemplate ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-foreground">Loading template...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Preview Card */}
            {/* {template?.preview_url && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Template Preview</h2>
                  <div className="aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden">
                    <video
                      src={template.preview_url}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                    />
                  </div>
                </CardContent>
              </Card>
            )} */}

            {/* Configuration Card */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Side - Form Fields */}
                  <div className="space-y-6">
                    {/* Project Name */}
                    <div className="space-y-4">
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input
                        id="projectName"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Enter project name"
                      />
                    </div>

                    {/* Address */}
                    <div className="space-y-4">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={selectedAddress}
                        onChange={(e) => setSelectedAddress(e.target.value)}
                        placeholder="Enter address"
                      />
                    </div>

                    {/* Music Genre */}
                    {/* <div className="space-y-2">
                      <Label htmlFor="genre">Music Genre</Label>
                      <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                        <SelectTrigger id="genre">
                          <SelectValue placeholder="Select a genre" />
                        </SelectTrigger>
                        <SelectContent>
                          {genres?.map((genre) => (
                            <SelectItem key={genre.id} value={genre.name}>
                              {genre.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div> */}

                    {/* Music Mood */}
                    <div className="space-y-4">
                      <Label htmlFor="mood">Music Mood</Label>
                      <MusicSelector
                        tracks={musicTracks || []}
                        selectedTrackId={null}
                        initialSelectedMood={selectedMood}
                        onTrackSelect={() => {}}
                        onMoodSelect={onMoodSelect}
                        showTracks={false}
                      />
                    </div>

                    {/* Template details */}
                    {/* {template && (
                      <div className="space-y-4 mt-6 p-4 bg-accent/5 rounded-lg">
                        <h3 className="text-sm font-medium text-foreground">
                          Template Requirements
                        </h3>
                        {template.metadata?.template_metadata?.images && (
                          <p className="text-sm flex gap-2 text-foreground">
                            <ImagePlay className="w-4 h-4" />
                            {template.metadata.template_metadata.images} Images
                          </p>
                        )}
                        {template.metadata?.template_metadata?.tracks && (
                          <span className="text-sm flex gap-2 text-foreground">
                            <Music2 className="w-4 h-4" />
                            {template.metadata.template_metadata.tracks} Audio
                            Tracks
                          </span>
                        )}
                      </div>
                    )} */}

                    {/* Action Buttons */}
                    <div className="pt-6 flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateWithAI}
                        variant="primary"
                        disabled={
                          isSubmitting ||
                          !projectName ||
                          !selectedMood ||
                          !selectedAddress ||
                          selectedMedia.length === 0
                        }
                      >
                        {isSubmitting ? "Creating..." : "Create AI Project"}
                      </Button>
                    </div>
                  </div>

                  {/* Right Side - Media Selection */}
                  <div className="bg-accent/5 p-4 rounded-lg">
                    <div className="space-y-4">
                      <h2 className="text-lg font-medium">
                        Select Media for Scenes
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Selected media will be synchronized with music markers.
                        Select at least one.
                      </p>

                      {isLoadingMedia ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p>Loading media...</p>
                        </div>
                      ) : (
                        <MediaBrowser
                          onSelect={setSelectedMedia}
                          gridClassName="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                          multiSelect={true}
                          showUpload={false}
                          selectedItems={selectedMedia}
                          initialFilters={{ type: "image" }}
                        />
                      )}

                      {selectedMedia.length === 0 && !isLoadingMedia && (
                        <div className="text-center py-6 rounded-lg">
                          <p className="text-muted-foreground mb-2">
                            No media available
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => navigate("/media-library")}
                            size="sm"
                          >
                            Upload Media
                          </Button>
                        </div>
                      )}

                      <div className="text-sm font-medium mt-4">
                        {selectedMedia.length} media selected
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
