import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import Loader from "@/components/shared/loader";
import { StatusIcon } from "@/components/ui/status-icon";
import { Button } from "@/components/ui/button";
import { FileText, Terminal, File } from "lucide-react";
import "asciinema-player/dist/bundle/asciinema-player.css";
import { RightTray } from "@/components/shared/RightTray";

interface Step {
  name: string;
  type: string;
  error: string;
  output: string;
  status: string;
  content: string | null;
  file_loc: string | null;
  shell_command: string | null;
  recording?: string;
  recording_url?: string;
}

interface CodeRecipeOutput {
  id: string;
  run_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  is_valid: boolean;
  output: {
    steps?: Step[];
    final_status?: string;
  };
}

interface CodeRecipe {
  id: string;
  title: string;
  description: string;
  language: string;
}

function AsciiPlayer({ recording }: { recording: string }) {
  // recording = recording.substring(recording.indexOf('{'));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    import("asciinema-player").then((AsciinemaPlayer) => {
      containerRef.current!.innerHTML = "";
      AsciinemaPlayer.create(recording, containerRef.current, {
        fit: "width",
        theme: "monokai",
        rows: 24,
        // autoPlay: true,
      });
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [recording]);

  return <div ref={containerRef} style={{ maxHeight: "300px" }} />;
}

export default function CodeRecipeDetail() {
  const { code_recipe_id } = useParams();
  const [recipe, setRecipe] = useState<CodeRecipe | null>(null);
  const [outputs, setOutputs] = useState<CodeRecipeOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<CodeRecipeOutput | null>(
    null,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipeResponse, outputsResponse] = await Promise.all([
          fetch(`/api/code-recipes/${code_recipe_id}/`),
          fetch(`/api/code-recipes/${code_recipe_id}/outputs/`),
        ]);

        if (!recipeResponse.ok || !outputsResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const [recipeData, outputsData] = await Promise.all([
          recipeResponse.json(),
          outputsResponse.json(),
        ]);

        setRecipe(recipeData);
        setOutputs(outputsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [code_recipe_id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

    const getStatusColor = (status: string) => {
      switch (status?.toUpperCase()) {
        case "COMPLETE":
          return "text-green-500";
        case "FAILED":
          return "text-red-500";
        case "RUNNING":
          return "text-blue-500";
        default:
          return "text-gray-500";
      }
    };

    return (
      <div className="grid gap-4 p-4 ">
        {steps.map((step, index) => (
          <Card key={index} className="bg-muted/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStepIcon(step)}
                  <CardTitle className="text-base font-medium">
                    Step {index + 1}: {step.name}
                  </CardTitle>
                </div>
                <span className={`font-medium ${getStatusColor(step.status)}`}>
                  {step.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-3">
                {step.recording_url && (
                  <div>
                    <strong>Recording:</strong>
                    <div className="mt-2" style={{ width: "300px" }}>
                      <AsciiPlayer recording={step.recording_url} />
                    </div>
                  </div>
                )}
                {step.content && (
                  <div
                    className="cursor-pointer"
                    onClick={() => toggleStepExpansion(index)}
                  >
                    <strong>Content:</strong>
                    <pre className="bg-muted px-2 py-1 rounded mt-1 overflow-x-scroll">
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
                  <div>
                    <strong>File:</strong> {step.file_loc}
                  </div>
                )}
                {step.shell_command && (
                  <div>
                    <strong>Command:</strong>
                    <code className="bg-muted px-2 py-1 rounded ml-2">
                      {step.shell_command}
                    </code>
                  </div>
                )}
                {step.output && (
                  <div>
                    <strong>stdout:</strong>
                    <pre className="bg-muted px-2 py-1 rounded mt-1 overflow-x-auto">
                      <code>{step.output}</code>
                    </pre>
                  </div>
                )}
                {step.error && (
                  <div>
                    <strong>stderr:</strong>
                    <pre className="bg-muted px-2 py-1 rounded mt-1 overflow-x-auto text-red-500">
                      <code>{step.error}</code>
                    </pre>
                  </div>
                )}
                {step.type && (
                  <div>
                    <strong>Type:</strong> {step.type}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="flex justify-center items-center h-40 text-red-500">
        {error || "Recipe not found"}
      </div>
    );
  }

  return (
    <div className="relative flex">
      <div className="flex-1 container mx-auto py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{recipe.title}</CardTitle>
            <CardDescription>
              Language: {recipe.language} | {recipe.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  accessorKey: "run_id",
                  header: "Run ID",
                },
                {
                  accessorKey: "status",
                  header: "Status",
                  cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                      <StatusIcon
                        success={row.original.status === "COMPLETE"}
                      />
                      <span>{row.original.status}</span>
                    </div>
                  ),
                },
                {
                  accessorKey: "output",
                  header: "Steps",
                  cell: ({ row }) => (
                    <span>
                      {row.original.output?.steps?.length || 0} steps
                      {row.original.output?.final_status &&
                        ` (${row.original.output.final_status})`}
                    </span>
                  ),
                },
                {
                  accessorKey: "created_at",
                  header: "Created At",
                  cell: ({ row }) => formatDate(row.original.created_at),
                },
                {
                  accessorKey: "updated_at",
                  header: "Updated At",
                  cell: ({ row }) => formatDate(row.original.updated_at),
                },
                {
                  accessorKey: "is_valid",
                  header: "Valid",
                  cell: ({ row }) => (
                    <StatusIcon success={row.original.is_valid} />
                  ),
                },
                {
                  id: "actions",
                  cell: ({ row }) => (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedOutput(row.original);
                        setSidebarOpen(true);
                      }}
                    >
                      Show Steps
                    </Button>
                  ),
                },
              ]}
              data={outputs}
              sortableColumns={["run_id", "created_at", "updated_at"]}
              initialSorting={[{ id: "created_at", desc: true }]}
            />
          </CardContent>
        </Card>
      </div>

      <RightTray
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={`Run ID: ${selectedOutput?.run_id}`}
        subtitle={`Status: ${selectedOutput?.status}`}
        isFullScreen={isFullScreen}
        onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
      >
        {selectedOutput?.output.steps &&
          renderSteps(selectedOutput.output.steps)}
      </RightTray>
    </div>
  );
}
