import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chrome, Upload, Link, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Footer from "@/components/shared/Footer";
import { Checkbox } from "@/components/ui/checkbox";

interface Capture {
  id: string;
  name: string;
  status: string;
  type: string;
  storage_dir: string;
  created_at: string;
  updated_at: string;
}

export default function Captures() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [selectedCaptures, setSelectedCaptures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "video/*": [".mp4", ".webm"],
      "audio/*": [".mp3", ".wav"],
    },
    onDrop: (acceptedFiles) => {
      handleFileUpload(acceptedFiles[0]);
    },
  });

  useEffect(() => {
    fetchCaptures();
  }, []);

  const fetchCaptures = async () => {
    try {
      const response = await fetch("/api/captures/");
      if (!response.ok) throw new Error("Failed to fetch captures");
      const data = await response.json();
      setCaptures(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load captures");
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);
    formData.append("type", file.type.startsWith("video/") ? "video" : "audio");

    try {
      const response = await fetch("/api/captures/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      toast.success("File uploaded successfully");
      fetchCaptures();
    } catch (err) {
      toast.error("Failed to upload file");
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    try {
      const response = await fetch("/api/captures/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "URL Capture",
          type: urlInput.includes("video") ? "video" : "audio",
          url: urlInput,
        }),
      });

      if (!response.ok) throw new Error("Failed to create capture");

      toast.success("URL capture created successfully");
      setUrlInput("");
      fetchCaptures();
    } catch (err) {
      toast.error("Failed to create capture from URL");
    }
  };

  const navigateToChromeStore = () => {
    window.open(
      "https://chrome.google.com/webstore/your-extension-id",
      "_blank",
    );
  };

  const handleSelectCapture = (captureId: string) => {
    setSelectedCaptures((prev) =>
      prev.includes(captureId)
        ? prev.filter((id) => id !== captureId)
        : [...prev, captureId],
    );
  };

  const handleCreateProject = async () => {
    toast.success(`Creating project with ${selectedCaptures.length} captures`);
    setSelectedCaptures([]);
  };

  const handleDeleteCaptures = async () => {
    toast.success(`Deleting ${selectedCaptures.length} captures`);
    setSelectedCaptures([]);
  };

  return (
    <>
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Captures</CardTitle>
            <CardDescription>Create and manage your captures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Chrome Plugin Option */}
              <Card className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <Chrome className="h-12 w-12 text-primary" />
                  <h3 className="text-lg font-semibold">Chrome Plugin</h3>
                  <Button variant="primary" onClick={navigateToChromeStore}>
                    Install Plugin
                  </Button>
                </div>
              </Card>

              {/* File Upload Option */}
              <Card className="p-6">
                <div {...getRootProps()} className="h-full">
                  <div className="flex flex-col items-center gap-4 h-full">
                    <Upload className="h-12 w-12 text-primary" />
                    <h3 className="text-lg font-semibold">Upload File</h3>
                    <input {...getInputProps()} />
                    <div className="text-center text-sm text-muted-foreground">
                      {isDragActive ? (
                        <p>Drop the file here</p>
                      ) : (
                        <p>Drag & drop or click to upload</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* URL Input Option */}
              <Card className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <Link className="h-12 w-12 text-primary" />
                  <h3 className="text-lg font-semibold">URL Input</h3>
                  <div className="flex w-full gap-2">
                    <Input
                      placeholder="Enter URL"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <Button variant="primary" onClick={handleUrlSubmit}>
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Action Buttons - Now always visible */}
            <div className="mb-4 flex gap-2">
              <Button
                variant="outline"
                onClick={handleCreateProject}
                disabled={selectedCaptures.length === 0}
              >
                Create Project{" "}
                {selectedCaptures.length > 0 && `(${selectedCaptures.length})`}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCaptures}
                disabled={selectedCaptures.length === 0}
              >
                Delete{" "}
                {selectedCaptures.length > 0 && `(${selectedCaptures.length})`}
              </Button>
            </div>

            {/* Modified Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {captures.map((capture) => (
                  <TableRow
                    key={capture.id}
                    className={`cursor-pointer ${selectedCaptures.includes(capture.id) ? "bg-muted" : ""}`}
                    onClick={() => handleSelectCapture(capture.id)}
                  >
                    <TableCell
                      className="w-[50px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedCaptures.includes(capture.id)}
                        onCheckedChange={() => handleSelectCapture(capture.id)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell>{capture.name}</TableCell>
                    <TableCell>{capture.type}</TableCell>
                    <TableCell>
                      <StatusBadge status={capture.status} />
                    </TableCell>
                    <TableCell>
                      {new Date(capture.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(capture.updated_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
