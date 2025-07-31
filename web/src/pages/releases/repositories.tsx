import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { ChartNoAxesGantt, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  LoadingToast,
  SuccessToast,
  ErrorToast,
} from "@/components/CustomToast";

interface Release {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
}

interface Repository {
  id: string;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  latest_release: Release | null;
}

export default function Repositories() {
  const [repositories, setRepositories] = useState<Repository[]>([]);

  const fetchRepositories = async (url: string) => {
    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      setRepositories(data);
      // setNextPage(data.next);
      // setPrevPage(data.previous);
    } catch (error) {
      console.error("Error fetching repositories:", error);
    }
  };

  const handleSyncAllRepos = async () => {
    const toastId = toast(
      <LoadingToast message="Syncing all repositories and releases..." />,
      {
        duration: Infinity,
      },
    );

    const baseUrl = `${window.location.protocol}//${window.location.host}/api/`;
    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(`${baseUrl}repositories/sync/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": csrfToken || "",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to sync repositories and releases",
        );
      }

      const data = await response.json();
      toast.success(
        <SuccessToast
          message={`${data.message} (${data.synced_repos}/${data.total_repos})`}
        />,
        {
          id: toastId,
          duration: 5000,
        },
      );
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(
        <ErrorToast
          message={`Failed to sync: ${
            error instanceof Error ? error.message : "Unknown error"
          }`}
        />,
        {
          id: toastId,
          duration: 5000,
        },
      );
    }
  };

  const sortRepositories = (key: keyof Repository) => {
    const sortedRepos = [...repositories].sort((a, b) => {
      if (a[key] === null || b[key] === null) {
        return 0; // Handle null values
      }
      return a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
    });
    setRepositories(sortedRepos);
  };

  useEffect(() => {
    fetchRepositories("/api/repositories/");
  }, []);

  return (
    <div className="flex container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Repositories</CardTitle>
          <CardDescription>
            List of repositories with their details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Filter repositories..."
              className="w-full p-2 border rounded"
              onChange={(e) => {
                const filterValue = e.target.value.toLowerCase();
                const filteredRepos = repositories.filter(
                  (repo) =>
                    repo.name.toLowerCase().includes(filterValue) ||
                    repo.description.toLowerCase().includes(filterValue),
                );
                setRepositories(filteredRepos);
              }}
            />
            <Button
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full mt-4"
              onClick={handleSyncAllRepos}
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Sync
            </Button>
          </div>
          <Table className="border-1 border-muted rounded-md">
            <TableHeader className="bg-background text-secondary">
              <TableRow>
                <TableHead onClick={() => sortRepositories("name")}>
                  Name
                </TableHead>
                <TableHead onClick={() => sortRepositories("description")}>
                  Description
                </TableHead>
                <TableHead onClick={() => sortRepositories("stargazers_count")}>
                  Stars
                </TableHead>
                <TableHead onClick={() => sortRepositories("forks_count")}>
                  Forks
                </TableHead>
                <TableHead onClick={() => sortRepositories("latest_release")}>
                  Latest Release
                </TableHead>
                <TableHead>Github</TableHead>
                <TableHead>Changelog</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repositories.map((repo) => (
                <TableRow key={repo.id}>
                  <TableCell>{repo.name}</TableCell>
                  <TableCell>{repo.description}</TableCell>
                  <TableCell>{repo.stargazers_count}</TableCell>
                  <TableCell>{repo.forks_count}</TableCell>
                  <TableCell>
                    {repo.latest_release ? (
                      <>
                        {repo.latest_release.tag_name}
                        <br />
                      </>
                    ) : (
                      "No releases"
                    )}
                  </TableCell>
                  <TableCell>
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline">View</Button>
                    </a>
                  </TableCell>
                  <TableCell>
                    <Link to={`/changelog?repo_name=${repo.name}`} className="">
                      <Button variant="outline">
                        <ChartNoAxesGantt className="w-4 h-4 mr-2" /> Changelog
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* <div className="flex justify-between mt-4">
                        <Button
                            onClick={() => prevPage && fetchRepositories(prevPage)}
                            disabled={!prevPage}
                        >
                            Previous
                        </Button>
                        <Button
                            onClick={() => nextPage && fetchRepositories(nextPage)}
                            disabled={!nextPage}
                        >
                            Next
                        </Button>
                    </div> */}
        </CardContent>
      </Card>
    </div>
  );
}
