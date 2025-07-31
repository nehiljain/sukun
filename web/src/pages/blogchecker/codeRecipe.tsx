import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ui/code-block";
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
import { TreeView } from "@/components/TreeView";
import { StatusIcon } from "@/components/ui/status-icon";
import { Action, GuideCodeRecipe } from "@/types/blogChecker";

export function CodeRecipeCard(recipe: GuideCodeRecipe) {
  async function rerunCodeRecipe(id: string) {
    const toastId = toast(<LoadingToast message="Rerunning code recipe..." />, {
      duration: Infinity,
    });

    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];

      const response = await fetch(
        `/api/guides/${recipe.guide}/code-recipes/${id}/`,
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
      // You might want to update the UI or state here
    } catch (error) {
      console.error("Error rerunning code recipe:", error);
      toast.error(
        <ErrorToast
          message={`Failed to rerun code recipe: ${error instanceof Error ? error.message : "Unknown error"}`}
        />,
        { id: toastId, duration: 5000 },
      );
    }
  }
  if (!recipe) {
    return <div>No data available</div>;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={() => {
            rerunCodeRecipe(recipe.id);
          }}
        >
          Run
        </Button>
      </div>
      {recipe.actions.map((action) => (
        <CodeActionCard key={action.entrypoint} action={action} />
      ))}
    </div>
  );
}

function CodeActionCard({ action }: { action: Action }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row justify-between">
        <div className="flex justify-between items-center">
          <CardTitle>Action : {action.entrypoint}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="stderr">stderr</TabsTrigger>
            <TabsTrigger value="stdout">stdout</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>Run Id:</div>
              <div>{action.latest_run_output?.run_id}</div>
              <div>Code Interpreter:</div>
              <div>
                <CodeBlock
                  content={`e2b sandbox cn ${action.latest_run_output?.code_interpreter_hostname.split(".e2b.dev")[0]}`}
                />
              </div>
              <div>Success:</div>
              <div>
                <StatusIcon success={!action.latest_run_output?.exit_code} />
              </div>
              <div>Exit Code:</div>
              <div>{action.latest_run_output?.exit_code}</div>
              <div>Entrypoint:</div>
              <div>{action.entrypoint}</div>
            </div>
          </TabsContent>
          <TabsContent value="code" className="flex">
            <div className="pr-4 border-r">
              <TreeView
                data={action.code_content.map((file) => ({
                  id: file.filepath,
                  name: file.filepath,
                  onClick: () => setSelectedFile(file.filepath),
                }))}
                className="w-full"
              />
            </div>
            <div className="pl-4">
              {selectedFile && (
                <CodeBlock
                  content={
                    action.code_content.find(
                      (file) => file.filepath === selectedFile,
                    )?.content || ""
                  }
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="stderr">
            <pre className="whitespace-pre-wrap text-sm">
              {action.latest_run_output?.stderr}
            </pre>
          </TabsContent>
          <TabsContent value="stdout">
            <pre className="whitespace-pre-wrap text-sm">
              {action.latest_run_output?.stdout}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function CodeRecipe() {
  const [guideCodeRecipe, setGuideCodeRecipe] =
    useState<GuideCodeRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();

  console.log("BlogEntry rendered, params:", params);

  useEffect(() => {
    const fetchGuideData = async () => {
      setLoading(true);
      setError(null);
      console.log("Fetching guide data for id:", params.id);
      try {
        const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
        console.log("Base URL:", baseUrl);

        const guideResponse = await fetch(
          `${baseUrl}/guides/${params.id}/code-recipes/${params.recipe_id}/`,
          {
            method: "GET",
            credentials: "include",
          },
        );
        console.log("Guide response status:", guideResponse.status);
        if (!guideResponse.ok) {
          throw new Error("Failed to fetch guide data");
        }
        const guideData = await guideResponse.json();
        console.log("Guide data:", guideData);
        setGuideCodeRecipe(guideData);
      } catch (error) {
        console.error("Error fetching guide data:", error);
        setError("Failed to fetch guide data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchGuideData();
  }, [params.id]);

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
    return <div className="flex container mx-auto py-10"></div>;
  }

  if (!guideCodeRecipe) {
    console.log("No guide or analyzed guide data");
    return (
      <div className="flex container mx-auto py-10">
        <Card className="flex-grow">
          <CardContent>
            <p>No blog data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex container mx-auto py-10">
      <Card className="flex-grow">
        <div className="flex justify-between">
          <div className="flex justify-start">
            <CardHeader>
              <CardTitle>{guideCodeRecipe.title}</CardTitle>
              <CardDescription></CardDescription>
            </CardHeader>
          </div>
          <div className="flex justify-end mt-2"></div>
        </div>
        <CodeRecipeCard {...guideCodeRecipe} />
      </Card>
    </div>
  );
}
