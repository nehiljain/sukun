import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ReactVideoEditor from "../../components/editor-rve-v6/react-video-editor";
import { useSidebar } from "@/hooks/use-sidebar.tsx";
import { AspectRatio, Overlay } from "../../components/editor-rve-v6/types";
import ChatWindow from "../../components/chat/ChatWindow";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from "../../components/ui/sidebar";
import { BotIcon } from "lucide-react";
import { IVideoProject } from "@/types/video-gen";

const VideoProjectEditor: React.FC = () => {
  const { project_id } = useParams<{
    project_id: string;
  }>();
  const [initialOverlays, setInitialOverlays] = useState<Overlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setDisabled } = useSidebar();
  const [IVideoProject, setIVideoProject] = useState<IVideoProject | null>(
    null,
  );
  // Effect to handle sidebar state
  useEffect(() => {
    // Store original state to restore later
    // Close sidebar and prevent hover opening
    setDisabled(true);

    // Restore original settings when component unmounts
    return () => {
      setDisabled(false);
    };
  }, [setDisabled]);

  // Effect to load video asset data when component mounts
  useEffect(() => {
    const loadInitialOverlays = async () => {
      if (!project_id) return;

      try {
        setLoading(true);
        const response = await axios.get(`/api/video-projects/${project_id}/`);
        // If we have saved remotion_state, extract tracks
        if (response.data.state && response.data.state.overlays) {
          setInitialOverlays(response.data.state.overlays);
        }

        setIVideoProject(response.data);
      } catch (err) {
        console.error("Error loading video asset:", err);
        setError("Failed to load video asset");
      } finally {
        setLoading(false);
      }
    };

    loadInitialOverlays();
  }, [project_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">
          Loading video project... Please wait.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-destructive">
          Error: {error}.{" "}
          <button
            className="underline"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full overflow-hidden">
        <SidebarInset className="flex-1 transition-all duration-200">
          {/* Video Editor */}
          <div className="h-full w-full">
            <ReactVideoEditor
              videoProjectId={project_id}
              videoProjectName={IVideoProject?.name}
              videoProjectStatus={IVideoProject?.status}
              initialOverlays={initialOverlays}
              initialAspectRatio={
                IVideoProject?.state?.aspectRatio as AspectRatio
              }
            />
          </div>
        </SidebarInset>

        {/* Chat Sidebar */}
        <Sidebar side="right" variant="sidebar" collapsible="offcanvas">
          <SidebarRail />
          <SidebarContent className="overflow-hidden">
            <ChatWindow
              projectId={project_id}
              className="min-h-[98vh] max-h-[98vh]"
            />
          </SidebarContent>
        </Sidebar>

        {/* Button to toggle the chat sidebar, position it top-right */}
        <div className="absolute right-4 top-3 z-20">
          <SidebarTrigger
            icon={BotIcon}
            className="bg-primary text-primary-foreground size-8"
          />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default VideoProjectEditor;
