import React, { useRef, useState, DragEvent } from "react";
import { Upload } from "lucide-react";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { UploadProgressTracker } from "@/components/UploadProgressTracker";

interface MediaUploadButtonProps {
  video_project_id: string;
  onUploadComplete?: () => void;
  buttonText?: string;
  accept?: string;
  showProgress?: boolean;
  className?: string;
}

export const MediaUploadButton: React.FC<MediaUploadButtonProps> = ({
  video_project_id,
  onUploadComplete,
  buttonText = "Upload Media",
  accept = "image/avif,image/png,image/jpeg,image/gif,image/webp,video/*",
  showProgress = true,
  className = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const {
    uploads,
    isUploading,
    handleFileUpload,
    removeUpload,
    clearCompleted,
  } = useMediaUpload(video_project_id, onUploadComplete);

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${isDragActive ? "border-primary bg-primary/10" : "border-muted"}`}
        tabIndex={0}
        aria-label="Upload media files"
        onClick={handleButtonClick}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && handleButtonClick()
        }
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragLeave}
        role="button"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleInputChange}
          tabIndex={-1}
        />
        <Upload className="h-6 w-6 mb-2 text-primary" />
        <span className="font-medium text-base text-center">{buttonText}</span>
        <span className="text-xs text-muted-foreground mt-1">
          Drag & drop files here or click to select
        </span>
      </div>
      {showProgress && (
        <UploadProgressTracker
          uploads={uploads}
          onRemove={removeUpload}
          onClear={clearCompleted}
        />
      )}
    </div>
  );
};
