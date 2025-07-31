import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
import { ExternalLink } from "lucide-react";
import Loader from "@/components/shared/loader";
import { SuccessToast, ErrorToast } from "@/components/CustomToast";

interface WebLink {
  id: string;
  url: string;
  created_at: string;
  guide_count: number;
}

export default function Links() {
  const { id: collectionId } = useParams<{ id: string }>();
  const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
  const [webLinks, setWebLinks] = useState<WebLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWebLinks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/collections/${collectionId}/links/`,
        {
          method: "GET",
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch web links");
      }
      const data = await response.json();
      console.log("Web links data:", data);
      setWebLinks(data);
    } catch (error) {
      console.error("Error fetching web links:", error);
      toast.error(
        <ErrorToast message="Failed to fetch web links. Please try again." />,
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWebLinks();
  }, [collectionId]);

  const formatDate = (dateString: string) => {
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
    return date.toLocaleDateString(undefined, options);
  };

  return (
    <div className="flex container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Web Links for</CardTitle>
          <CardDescription>View weblinks for this collection.</CardDescription>
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
                  accessorKey: "url",
                  header: "URL",
                  cell: ({ row }) => (
                    <a
                      href={row.original.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {row.original.url}
                    </a>
                  ),
                },
                {
                  accessorKey: "guide_count",
                  header: "Guides",
                  cell: ({ row }) => row.original.guide_count,
                },
                {
                  accessorKey: "created_at",
                  header: "Created At",
                  cell: ({ row }) => formatDate(row.original.created_at),
                },
                {
                  id: "actions",
                  cell: ({ row }) => (
                    <Button
                      variant="outline"
                      onClick={() => window.open(row.original.url, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit
                    </Button>
                  ),
                },
              ]}
              data={webLinks}
              sortableColumns={["created_at", "guide_count"]}
              initialSorting={[{ id: "created_at", desc: true }]}
            />
          )}
          {!isLoading && webLinks.length === 0 && (
            <p className="text-center mt-4">
              No web links found for this collection.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
