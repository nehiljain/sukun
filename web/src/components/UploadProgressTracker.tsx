import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface UploadProgressTrackerProps {
  uploads: UploadItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export const UploadProgressTracker = ({
  uploads,
  onRemove,
  onClear,
}: UploadProgressTrackerProps) => {
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse after all uploads complete
  useEffect(() => {
    if (
      uploads.length > 0 &&
      uploads.every(
        (item) => item.status === "success" || item.status === "error",
      )
    ) {
      const timer = setTimeout(() => setCollapsed(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploads]);

  if (uploads.length === 0) return null;

  const completedUploads = uploads.filter(
    (item) => item.status === "success" || item.status === "error",
  ).length;

  const handleToggle = () => setCollapsed((prev) => !prev);

  return (
    <Card className="mb-6 overflow-hidden">
      <div
        className="p-3 bg-secondary flex items-center justify-between cursor-pointer"
        onClick={handleToggle}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleToggle()}
        aria-label={
          collapsed ? "Expand upload progress" : "Collapse upload progress"
        }
      >
        <div className="flex items-center space-x-2">
          <Upload className="h-4 w-4" />
          <span className="font-medium">
            Uploads ({completedUploads}/{uploads.length})
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="h-8 px-2"
          >
            Clear completed
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((prev) => !prev);
            }}
          >
            {collapsed ? "+" : "-"}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <CardContent className="p-0 max-h-60 overflow-y-auto">
          <ul className="divide-y">
            {uploads.map((item) => (
              <li key={item.id} className="p-3 flex items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">
                      {item.file.name}
                    </p>
                    <div className="flex items-center">
                      {item.status === "pending" && (
                        <span className="text-xs text-muted-foreground">
                          Pending
                        </span>
                      )}
                      {item.status === "uploading" && (
                        <span className="text-xs text-muted-foreground">
                          {item.progress}%
                        </span>
                      )}
                      {item.status === "uploading" && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary "></div>
                      )}
                      {item.status === "success" && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {item.status === "error" && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-1"
                        onClick={() => onRemove(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {item.status === "uploading" && (
                    <Progress value={item.progress} className="h-1" />
                  )}
                  {item.status === "error" && (
                    <p className="text-xs text-red-500">
                      {item.error || "Upload failed"}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
};
