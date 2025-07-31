import { RightTray, RightTrayAction } from "@/components/shared/RightTray";
import { Badge } from "@/components/ui/badge";
import { IVideoProject } from "@/types/video-gen";
import { useNavigate } from "react-router-dom";
import { ImagePlay, Music2 } from "lucide-react";

interface TemplateDetailsTrayProps {
  template: IVideoProject | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateDetailsTray({
  template,
  isOpen,
  onClose,
}: TemplateDetailsTrayProps) {
  const navigate = useNavigate();

  if (!template) return null;

  const handleCreateWithAI = () => {
    navigate(`/templates/${template.id}/use`);
  };

  const actions: RightTrayAction[] = [
    {
      label: "Create with AI",
      onClick: handleCreateWithAI,
      variant: "primary",
    },
  ];

  return (
    <RightTray
      isOpen={isOpen}
      onClose={onClose}
      title={template.name}
      subtitle="Template Details"
      actions={actions}
    >
      <div className="p-6 space-y-6">
        {/* Preview Image/Video */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          {template.preview_url ? (
            <div className="aspect-video w-full rounded-lg overflow-hidden mb-4">
              <video
                src={template.preview_url}
                className="w-full h-full"
                controls
                playsInline
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-muted-foreground">
                No preview available
              </span>
            </div>
          )}
        </div>

        {/* Tags/Categories */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Categories
          </h3>
          <div className="flex flex-wrap gap-2">
            {template.aspect_ratio && (
              <Badge variant="secondary">{template.aspect_ratio}</Badge>
            )}
            <Badge variant="secondary">Real Estate</Badge>
            <Badge variant="secondary">Shorts</Badge>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Description
          </h3>
          <p className="text-sm text-foreground">
            {template.description ||
              "Use this presenter template with bullet points to quickly and effectively introduce yourself. It features an intro, title and subhead, key points, and a closing slide with contact details, all guided by an AI avatar."}
          </p>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Input Requirements
          </h3>
          <p className="text-sm flex gap-2 text-foreground">
            {template.metadata?.template_metadata?.images
              ? `${template.metadata?.template_metadata?.images}  `
              : "0"}
            <ImagePlay className="w-4 h-4" />
          </p>
          <span className="text-sm flex gap-2 text-foreground">
            {template.metadata?.template_metadata?.tracks
              ? `${template.metadata?.template_metadata?.tracks}`
              : "0"}
            <Music2 className="w-4 h-4" />
          </span>
        </div>

        {/* Additional Details */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Features
          </h3>
          <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
            {template.metadata?.template_metadata?.features?.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      </div>
    </RightTray>
  );
}
