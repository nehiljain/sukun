import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { toast } from "sonner";
import { GitCompare, Sparkles } from "lucide-react";
import Loader from "@/components/shared/loader";
import {
  SuccessToast,
  ErrorToast,
  LoadingToast,
} from "@/components/CustomToast";
import { StatusIcon } from "@/components/ui/status-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface Guide {
  id: string;
  title: string;
  author: string;
  created_at: string;
  is_analyzed: boolean;
  is_valid: boolean;
  collection: string;
  name: string;
  weblinks: string[];
}

export default function Guides() {
  const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
  const [guides, setGuides] = useState<Guide[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedGuides, setAnalyzedGuides] = useState<{
    [key: string]: boolean;
  }>({});

  const fetchGuides = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/guides/`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch guides");
      }
      const data = await response.json();
      console.log("Guides data:", data);
      setGuides(data);

      // Fetch analysis status for each guide
      data.forEach((guide: Guide) => {
        fetchAnalysisStatus(guide.id);
      });
    } catch (error) {
      console.error("Error fetching guides:", error);
      toast.error(
        <ErrorToast message="Failed to fetch guides. Please try again." />,
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  const viewResults = (guideId: string) => {
    console.log("viewResults called with guideId:", guideId);
    window.location.href = `/guides/${guideId}`;
  };

  const fetchAnalysisStatus = async (guideId: string) => {
    try {
      const response = await fetch(`${baseUrl}/guides/${guideId}/`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data.analyzed) {
        setAnalyzedGuides((prev) => ({ ...prev, [guideId]: true }));
      } else {
        setAnalyzedGuides((prev) => ({ ...prev, [guideId]: false }));
      }
    } catch (error) {
      console.error(
        `Error fetching analysis status for guide ${guideId}:`,
        error,
      );
      setAnalyzedGuides((prev) => ({ ...prev, [guideId]: false }));
    }
  };

  const analyzeGuide = async (guideId: string, name: string) => {
    console.log(`Analyzing guide: ${name}`);

    const toastId = toast(
      <LoadingToast message="Analyzing guide. This may take a moment..." />,
      { duration: Infinity },
    );

    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(`${baseUrl}/guides/analyze/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        body: JSON.stringify({
          guideId: guideId,
          name: name,
        }),
      });

      if (response.ok) {
        console.log(`Guide analyzed: ${name} `);
        toast.success(<SuccessToast message="Guide analyzed successfully!" />, {
          id: toastId,
          duration: 3000,
        });
        setAnalyzedGuides((prev) => ({ ...prev, [guideId]: true }));
      } else {
        throw new Error("Failed to analyze guide");
      }
    } catch (error) {
      console.error(`Error analyzing guide ${name}:`, error);
      toast.error(
        <ErrorToast message="Failed to analyze guide. Please try again." />,
        { id: toastId, duration: 3000 },
      );
    }
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

  return (
    <div className="flex container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Guides</CardTitle>
          <CardDescription>Manage and analyze guides.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader />
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  accessorKey: "name",
                  header: "Name",
                  cell: ({ row }) => (
                    <div onClick={() => viewResults(row.original.id)}>
                      {row.original.name}
                    </div>
                  ),
                },
                {
                  accessorKey: "created_at",
                  header: "Created At",
                  cell: ({ row }) => (
                    <div onClick={() => viewResults(row.original.id)}>
                      {formatDate(row.original.created_at) || "N/A"}
                    </div>
                  ),
                },
                {
                  accessorKey: "weblinks",
                  header: "Links",
                  cell: ({ row }) => {
                    const [isDialogOpen, setIsDialogOpen] = useState(false);
                    console.log("selvam", row.original);
                    return (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          View Links
                        </Button>
                        {isDialogOpen && (
                          <Dialog
                            open={isDialogOpen}
                            onOpenChange={setIsDialogOpen}
                          >
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Weblinks for {row.original.name}
                                </DialogTitle>
                              </DialogHeader>
                              <ul className="list-disc pl-5">
                                {row.original.weblinks.map((link, index) => (
                                  <li key={index} className="mb-2">
                                    <a
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline"
                                    >
                                      {link}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </DialogContent>
                          </Dialog>
                        )}
                      </>
                    );
                  },
                },
                {
                  accessorKey: "is_valid",
                  header: "Valid",
                  cell: ({ row }) => (
                    <StatusIcon success={row.original.is_valid} />
                  ),
                },
                {
                  accessorKey: "is_analyzed",
                  header: "Analyze",
                  cell: ({ row }) =>
                    row.original.is_analyzed ? (
                      <Button
                        variant="outline"
                        onClick={() => viewResults(row.original.id)}
                      >
                        <GitCompare className="w-4 h-4 mr-2" />
                        Results
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() =>
                          analyzeGuide(row.original.id, row.original.name)
                        }
                        title="Analyze Guide"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    ),
                },
                {
                  accessorKey: "collection",
                  header: "Collection",
                  filterFn: "includesString",
                },
              ]}
              data={guides}
              filterableColumns={["collection"]}
              sortableColumns={["collection", "created_at", "name"]}
              initialSorting={[{ id: "created_at", desc: true }]}
            />
          )}
          {!isLoading && guides.length === 0 && (
            <p className="text-center mt-4">
              No guides found. Click Generate Guide against a collection to get
              started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
