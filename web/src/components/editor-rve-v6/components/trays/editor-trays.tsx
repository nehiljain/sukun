import { RightTray } from "@/components/shared/RightTray";
import { useTray } from "../../contexts/tray-context";
import { useEditorTrays } from "../../hooks/use-editor-trays";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";
import { Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/status-badge";
import { useEditorContext } from "../../contexts/editor-context";
import { ChatTray } from "./chat-tray";

export function EditorTrays() {
  const { activeTray, setActiveTray } = useTray();
  const { videoProjectId } = useEditorContext();
  const {
    renders,
    isLoadingRenders,
    selectedOrg,
    setSelectedOrg,
    isLoading,
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    isSavingTemplate,
    fetchRenders,
    handleDuplicate,
    handleSaveAsTemplate,
    user,
    videoProjectName,
  } = useEditorTrays();

  // Fetch renders when the renders tray is opened
  useEffect(() => {
    if (activeTray === "renders") {
      fetchRenders();
    }
  }, [activeTray, fetchRenders]);

  const columns = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => {
        const date = row.getValue("created_at");
        return (
          <div>{format(new Date(date as string), "MMM d, yyyy h:mm a")}</div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        return <StatusBadge status={row.getValue("status") as string} />;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const videoUrl = row.original.video_url;
        return (
          <div>
            {videoUrl ? (
              <div className="flex gap-2">
                <a
                  href={videoUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center text-sm font-medium hover:text-primary"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </a>
                <a
                  href={`/video-player/${row.original.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center text-sm font-medium hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </a>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">
                {row.original.status === "pending"
                  ? "Processing..."
                  : "Not available"}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* Chat Window Tray */}
      <RightTray
        isOpen={activeTray === "chat"}
        onClose={() => setActiveTray(null)}
        title="AI Assistant"
        subtitle="Ask questions or get help with your video"
      >
        <ChatTray projectId={videoProjectId} />
      </RightTray>

      {/* Past Renders Tray */}
      <RightTray
        isOpen={activeTray === "renders"}
        onClose={() => setActiveTray(null)}
        title="Past Renders"
        subtitle="View all previous renders for this project"
        isFullScreen
      >
        <div className="p-6">
          {isLoadingRenders ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : renders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No renders found for this project
            </div>
          ) : (
            <div className="w-full">
              <DataTable columns={columns} data={renders} />
            </div>
          )}
        </div>
      </RightTray>

      {/* Duplicate Project Tray */}
      <RightTray
        isOpen={activeTray === "duplicate"}
        onClose={() => setActiveTray(null)}
        title="Duplicate Project"
        subtitle="Choose an organization and workspace to copy this project to"
        actions={[
          {
            label: "Cancel",
            onClick: () => setActiveTray(null),
            variant: "outline",
          },
          {
            label: isLoading ? "Duplicating..." : "Duplicate",
            onClick: handleDuplicate,
            variant: "white",
            disabled: !selectedOrg || isLoading,
          },
        ]}
      >
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Organization</label>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger>
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {user?.organizations.map((org) => (
                  <SelectItem
                    key={org.organization_id}
                    value={org.organization_id}
                  >
                    {org.organization_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </RightTray>

      {/* Save as Template Tray */}
      <RightTray
        isOpen={activeTray === "template"}
        onClose={() => setActiveTray(null)}
        title="Save as Template"
        subtitle="Create a reusable template from this project"
        actions={[
          {
            label: "Cancel",
            onClick: () => setActiveTray(null),
            variant: "outline",
          },
          {
            label: isSavingTemplate ? "Saving..." : "Save as Template",
            onClick: handleSaveAsTemplate,
            variant: "white",
            disabled: isSavingTemplate || !templateName,
          },
        ]}
      >
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Template Name</label>
            <Input
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={`${videoProjectName} Template`}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="Enter template description"
              onChange={(e) => setTemplateDescription(e.target.value)}
            />
          </div>
        </div>
      </RightTray>
    </>
  );
}
