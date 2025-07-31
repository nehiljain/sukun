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
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import Loader from "@/components/shared/loader";
import {
  SuccessToast,
  ErrorToast,
  LoadingToast,
} from "@/components/CustomToast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatusIcon } from "@/components/ui/status-icon";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";

export interface Collection {
  id: string;
  name: string;
  url: string;
  total_weblinks: number;
  guide_count: number;
  created_at: string;
  updated_at: string;
  manifest: string;
}

export default function Collections() {
  const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionUrl, setNewCollectionUrl] = useState("");
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [manifest, setManifest] = useState("");
  const { hasPermission } = useAuth();

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/collections/`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch collections");
      }
      const data = await response.json();
      console.log(data);
      for (const collection of data) {
        collection.manifest = JSON.stringify(collection.manifest);
      }
      setCollections(data);
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast.error(
        <ErrorToast message="Failed to fetch collections. Please try again." />,
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleAddCollection = async () => {
    if (!newCollectionName.trim() || !newCollectionUrl.trim()) {
      toast.error(<ErrorToast message="Collection name/URL is required." />);
      return;
    }

    const toastId = toast(<LoadingToast message="Adding new collection..." />, {
      duration: Infinity,
    });

    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(`${baseUrl}/collections/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        body: JSON.stringify({
          name: newCollectionName,
          url: newCollectionUrl,
        }),
      });

      if (!response.ok) throw new Error("Failed to add collection");

      toast.success(
        <SuccessToast message="New collection added successfully!" />,
        { id: toastId, duration: 3000 },
      );

      setNewCollectionName("");
      setNewCollectionUrl("");
      fetchCollections();
    } catch (error) {
      console.error(error);
      toast.error(
        <ErrorToast message="Failed to add collection. Please try again." />,
        { id: toastId, duration: 3000 },
      );
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteCollection = async () => {
    if (!selectedCollectionId) return;

    const toastId = toast(<LoadingToast message="Deleting collection..." />, {
      duration: Infinity,
    });

    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(
        `${baseUrl}/collections/${selectedCollectionId}/`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRFToken": csrfToken || "",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to delete collection");

      toast.success(
        <SuccessToast message="Collection deleted successfully!" />,
        { id: toastId, duration: 3000 },
      );

      setIsDeleteModalOpen(false);
      fetchCollections();
    } catch (error) {
      console.error(error);
      toast.error(
        <ErrorToast message="Failed to delete collection. Please try again." />,
        { id: toastId, duration: 3000 },
      );
    }
  };

  const handleCrawlUrl = async (collectionId: string) => {
    const toastId = toast(<LoadingToast message="Crawling URL..." />, {
      duration: Infinity,
    });

    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(
        `${baseUrl}/collections/${collectionId}/crawl/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRFToken": csrfToken || "",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to crawl URL");

      toast.success(<SuccessToast message="URL crawled successfully!" />, {
        id: toastId,
        duration: 3000,
      });

      fetchCollections();
    } catch (error) {
      console.error(error);
      toast.error(
        <ErrorToast message="Failed to crawl URL. Please try again." />,
        { id: toastId, duration: 3000 },
      );
    }
  };

  const handleOpenManifestModal = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (collection) {
      setSelectedCollectionId(collectionId);
      setManifest(collection.manifest || "");
      setIsManifestModalOpen(true);
    }
  };

  const handleSaveManifest = async () => {
    if (!selectedCollectionId) return;

    const toastId = toast(<LoadingToast message="Updating manifest..." />, {
      duration: Infinity,
    });

    try {
      const _manifest = { manifest: JSON.parse(manifest) };
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(
        `${baseUrl}/collections/${selectedCollectionId}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken || "",
          },
          body: JSON.stringify(_manifest),
        },
      );

      if (!response.ok) throw new Error("Failed to update manifest");

      toast.success(<SuccessToast message="Manifest updated successfully!" />, {
        id: toastId,
        duration: 3000,
      });

      setIsManifestModalOpen(false);
      fetchCollections();
    } catch (error) {
      console.error(error);
      toast.error(
        <ErrorToast message="Failed to update manifest. Please try again." />,
        { id: toastId, duration: 3000 },
      );
    }
  };

  const handleGenerateGuides = async (collectionId: string) => {
    console.log(`Generating guides for collection: ${collectionId}`);

    const toastId = toast(<LoadingToast message="Generating guides..." />, {
      duration: Infinity,
    });

    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(
        `${baseUrl}/collections/${collectionId}/generate-guides/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken || "",
          },
        },
      );

      if (response.status === 200) {
        toast.success(
          <SuccessToast message="Guides generated successfully!" />,
          {
            id: toastId,
            duration: 3000,
          },
        );
        // You might want to refresh the collection data here
        // fetchCollections();
      } else {
        throw new Error("Failed to generate guides");
      }
    } catch (error) {
      console.error("Error generating blogs:", error);
      toast.error(
        <ErrorToast message="Failed to generate guides. Please try again." />,
        { id: toastId, duration: 3000 },
      );
    }
  };

  const columns: ColumnDef<Collection>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => (
        <div
          className="cursor-pointer hover:underline"
          onClick={() =>
            (window.location.href = `/collections/${row.original.id}/links`)
          }
        >
          {row.original.url}
        </div>
      ),
    },
    {
      accessorKey: "total_weblinks",
      header: "Web Links",
    },
    {
      accessorKey: "guide_count",
      header: "Guides",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: () => <StatusIcon success={false} />,
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const collection = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleOpenManifestModal(collection.id)}
              >
                Edit manifest
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteCollection(collection.id)}
              >
                Delete collection
              </DropdownMenuItem>
              {hasPermission("blogchecker.can_generate_guides") && (
                <DropdownMenuItem
                  onClick={() => handleGenerateGuides(collection.id)}
                >
                  Generate guides
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="flex container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Collections</CardTitle>
          <CardDescription>Manage your collections.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex space-x-4 mb-4">
              <Input
                type="text"
                placeholder="Collection Name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="flex-grow"
              />
              <Input
                type="text"
                placeholder="URL"
                value={newCollectionUrl}
                onChange={(e) => setNewCollectionUrl(e.target.value)}
                className="flex-grow"
              />
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleAddCollection}
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Collection
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader />
            </div>
          ) : (
            <DataTable columns={columns} data={collections} />
          )}
          {!isLoading && collections.length === 0 && (
            <p className="text-center mt-4">
              No collections found. Add a new collection to get started.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isManifestModalOpen} onOpenChange={setIsManifestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Manifest</DialogTitle>
          </DialogHeader>
          <Textarea
            value={manifest}
            onChange={(e) => setManifest(e.target.value)}
            placeholder="Enter JSON manifest here..."
            rows={10}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsManifestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveManifest}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this collection? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCollection}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
