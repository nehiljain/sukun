import { useState, useCallback } from "react";
import { useEditorContext } from "../contexts/editor-context";
import { useAuth } from "@/contexts/AuthContext";
import { useCSRFToken } from "@/hooks/use-csrf-token";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { IMediaFile } from "@/types/video-gen";

// Status badge component to show render status with appropriate color
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = () => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "generated":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "accepted":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "changes_requested":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
};

export function useEditorTrays() {
  const { videoProjectId, videoProjectName } = useEditorContext();
  const { user, getActiveOrganization, setActiveOrganization } = useAuth();
  const navigate = useNavigate();
  const csrfToken = useCSRFToken();

  // State management
  const [renders, setRenders] = useState<any[]>([]);
  const [isLoadingRenders, setIsLoadingRenders] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateTags, setTemplateTags] = useState<string[]>([]);
  const [templateMetadata, setTemplateMetadata] = useState<any>({});
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Fetch renders
  const fetchRenders = useCallback(async () => {
    if (!videoProjectId) return;

    setIsLoadingRenders(true);
    try {
      const response = await fetch(
        `/api/render-videos/?video_project_id=${videoProjectId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch renders");

      const data = await response.json();
      setRenders(data);
    } catch (error) {
      console.error("Error fetching renders:", error);
    } finally {
      setIsLoadingRenders(false);
    }
  }, [videoProjectId, csrfToken]);

  // Handle duplicate
  const handleDuplicate = useCallback(async () => {
    if (!getActiveOrganization()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/video-projects/${videoProjectId}/duplicate/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({
            organization_id: selectedOrg,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to duplicate project");

      const data = await response.json();
      const newOrg = user?.organizations.find(
        (org) => org.organization_id === selectedOrg,
      );
      if (newOrg) {
        setActiveOrganization(newOrg);
      }
      navigate(`/video-projects/${data.id}/editor`);
    } catch (error) {
      console.error("Error duplicating project:", error);
      toast.error("Failed to duplicate project");
    } finally {
      setIsLoading(false);
    }
  }, [videoProjectId, selectedOrg, csrfToken, user, navigate]);

  // Handle save template
  const handleSaveAsTemplate = useCallback(async () => {
    setIsSavingTemplate(true);
    try {
      const response = await fetch(`/api/templates/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          video_project_id: videoProjectId,
          name: templateName,
          description: templateDescription || "",
          workspace: getActiveOrganization()?.workspace_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save template");
      }

      toast.success("Template created successfully");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  }, [videoProjectId, templateName, templateDescription, csrfToken]);

  // DataTable columns
  const columns: ColumnDef<any>[] = [
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
    // ... rest of your columns
  ];

  return {
    // State
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

    // Actions
    fetchRenders,
    handleDuplicate,
    handleSaveAsTemplate,

    // Data
    columns,
    user,
    videoProjectName,
  };
}
