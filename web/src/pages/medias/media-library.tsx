import { useLocation, useNavigate } from "react-router-dom";
import { MediaBrowser } from "@/components/medias/media-browser";

export default function MediaLibrary() {
  const location = useLocation();
  const navigate = useNavigate();
  // Parse video_project_id from query params
  const params = new URLSearchParams(location.search);
  const video_project_id = params.get("video_project_id") || undefined;

  return (
    <div className="flex">
      <main className="flex-1 p-12 space-y-12">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Media Library
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your media assets
            </p>
          </div>
        </div>
        {/* Media Browser Component */}
        <MediaBrowser
          onSelect={(items) => {
            if (items[0]?.id) {
              navigate(`/medias/${items[0].id}`);
            }
          }}
          showUpload={true}
          video_project_id={video_project_id}
        />
      </main>
    </div>
  );
}
