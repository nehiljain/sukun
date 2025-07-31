import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export interface MotionMagicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  images: { url: string; index: string | number }[];
  onSubmit: (params: {
    selectedImages: string[];
    prompt: string;
    aspectRatio: string;
    duration: string;
    cameraMotion: string;
  }) => void;
  isLoading: boolean;
  error?: string | null;
  videoUrl?: string | null;
  defaultPrompt?: string;
}

export function MotionMagicDialog({
  isOpen,
  onClose,
  images,
  onSubmit,
  isLoading,
  error,
  videoUrl,
  defaultPrompt = "Generate a cinematic, ultra-smooth video of this room or space. The camera should push in with fluid, seamless motion, as if mounted on a professional gimbal, no shakes. Maintain steady, architectural framing to showcase the space. Strictly adhere to the keyframe, excluding any humans, animals, or objects not present in the original image. Dont rush in, move at a very slow speed. Snail pace. If there are too many objects, make sure you dont shake the camera. Video needs to be as realistic as possible. Video needs to be 100% accurate to the original image.",
}: MotionMagicDialogProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>(defaultPrompt);
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [duration, setDuration] = useState<string>("5s");
  const [cameraMotion, setCameraMotion] = useState<string>("push_in");

  const handleSelectImage = (url: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(url)) {
        return prev.filter((u) => u !== url);
      } else if (prev.length < 2) {
        return [...prev, url];
      } else {
        return [prev[1], url];
      }
    });
  };

  const handleSubmit = () => {
    if (selectedImages.length === 0) return;
    onSubmit({ selectedImages, prompt, aspectRatio, duration, cameraMotion });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Motion Magic Video Generation</DialogTitle>
          <DialogDescription>
            Select up to 2 images (order matters), enter a prompt, aspect ratio,
            and duration to generate a video.
          </DialogDescription>
        </DialogHeader>
        <div className="mb-2 text-sm text-gray-600">Select up to 2 images:</div>
        <div className="flex flex-row gap-2 mb-4 flex-wrap">
          {images.map((img) => {
            const selectedIdx = selectedImages.indexOf(img.url);
            return (
              <button
                key={img.index}
                type="button"
                className={`relative border-2 rounded-md focus:outline-none transition-all w-24 h-24 overflow-hidden ${
                  selectedIdx !== -1
                    ? "border-primary ring-2 ring-primary"
                    : "border-gray-200 hover:border-primary"
                }`}
                aria-label={`Select image ${img.index}`}
                tabIndex={0}
                onClick={() => handleSelectImage(img.url)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    handleSelectImage(img.url);
                }}
              >
                <img
                  src={img.url}
                  alt={`Selectable ${img.index}`}
                  className="object-cover w-full h-full"
                />
                {selectedIdx !== -1 && (
                  <span className="absolute top-1 left-1 bg-primary text-white text-xs rounded-full px-2 py-0.5">
                    {selectedIdx + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="motion-magic-prompt"
            >
              Prompt
            </label>
            <Input
              id="motion-magic-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full border rounded px-2 py-1 focus:outline-none focus:border-primary"
              aria-label="Prompt for video generation"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="motion-magic-aspect-ratio"
            >
              Aspect Ratio
            </label>
            <Select
              value={aspectRatio}
              onValueChange={(value) => setAspectRatio(value)}
              aria-label="Aspect Ratio"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Aspect Ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
                <SelectItem value="3:2">3:2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Add a new option to select camera motion (pan_right, pan_left, zoom_in, zoom_out) */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="motion-magic-camera-motion"
            >
              Camera Motion
            </label>
            <Select
              value={cameraMotion}
              onValueChange={(value) => setCameraMotion(value)}
              aria-label="Camera Motion"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Camera Motion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pan_right">Pan Right</SelectItem>
                <SelectItem value="pan_left">Pan Left</SelectItem>
                <SelectItem value="zoom_in">Zoom In</SelectItem>
                <SelectItem value="zoom_out">Zoom Out</SelectItem>
                <SelectItem value="push_in">Push In</SelectItem>
                <SelectItem value="pull_out">Pull Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="motion-magic-duration"
            >
              Duration (seconds)
            </label>
            <Input
              id="motion-magic-duration"
              type="number"
              min={3}
              max={10}
              value={parseInt(duration)}
              onChange={(e) => setDuration(`${e.target.value}s`)}
              className="border rounded px-2 py-1 w-20 focus:outline-none focus:border-primary"
              aria-label="Duration in seconds"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={
              selectedImages.length === 0 ||
              selectedImages.length > 2 ||
              isLoading
            }
            aria-label="Generate Motion Magic Video"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              "Generate Motion Magic Video"
            )}
          </Button>
        </DialogFooter>
        {error && <div className="text-red-500 mt-2">{error}</div>}
        {videoUrl && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-1">Generated Video</h3>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg object-cover"
              style={{ aspectRatio: aspectRatio || "16/9", maxHeight: "400px" }}
              tabIndex={0}
              aria-label="Generated Motion Magic video"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
