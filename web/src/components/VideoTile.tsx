import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { IVideoProject } from "@/types/video-gen";
import { GlobeIcon, UserIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/contexts/AuthContext";
interface VideoTileProps {
  project: IVideoProject;
}

// Generate vibrant color with high saturation and good lightness
const generateVibrantColor = (seed: string, index: number): string => {
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  // Base hue derived from project id
  const baseHue = Math.abs(hashCode(seed)) % 360;

  // Generate hue using offsets to create complementary/analogous colors
  const offsets = [0, 30, 60, 180, 210, 240, 270];
  const hue = (baseHue + offsets[index % offsets.length]) % 360;

  // Keep saturation high for vibrant colors (70-100%)
  const saturation = 70 + (Math.abs(hashCode(seed + index)) % 30);

  // Adjust lightness for visibility (50-80%)
  const lightness = 50 + (Math.abs(hashCode(seed + index + "light")) % 30);

  return `hsla(${hue}, ${saturation}%, ${lightness}%, 1)`;
};

// Generate dynamic gradient based on project.id
const generateGradientStyle = (project: IVideoProject) => {
  // Strategic gradient positions for better visual appeal
  const positions = [
    "40% 20%",
    "80% 0%",
    "0% 50%",
    "80% 50%",
    "0% 100%",
    "80% 100%",
    "0% 0%",
  ];

  // Create gradient array
  const gradients = positions.map((position, i) => {
    const color = generateVibrantColor(project.id, i);
    return `radial-gradient(at ${position}, ${color} 0px, transparent 50%)`;
  });

  // Base color derived from first generated color but darker
  const baseColor = generateVibrantColor(project.id, 0);

  return {
    backgroundColor: baseColor,
    backgroundImage: gradients.join(", "),
    backgroundSize: "200% 200%",
    backgroundBlendMode: "normal",
  };
};

export default function VideoTile({ project }: VideoTileProps) {
  const { user } = useAuth();
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow hover:shadow-md transition-all">
      <div className="aspect-video bg-muted relative">
        {/* Dynamic gradient background */}
        {project.media && project.media.length > 0 && (
          <img
            src={project.media[0]}
            alt="Thumbnail"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {project.media && project.media.length === 0 && (
          <div
            className="absolute inset-0 w-full h-full"
            style={generateGradientStyle(project)}
          />
        )}

        {/* Format indicator */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs">
            {project.aspect_ratio}
          </Badge>
        </div>
        {project.is_public && (
          <div className="absolute bottom-2 left-2 flex gap-2">
            <Badge variant="outline" className="text-xs bg-background/80">
              <GlobeIcon className="w-4 h-4" />
            </Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold truncate">{project.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(project.updated_at), {
            addSuffix: true,
          })}
        </p>
        <div className="mt-2">
          <StatusBadge status={project.status} />
        </div>
        {user?.is_staff && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs bg-background/80">
              <UserIcon className="w-4 h-4" />
              {user.active_org == project.org ? "My Org" : project.org}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
