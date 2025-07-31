import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorToast } from "@/components/CustomToast";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CodeRecipeOutput {
  id: number;
  run_id: number;
  status: "PENDING" | "RUNNING" | "COMPLETE" | "ERROR";
  code_recipe_version: number;
  created_at: string;
  updated_at?: string;
  is_valid: boolean;
  output?: {
    steps?: {
      name: string;
      type: string;
      status: string;
      error?: string;
      output?: string;
      file_loc?: string;
    }[];
    final_status?: string;
  };
  code_recipe: {
    id: number;
    title: string;
    language: string;
    guide: {
      id: number;
      name: string;
    };
  };
}

const RecentCodeRecipes = () => {
  const [recipeOutputs, setRecipeOutputs] = useState<CodeRecipeOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const baseUrl = `${window.location.protocol}//${window.location.host}/api`;

  const fetchRecentRecipeOutputs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/code-recipe-outputs/recent/`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch recent code recipe outputs");
      }

      const data = await response.json();
      setRecipeOutputs(data);
    } catch (error) {
      console.error("Error fetching recent code recipe outputs:", error);
      toast.error(
        <ErrorToast message="Failed to load recent code recipe outputs" />,
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentRecipeOutputs();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Code Recipes</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (recipeOutputs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Code Recipe Outputs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No code recipe outputs created in the last 2 hours
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Code Recipe Outputs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recipeOutputs.map((output) => (
            <div
              key={`${output.id}-${output.run_id}`}
              className="border-b pb-3 last:border-0"
            >
              <Link
                to={
                  output.code_recipe
                    ? `/code-recipes/${output.code_recipe.id}/`
                    : "#"
                }
                className="block hover:bg-muted p-2 rounded-md transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">
                      {output.code_recipe?.title || "Untitled Recipe"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Guide: {output.code_recipe?.guide?.name || "N/A"} •
                      Version: {output.code_recipe_version} • Run:{" "}
                      {output.run_id}
                    </p>
                    {output.output?.steps && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Steps:</span>{" "}
                          {output.output.steps.length} •
                          <span className="font-medium ml-2">
                            Final Status:
                          </span>{" "}
                          {output.output.final_status || "Unknown"} •
                          <span className="font-medium ml-2">Valid:</span>{" "}
                          {output.is_valid ? "Yes" : "No"}
                        </p>
                        <div className="mt-1 grid grid-cols-2 gap-1">
                          {output.output.steps.slice(0, 4).map((step, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-secondary/30 px-2 py-1 rounded"
                            >
                              {step.name} ({step.type})
                            </span>
                          ))}
                          {output.output.steps.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{output.output.steps.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          output.status === "COMPLETE"
                            ? "bg-green-100 text-green-800"
                            : output.status === "ERROR"
                              ? "bg-red-100 text-red-800"
                              : output.status === "RUNNING"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {output.status}
                      </span>
                      {output.code_recipe?.language && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded ml-2">
                          {output.code_recipe.language}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground">
                        Created: {new Date(output.created_at).toLocaleString()}
                      </span>
                      {output.updated_at && (
                        <span className="text-xs text-muted-foreground">
                          Updated:{" "}
                          {new Date(output.updated_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentCodeRecipes;
