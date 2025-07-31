import React, { useCallback } from "react";
// NOTE: You need to install this package:
// npm install react-dropzone
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Image, Upload } from "lucide-react";

interface ImageUploadProps {
  onImagesUploaded: (files: File[]) => void;
  isAuthenticated: boolean;
  maxFreeImages: number;
  requiredImageCount: number;
}

export function ImageUpload({
  onImagesUploaded,
  requiredImageCount,
  isAuthenticated,
  maxFreeImages,
}: ImageUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onImagesUploaded(acceptedFiles);
      }
    },
    [onImagesUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    multiple: true,
  });

  return (
    <Card
      className={`border-2 border-dashed rounded-xl ${
        isDragActive
          ? "border-indigo-500 bg-indigo-500/10"
          : "border-slate-700/50 hover:border-slate-500/50 bg-gradient-to-b from-slate-800/30 to-slate-900/50"
      } transition-all duration-200 cursor-pointer`}
    >
      <CardContent
        {...getRootProps()}
        className="flex flex-col items-center justify-center p-16 space-y-4"
      >
        <input {...getInputProps()} />

        <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center shadow-inner border border-slate-700/70">
          <Camera size={32} className="text-indigo-400" />
        </div>

        <div className="text-center">
          <p className="text-xl font-light text-white tracking-wide mb-2">
            Add {requiredImageCount} Property Photos for best results
          </p>

          {!isAuthenticated && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
              <p className="text-xs text-amber-300/90 font-light">
                Free account: Limited to {maxFreeImages} images
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
