import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import VideoTile from "@/components/VideoTile";
import VideoPreviewTile from "@/components/VideoPreviewTile";
import { Link } from "react-router-dom";
import axios from "axios";
import { RightTray } from "@/components/shared/RightTray";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RectangleVertical, RectangleHorizontal, Square } from "lucide-react";
import { toast } from "sonner";
import { IVideoProject, IBrandAsset } from "@/types/video-gen";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 12;

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: IVideoProject[];
}

export default function VideoProjects() {
  const [videoProjects, setVideoProjects] = useState<IVideoProject[]>([]);
  const [setBrandAssets] = useState<IBrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreateTrayOpen, setIsCreateTrayOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  const { user, getActiveOrganization, hasPermission } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    brandAssetId: "",
    format: "16:9",
  });

  const fetchVideoProjects = async (pageNum: number) => {
    try {
      setLoading(true);
      const response = await axios.get<PaginatedResponse>(
        "/api/video-projects/",
        {
          withCredentials: true,
          params: {
            page: pageNum,
            page_size: ITEMS_PER_PAGE,
          },
        },
      );

      if (pageNum === 1) {
        setVideoProjects(response.data.results);
      } else {
        setVideoProjects((prev) => [...prev, ...response.data.results]);
      }

      setHasMore(!!response.data.next);
      setError(null);
    } catch (err) {
      console.error("Error fetching video projects:", err);
      setError("Failed to load video projects. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const lastProjectElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore],
  );

  useEffect(() => {
    fetchVideoProjects(page);
  }, [page]);

  useEffect(() => {
    const fetchBrandAssets = async () => {
      try {
        const csrfToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("csrftoken="))
          ?.split("=")[1];
        const response = await axios.get("/api/brand-assets/", {
          withCredentials: true,
          headers: {
            "X-CSRFToken": csrfToken || "",
          },
        });
        setBrandAssets(response.data);
      } catch (err) {
        console.error("Error fetching brand assets:", err);
      }
    };

    fetchBrandAssets();
  }, [user]);

  const handleCreateProject = async () => {
    setIsCreatingProject(true);
    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await axios.post(
        "/api/video-projects/",
        {
          name: formData.name,
          brand_asset: formData.brandAssetId || null,
          format: formData.format,
        },
        {
          withCredentials: true,
          headers: {
            "X-CSRFToken": csrfToken || "",
          },
        },
      );

      setVideoProjects((prev) => [response.data, ...prev]);
      setIsCreateTrayOpen(false);
      setFormData({
        name: "",
        brandAssetId: "",
        format: "16:9",
      });
      toast.success("Project created successfully");
    } catch (err) {
      console.error("Error creating project:", err);
      setError("Failed to create project. Please try again.");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const createTrayContent = (
    <form onSubmit={handleCreateProject} className="p-6 space-y-6">
      <div className="space-y-4 text-primary">
        <div>
          <label
            htmlFor="projectName"
            className="block text-sm font-medium mb-1"
          >
            Project Name
          </label>
          <Input
            id="projectName"
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter project name"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Video Format</label>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, format: "16:9" }))
              }
              disabled={isCreatingProject}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                ${
                  formData.format === "16:9"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              aria-label="16:9 Landscape Format"
              tabIndex={0}
            >
              <RectangleHorizontal className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium">Landscape</span>
              <span className="text-xs text-muted-foreground">16:9</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, format: "9:16" }))
              }
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                ${
                  formData.format === "9:16"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              aria-label="9:16 Portrait Format"
              tabIndex={0}
            >
              <RectangleVertical className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium">Portrait</span>
              <span className="text-xs text-muted-foreground">9:16</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, format: "1:1" }))
              }
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                ${
                  formData.format === "1:1"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              aria-label="1:1 Square Format"
              tabIndex={0}
            >
              <Square className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium">Square</span>
              <span className="text-xs text-muted-foreground">1:1</span>
            </button>
          </div>
        </div>

        {/* <div className="pt-4 text-primary">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-muted-foreground flex items-center gap-2 w-full justify-start px-0"
          >
            {showAdvanced ? <ChevronDown /> : <ChevronRight />} Advanced Options
          </Button>

          {showAdvanced && (
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="brandAsset"
                  className="block text-sm font-medium mb-1"
                >
                  Brand Assets
                </label>
                <Select
                  value={formData.brandAssetId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      brandAssetId: value,
                    }))
                  }
                >
                  <SelectTrigger id="brandAsset">
                    <SelectValue placeholder="Select a brand asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div> */}
      </div>
    </form>
  );

  return (
    <div className="flex">
      <main className="text-foreground flex-1 p-12 space-y-12">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground font-bold">
            {getActiveOrganization()?.organization_name} - Projects
          </h1>
          <p className="text-muted-foreground mt-2">Manage your projects.</p>
        </div>
        <Card className="h-full">
          {hasPermission("video_gen.add_video") && (
            <CardHeader className="flex flex-row items-center justify-end">
              <Button
                variant="primary"
                onClick={() => setIsCreateTrayOpen(true)}
                disabled={isCreatingProject}
              >
                {isCreatingProject ? "Creating..." : "Create Project"}
              </Button>
            </CardHeader>
          )}
          <CardContent>
            {loading && videoProjects.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 pt-6 gap-6">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="space-y-3">
                    <Skeleton className="h-40 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-red-500 text-center p-4">{error}</div>
            ) : videoProjects.length === 0 ? (
              <div className="text-center p-24">
                <p className="text-muted-foreground">
                  No video projects found. Go to /dashboard, select to a
                  template to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 pt-6 gap-6">
                {videoProjects.map((project, index) => (
                  <Link
                    key={project.id}
                    to={`/video-projects/${project.id}/`}
                    ref={
                      index === videoProjects.length - 1
                        ? lastProjectElementRef
                        : null
                    }
                  >
                    {project.latest_render_preview_url ? (
                      <VideoPreviewTile project={project} />
                    ) : (
                      <VideoTile project={project} />
                    )}
                  </Link>
                ))}
                {loading && videoProjects.length > 0 && (
                  <div className="col-span-full flex justify-center p-4">
                    <div className="space-y-3">
                      <Skeleton className="h-40 w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <RightTray
        isOpen={isCreateTrayOpen}
        onClose={() => setIsCreateTrayOpen(false)}
        title="Create New Project"
        subtitle="Enter project details below"
        actions={[
          {
            label: "Create",
            onClick: handleCreateProject,
            variant: "primary",
            disabled: isCreatingProject,
          },
        ]}
      >
        {createTrayContent}
      </RightTray>
    </div>
  );
}
