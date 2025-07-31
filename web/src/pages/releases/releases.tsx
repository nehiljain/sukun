import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast, Toaster } from "sonner";
import { PlusIcon, GitCompare, Sparkles, Link, Box, Book } from "lucide-react";
import Loader from "@/components/shared/loader";
import {
  SuccessToast,
  ErrorToast,
  LoadingToast,
} from "@/components/CustomToast";

export interface Release {
  id: string;
  repo_name: string;
  release_name: string;
  release_date: string;
  release_url: string;
}

export default function Releases() {
  const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
  const [repoUrl, setRepoUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isAddingRepo, setIsAddingRepo] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [semanticReleases, setSemanticReleases] = useState<{
    [key: string]: boolean;
  }>({});

  const fetchReleases = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/releases/`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch releases");
      }
      const data = await response.json();
      console.log("Releases data:", data); // Log the entire data received
      setReleases(data);

      // Fetch semantic release status for each release
      data.forEach((release: Release) => {
        fetchSemanticReleaseStatus(release.id);
      });
    } catch (error) {
      console.error("Error fetching releases:", error);
      toast.error(
        <ErrorToast message="Failed to fetch releases. Please try again." />,
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const validateAndAddRepo = async () => {
    const githubReleaseUrlRegex =
      /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/releases/;
    if (!githubReleaseUrlRegex.test(repoUrl)) {
      setUrlError("Please enter a valid GitHub release URL");
      return;
    }

    setUrlError("");
    setIsAddingRepo(true);
    const toastId = toast(
      <LoadingToast message="Adding new release. This may take a while..." />,
      {
        duration: Infinity,
      },
    );

    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(`${baseUrl}/releases/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        body: JSON.stringify({ release_url: repoUrl }),
      });

      if (!response.ok) throw new Error("Failed to add release");

      const data = await response.json();
      console.log("New release added:", data);

      toast.success(
        <SuccessToast message="New release added successfully!" />,
        {
          id: toastId,
          duration: 3000,
        },
      );

      setRepoUrl("");
      fetchReleases();
    } catch (error) {
      console.error(error);
      toast.error(
        <ErrorToast message="Failed to add release. Please try again." />,
        {
          id: toastId,
          duration: 3000,
        },
      );
    } finally {
      setIsAddingRepo(false);
    }
  };

  const handleCompare = (releaseId: string) => {
    console.log("handleCompare called with releaseId:", releaseId);
    window.location.href = `/comparison/${releaseId}`;
  };

  const fetchSemanticReleaseStatus = async (releaseId: string) => {
    try {
      const response = await fetch(`${baseUrl}/releases/${releaseId}/`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data.semantic_release) {
        setSemanticReleases((prev) => ({ ...prev, [releaseId]: true }));
      } else {
        setSemanticReleases((prev) => ({ ...prev, [releaseId]: false }));
      }
    } catch (error) {
      console.error(
        `Error fetching semantic release status for release ${releaseId}:`,
        error,
      );
      setSemanticReleases((prev) => ({ ...prev, [releaseId]: false }));
    }
  };

  const generateSemanticRelease = async (
    repoName: string,
    releaseName: string,
    releaseId: string,
  ) => {
    console.log(`Generating semantic release for ${repoName}:${releaseName}`);

    // Add a loading toast
    const toastId = toast(
      <LoadingToast message="Generating meaningful release notes. This may take a moment..." />,
      { duration: Infinity },
    );

    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(
        `${baseUrl}/releases/create-semantic-release/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRFToken": csrfToken || "",
          },
          body: JSON.stringify({
            repo_name: repoName,
            release_name: releaseName,
          }),
        },
      );

      if (response.ok) {
        console.log(
          `Semantic release generated for ${repoName}:${releaseName}`,
        );
        toast.success(
          <SuccessToast message="Semantic release generated successfully!" />,
          { id: toastId, duration: 3000 },
        );
        // Update the semantic release status
        setSemanticReleases((prev) => ({ ...prev, [releaseId]: true }));
      } else {
        throw new Error("Failed to generate semantic release");
      }
    } catch (error) {
      console.error(
        `Error generating semantic release for ${repoName}:${releaseName}:`,
        error,
      );
      toast.error(
        <ErrorToast message="Failed to generate semantic release. Please try again." />,
        { id: toastId, duration: 3000 },
      );
    }
  };

  const formatDate = (dateString: string) => {
    console.log(`Formatting date: ${dateString}`);
    if (!dateString) return "N/A"; // Handle missing date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error(`Invalid date format for: ${dateString}`); // Log invalid date
      return "Invalid Date"; // Handle invalid date
    }

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short", // Use short month format
      day: "numeric",
    };
    const formattedDate = date.toLocaleDateString(undefined, options);
    console.log(`Formatted date for ${dateString}: ${formattedDate}`); // Log formatted date
    return formattedDate;
  };

  return (
    <div className="flex container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Releases</CardTitle>
          <CardDescription>Manage your GitHub releases.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex space-x-4 mb-4">
              <Input
                type="text"
                placeholder="Enter GitHub release URL"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="flex-grow"
                disabled={isAddingRepo}
              />
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={validateAndAddRepo}
                disabled={isAddingRepo}
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New Release
              </Button>
            </div>
            {urlError && <p className="text-red-500 mt-2">{urlError}</p>}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader />
            </div>
          ) : (
            <Table className="border-1 border-muted rounded-md">
              <TableHeader className="bg-background text-secondary">
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Release</TableHead>
                  <TableHead>Published At</TableHead>
                  <TableHead>Github</TableHead>
                  <TableHead>Compare</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell>{release.repo_name}</TableCell>
                    <TableCell>{release.release_name}</TableCell>
                    <TableCell>
                      {release.release_date
                        ? formatDate(release.release_date)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={release.release_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline">View</Button>
                      </a>
                    </TableCell>
                    <TableCell>
                      {semanticReleases[release.id] ? (
                        <Button
                          variant="outline"
                          onClick={() => handleCompare(release.id)}
                        >
                          <GitCompare className="w-4 h-4 mr-2" />
                          Compare
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() =>
                            generateSemanticRelease(
                              release.repo_name,
                              release.release_name,
                              release.id,
                            )
                          }
                          title="Generate Semantic Release"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && releases.length === 0 && (
            <p className="text-center mt-4">
              No releases found. Add a new release or sync repositories to get
              started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
