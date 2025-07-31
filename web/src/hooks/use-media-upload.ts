import { useState } from "react";
import { ddApiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export const useMediaUpload = (
  video_project_id: string,
  onUploadComplete?: () => void,
) => {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (files: FileList | File[]) => {
    setIsUploading(true);
    const fileArray = Array.from(files);
    const newUploads = fileArray.map((file) => ({
      id: `upload-${Date.now()}-${file.name}`,
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setUploads((prev) => [...prev, ...newUploads]);

    const uploadPromises = newUploads.map(async (upload) => {
      const formData = new FormData();
      const isImage = upload.file.type.startsWith("image/");
      formData.append("file", upload.file);
      formData.append("media_type", isImage ? "image" : "video");
      formData.append("video_project_id", video_project_id);
      setUploads((prev) =>
        prev.map((item) =>
          item.id === upload.id ? { ...item, status: "uploading" } : item,
        ),
      );
      try {
        await ddApiClient.post("/api/media/upload/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 100),
            );
            setUploads((prev) =>
              prev.map((item) =>
                item.id === upload.id
                  ? { ...item, progress: percentCompleted }
                  : item,
              ),
            );
          },
        });
        setUploads((prev) =>
          prev.map((item) =>
            item.id === upload.id
              ? { ...item, status: "success", progress: 100 }
              : item,
          ),
        );
        toast.success(`${upload.file.name} uploaded successfully`);
      } catch (error) {
        setUploads((prev) =>
          prev.map((item) =>
            item.id === upload.id
              ? {
                  ...item,
                  status: "error",
                  error: `Failed to upload ${upload.file.name}`,
                }
              : item,
          ),
        );
        toast.error(`${upload.file.name} failed to upload`);
      }
    });

    try {
      await Promise.all(uploadPromises);
      setTimeout(() => {
        setIsUploading(false);
        if (onUploadComplete) onUploadComplete();
      }, 500);
    } catch {
      setIsUploading(false);
    }
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompleted = () => {
    setUploads((prev) =>
      prev.filter(
        (item) => item.status !== "success" && item.status !== "error",
      ),
    );
  };

  return {
    uploads,
    isUploading,
    handleFileUpload,
    removeUpload,
    clearCompleted,
  };
};
