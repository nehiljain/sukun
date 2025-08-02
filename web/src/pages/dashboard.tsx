import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { IVideoProject } from "@/types/video-gen";
import { TemplateDetailsTray } from "@/components/dashboard/TemplateDetailsTray";
import VerificationBanner from "@/components/auth/VerificationBanner";
import VideoPreviewTile from "@/components/VideoPreviewTile";
import VideoTile from "@/components/VideoTile";
import { ddApiClient } from "@/lib/api-client";

export default function Dashboard() {
  const { user, resendVerificationEmail } = useAuth();
  const [recentProjects, setRecentProjects] = useState<IVideoProject[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<IVideoProject | null>(null);
  const [isTemplateDetailsOpen, setIsTemplateDetailsOpen] = useState(false);

  useEffect(() => {
    const fetchRecentProjects = async () => {
      try {
        const response = await ddApiClient.get("/api/video-projects/", {
          params: { limit: 4 },
        });
        setRecentProjects(response.data.results.slice(0, 4));
      } catch (err) {
        console.error("Error fetching recent projects:", err);
      }
    };

    fetchRecentProjects();
  }, []);

  useEffect(() => {
    const assignProjects = async () => {
      const response = await ddApiClient.post(
        "/api/video-projects/assign_projects/",
      );
      console.log(response.data);
    };
    assignProjects();
  }, []);


  return (
    <div className="flex">
      <main className="text-foreground flex-1 p-12 space-y-12">
        {/* Welcome Section */}
        {user && !user.isEmailVerified && (
          <VerificationBanner
            email={user.email}
            isVerified={user.isEmailVerified}
            onResendVerification={resendVerificationEmail}
          />
        )}
        <div className="mb-8">
          <h1 className="text-3xl text-foreground font-bold">
            Hello, {user?.name}
          </h1>
          <p className="text-foreground mt-2">
            To get started, click on a template.
          </p>
        </div>

        {/* Quick Actions Grid */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/templates">
            <Card className="hover:bg-accent/5 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/5">
                    <PlusIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Create New Project</h3>
                    <p className="text-sm text-muted-foreground">
                      Start from a template
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:bg-accent/5 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/5">
                  <VideoIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Recording Studio</h3>
                  <p className="text-sm text-muted-foreground">
                    Join your video recording studio
                  </p>
                  <CreateRecordingButton
                    variant="link"
                    className="p-0 h-auto text-primary mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Link to="/media-library">
            <Card className="hover:bg-accent/5 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/5">
                    <UserIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Media Library</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your uploaded media
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div> */}

        {/* Recent Projects Section with Thumbnails */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Recent Projects</h2>
              <Link to="/video-projects">
                <Button variant="ghost" className="flex items-center gap-2">
                  View All
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No recent projects found
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                {recentProjects.slice(0, 4).map((project) => (
                  <Link
                    key={project.id}
                    to={`/video-projects/${project.id}/`}
                    className="group"
                  >
                    {project.preview_url ? (
                      <VideoPreviewTile project={project} />
                    ) : (
                      <VideoTile project={project} />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Commented out Recent Code Recipes */}
        {/* <RecentCodeRecipes /> */}
      </main>
      {/* Template Details Tray */}
      <TemplateDetailsTray
        template={selectedTemplate}
        isOpen={isTemplateDetailsOpen}
        onClose={() => {
          setIsTemplateDetailsOpen(false);
          setSelectedTemplate(null);
        }}
      />
    </div>
  );
}
