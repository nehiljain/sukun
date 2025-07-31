import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusIcon } from "@/components/ui/status-icon";
import Loader from "@/components/shared/loader";
import { FileText, Terminal, File, PlayCircle } from "lucide-react";
import { RightTray, RightTrayAction } from "@/components/shared/RightTray";

interface CodeRecipe {
  id: string;
  title: string;
  description: string;
  published_at: string;
  language: string;
  guide: {
    id: number;
    title: string;
  };
  run_id: number;
  is_active: boolean;
  recipe: Recipe;
  recipe_version: number;
}

interface Recipe {
  links: string[];
  steps: Step[];
  $schema?: string;
  version?: string;
  unique_id?: string;
}

interface Step {
  name: string;
  type: string;
  content?: string;
  file_loc?: string;
  shell_command?: string;
  output?: string;
}

export default function CodeRecipes() {
  const [recipes, setRecipes] = useState<CodeRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<CodeRecipe | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState<string>("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch("/api/code-recipes/", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch code recipes");
        }
        const data = await response.json();
        setRecipes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const toggleStepExpansion = (index: number) => {
    setExpandedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const renderSteps = (steps: Step[]) => {
    const getStepIcon = (step: Step) => {
      if (step.content) return <FileText className="h-5 w-5" />;
      if (step.shell_command) return <Terminal className="h-5 w-5" />;
      if (step.file_loc) return <File className="h-5 w-5" />;
      return null;
    };

    return (
      <div className="grid gap-4 p-4">
        {steps.map((step, index) => (
          <Card key={index} className="bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                {getStepIcon(step)}
                <CardTitle className="text-base font-medium">
                  Step {index + 1}: {step.name}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {step.content && (
                  <div
                    className="mb-2 cursor-pointer"
                    onClick={() => toggleStepExpansion(index)}
                  >
                    <strong>Content:</strong>
                    <pre className="bg-muted px-2 py-1 rounded mt-1 overflow-x-auto">
                      <code>
                        {expandedSteps.includes(index)
                          ? step.content
                          : step.content.slice(0, 50) +
                            (step.content.length > 50 ? "..." : "")}
                      </code>
                    </pre>
                  </div>
                )}
                {step.file_loc && (
                  <div className="mb-2">
                    <strong>File:</strong> {step.file_loc}
                  </div>
                )}
                {step.shell_command && (
                  <div className="mb-2">
                    <strong>Command:</strong>
                    <code className="bg-muted px-2 py-1 rounded">
                      {step.shell_command}
                    </code>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const handleRecipeEdit = async () => {
    try {
      console.log(editedRecipe);
      const response = await fetch(
        `/api/code-recipes/${selectedRecipe?.id}/update_recipe/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
          },
          credentials: "include",
          body: JSON.stringify({
            recipe: JSON.parse(editedRecipe),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update recipe");
      }

      const updatedRecipe = await response.json();
      setSelectedRecipe(updatedRecipe);
      setIsEditing(false);

      // Refresh the recipes list
      fetchRecipes();
    } catch (error) {
      console.error("Error updating recipe:", error);
    }
  };

  const trayActions = isEditing
    ? [
        {
          label: "Cancel",
          onClick: () => setIsEditing(false),
        },
        {
          label: "Save",
          onClick: handleRecipeEdit,
          variant: "primary" as const,
        },
      ]
    : [
        {
          label: "Edit",
          onClick: () => {
            setEditedRecipe(JSON.stringify(selectedRecipe?.recipe, null, 2));
            setIsEditing(true);
          },
          variant: "primary" as const,
        },
      ];

  return (
    <div className="relative flex">
      <div className="flex-1 container mx-auto py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Code Recipes</CardTitle>
            <CardDescription>View and manage your code recipes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader />
              </div>
            ) : (
              <DataTable
                columns={[
                  {
                    accessorKey: "title",
                    header: "Title",
                  },
                  {
                    accessorKey: "id",
                    header: "Recipe ID",
                  },
                  {
                    accessorKey: "language",
                    header: "Language",
                  },
                  {
                    accessorKey: "guide",
                    header: "Guide",
                    cell: ({ row }) => (
                      <a
                        href={`/guides/${row.original.guide.id}`}
                        className="text-primary hover:underline"
                      >
                        {row.original.guide.title}
                      </a>
                    ),
                  },
                  {
                    accessorKey: "description",
                    header: "Description",
                  },
                  {
                    accessorKey: "published_at",
                    header: "Published At",
                    cell: ({ row }) => formatDate(row.original.published_at),
                  },
                  {
                    accessorKey: "is_active",
                    header: "Status",
                    cell: ({ row }) => (
                      <StatusIcon success={row.original.is_active} />
                    ),
                  },
                  {
                    id: "actions",
                    cell: ({ row }) => (
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            navigate(`/code-recipes/${row.original.id}`)
                          }
                        >
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Runs
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSelectedRecipe(row.original);
                            setSidebarOpen(true);
                          }}
                        >
                          View
                        </Button>
                      </div>
                    ),
                  },
                ]}
                data={recipes}
                sortableColumns={["title", "language", "published_at"]}
                filterableColumns={["language"]}
                initialSorting={[{ id: "published_at", desc: true }]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <RightTray
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={selectedRecipe?.title || ""}
        subtitle={`Version: ${selectedRecipe?.recipe_version}`}
        actions={trayActions as RightTrayAction[]}
        isFullScreen={isFullScreen}
        onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
      >
        {isEditing ? (
          <div className="p-4">
            <textarea
              className="w-full h-[500px] font-mono text-sm p-2 border rounded"
              value={editedRecipe}
              onChange={(e) => setEditedRecipe(e.target.value)}
            />
          </div>
        ) : (
          selectedRecipe && renderSteps(selectedRecipe.recipe.steps)
        )}
      </RightTray>
    </div>
  );
}
