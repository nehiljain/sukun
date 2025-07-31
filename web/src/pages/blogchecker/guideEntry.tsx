import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { Loader2, GitCompare } from "lucide-react";
import { toast } from "sonner";
import {
  SuccessToast,
  ErrorToast,
  LoadingToast,
} from "@/components/CustomToast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusIcon } from "@/components/ui/status-icon";
import { Guide } from "@/types/blogChecker";

export default function GuideCodeRecipes() {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();

  const fetchGuideData = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
      const guideResponse = await fetch(`${baseUrl}/guides/${params.id}/`, {
        method: "GET",
        credentials: "include",
      });
      if (!guideResponse.ok) {
        throw new Error("Failed to fetch guide data");
      }
      const guideData = await guideResponse.json();
      setGuide(guideData);
    } catch (error) {
      console.error("Error fetching guide data:", error);
      setError("Failed to fetch guide data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchGuideData();
  }, [params.id]);

  const rerunCodeRecipe = async (id: string) => {
    const toastId = toast(<LoadingToast message="Rerunning code recipe..." />, {
      duration: Infinity,
    });

    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];

      const response = await fetch(
        `/api/guides/${guide?.id}/code-recipes/${id}/`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRFToken": csrfToken || "",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to rerun code recipe");
      }

      const data = await response.json();
      console.log("Rerun successful:", data);
      toast.success(<SuccessToast message="Code recipe rerun successfully" />, {
        id: toastId,
        duration: 5000,
      });
      // Refresh guide data after rerun
      fetchGuideData();
    } catch (error) {
      console.error("Error rerunning code recipe:", error);
      toast.error(
        <ErrorToast
          message={`Failed to rerun code recipe: ${error instanceof Error ? error.message : "Unknown error"}`}
        />,
        { id: toastId, duration: 5000 },
      );
    }
  };

  const viewResults = (guideId: string) => {
    console.log("viewResults called with guideId:", guideId);
    window.location.href = `/guides/${guide?.id}/code-recipes/${guideId}`;
  };

  const formatDate = (dateString: string) => {
    console.log(`Formatting date: ${dateString}`);
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error(`Invalid date format for: ${dateString}`);
      return "Invalid Date";
    }

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    const formattedDate = date.toLocaleDateString(undefined, options);
    console.log(`Formatted date for ${dateString}: ${formattedDate}`);
    return formattedDate;
  };
  if (loading) {
    return (
      <div className="flex container mx-auto py-10">
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="flex container mx-auto py-10">{error}</div>;
  }

  if (!guide) {
    return (
      <div className="flex container mx-auto py-10">
        <Card className="flex-grow">
          <CardContent>
            <p>No guide data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Guide Code Recipes</CardTitle>
          <CardDescription>
            Guide Name: {guide.name}
            <br />
            Created: {new Date(guide.created_at).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                accessorKey: "title",
                header: "Title",
                cell: ({ row }) => (
                  <div onClick={() => viewResults(row.original.id)}>
                    {row.original.title}
                  </div>
                ),
              },
              {
                accessorKey: "language",
                header: "Language",
                cell: ({ row }) => (
                  <div onClick={() => viewResults(row.original.id)}>
                    {row.original.language}
                  </div>
                ),
              },
              {
                accessorKey: "description",
                header: "Description",
                cell: ({ row }) => (
                  <div onClick={() => viewResults(row.original.id)}>
                    {row.original.description}
                  </div>
                ),
              },
              {
                accessorKey: "published_at",
                header: "Published At",
                cell: ({ row }) => (
                  <div onClick={() => viewResults(row.original.id)}>
                    {formatDate(row.original.published_at) || "N/A"}
                  </div>
                ),
              },
              {
                accessorKey: "latest_run_output.error",
                header: "Status",
                cell: ({ row }) => (
                  <StatusIcon
                    success={!row.original.actions[0].latest_run_output?.error}
                  />
                ),
              },
              {
                id: "actions",
                cell: ({ row }) => (
                  <Button
                    variant="outline"
                    onClick={() => rerunCodeRecipe(row.original.id)}
                  >
                    <GitCompare className="w-4 h-4 mr-2" />
                    Rerun
                  </Button>
                ),
              },
            ]}
            data={guide.guide_code_recipes}
            sortableColumns={["title", "language"]}
            initialSorting={[{ id: "title", desc: false }]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
