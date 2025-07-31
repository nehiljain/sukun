import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileIcon, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FileUploadProps {
  onUploadComplete: (fileUrl: string, mediaId: string) => void;
  supportText?: string;
  acceptedFileTypes?: Record<string, string[]>;
  endpoint: string;
  maxSize?: number;
  multiple?: boolean;
  videoProjectId?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  supportText,
  acceptedFileTypes,
  endpoint,
  maxSize = 5242880, // 5MB default
  multiple = false,
  videoProjectId,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setUploadError(null);
      setUploadSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: acceptedFileTypes,
      maxSize,
      multiple,
    });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();

    // Determine the file key based on the endpoint
    const fileKey = endpoint.includes("audio")
      ? "audio_file"
      : endpoint.includes("video")
        ? "video_file"
        : "image_file";

    formData.append(fileKey, selectedFile);

    // Add project ID if provided
    if (videoProjectId) {
      formData.append("project_id", videoProjectId);
    }

    try {
      // Get CSRF token for Django
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];

      const response = await fetch(`/api/${endpoint}/`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken || "",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();

      setUploadSuccess(true);
      setSelectedFile(null);

      // Call the callback with the file URL and media ID
      onUploadComplete(result.url, result.media_id);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const cancelSelection = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadSuccess(false);
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-md p-6 cursor-pointer transition-colors
                        ${isDragActive ? "border-accent bg-accent/10" : "border-border"}
                        ${isDragReject ? "border-destructive bg-destructive/10" : ""}
                        hover:border-accent hover:bg-accent/5
                        flex flex-col items-center justify-center space-y-2 min-h-[150px]`}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-center text-muted-foreground">
            {supportText}
          </p>
          {acceptedFileTypes && (
            <p className="text-xs text-muted-foreground">
              Allowed types:{" "}
              {Object.values(acceptedFileTypes).flat().join(", ")}
            </p>
          )}
          {maxSize && (
            <p className="text-xs text-muted-foreground">
              Max size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
            </p>
          )}
        </div>
      ) : (
        <div className="border rounded-md p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileIcon className="h-6 w-6 text-accent" />
              <div>
                <p className="text-sm font-medium truncate max-w-[200px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(0)}KB
                </p>
              </div>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={cancelSelection}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {uploadError && (
            <div className="flex items-center space-x-2 text-destructive mb-4 text-sm p-2 bg-destructive/10 rounded">
              <AlertCircle className="h-4 w-4" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="flex items-center space-x-2 text-accent mb-4 text-sm p-2 bg-accent/10 rounded">
              <CheckCircle className="h-4 w-4" />
              <span>File uploaded successfully!</span>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={cancelSelection}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              size="sm"
              onClick={handleUpload}
              disabled={isUploading || uploadSuccess}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
