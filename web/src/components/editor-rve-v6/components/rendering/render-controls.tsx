import React from "react";
import { Download, Loader2, Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { useEditorContext } from "@/components/editor-rve-v6/contexts/editor-context";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRendering } from "../../hooks/use-rendering";
import { handleDownload } from "@/utils/download";
/**
 * Interface representing a single video render attempt
 * @property {string} url - URL of the rendered video (if successful)
 * @property {Date} timestamp - When the render was completed
 * @property {string} id - Unique identifier for the render
 * @property {'success' | 'error'} status - Result of the render attempt
 * @property {string} error - Error message if render failed
 */
interface RenderItem {
  url?: string;
  timestamp: Date;
  id: string;
  status: "success" | "error";
  error?: string;
}

/**
 * Props for the RenderControls component
 * @property {object} state - Current render state containing status, progress, and URL
 * @property {() => void} handleRender - Function to trigger a new render
 * @property {string} videoProjectId - ID of the video project being edited
 * @property {any[]} overlays - Current overlays in the editor
 * @property {number} durationInFrames - Duration of the composition in frames
 * @property {number} fps - Frames per second of the composition
 */

/**
 * RenderControls component provides UI controls for video rendering functionality
 *
 * Features:
 * - Render button that shows progress during rendering
 * - Save button to persist the current editor state
 * - Notification bell showing render history
 * - Download buttons for completed renders
 * - Error display for failed renders
 *
 * The component maintains a history of render attempts, both successful and failed,
 * and provides visual feedback about the current render status.
 */
const RenderControls: React.FC<{ fps: number; isAutoSaving: boolean }> = ({
  fps,
  isAutoSaving,
}) => {
  const {
    saveProject,
    isSaving,
    overlays,
    durationInFrames,
    videoProjectId,
    aspectRatio,
  } = useEditorContext();

  const {
    renderMedia,
    state: renderMediaState,
    renderSpeed,
    renderResolution,
    setRenderSpeed,
    setRenderResolution,
  } = useRendering(videoProjectId);

  // Store multiple renders
  const [renders, setRenders] = React.useState<RenderItem[]>([]);
  // Track if there are new renders
  const [hasNewRender, setHasNewRender] = React.useState(false);

  // State for render settings dialog
  const [renderDialogOpen, setRenderDialogOpen] = React.useState(false);

  // Add new render to the list when completed
  React.useEffect(() => {
    if (renderMediaState.status === "done" && renderMediaState.url) {
      setRenders((prev) => [
        {
          url: renderMediaState.url!,
          timestamp: new Date(),
          id: crypto.randomUUID(),
          status: "success",
        },
        ...prev,
      ]);
      setHasNewRender(true);
    } else if (renderMediaState.status === "error") {
      setRenders((prev) => [
        {
          timestamp: new Date(),
          id: crypto.randomUUID(),
          status: "error",
          error: "Failed to render video. Please try again.",
        },
        ...prev,
      ]);
      setHasNewRender(true);
    }
  }, [renderMediaState.status, renderMediaState.url]);

  // Function to handle render with settings
  const handleRenderWithSettings = async () => {
    const saveResult = await saveProject({
      overlays,
      durationInFrames,
      videoProjectId,
      fps,
      aspectRatio,
    });

    if (saveResult !== false) {
      renderMedia();
    }

    setRenderDialogOpen(false);
  };

  return (
    <div className="flex items-center gap-2 pr-10">
      <Popover onOpenChange={() => setHasNewRender(false)}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="relative hover:bg-primary hover:text-primary-foreground"
          >
            <Bell className="w-3.5 h-3.5" />
            {hasNewRender && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-3">
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium">Recent Renders</h4>
            {renders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No renders yet</p>
            ) : (
              renders.map((render) => (
                <div
                  key={render.id}
                  className={`flex items-center justify-between rounded-md border p-1.5 ${
                    render.status === "error"
                      ? "border-destructive/50 bg-destructive/10"
                      : "border-border"
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="text-xs text-zinc-200">
                      {render.status === "error" ? (
                        <span className="text-red-400 font-medium">
                          Render Failed
                        </span>
                      ) : (
                        new URL(render.url!).pathname.split("/").pop()
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(render.timestamp, {
                        addSuffix: true,
                      })}
                      {render.error && (
                        <div className="text-red-400 mt-0.5">
                          {render.error}
                        </div>
                      )}
                    </div>
                  </div>
                  {render.status === "success" && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="text-zinc-200 hover:text-gray-800 h-6 w-6"
                      onClick={() =>
                        handleDownload(render.url!, "listing-shorts.mp4", {
                          pipeline_id: videoProjectId,
                          source: "editor",
                        })
                      }
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Auto-save toggle */}

      {/* Save Button */}
      <Button
        onClick={() =>
          saveProject({
            overlays,
            durationInFrames,
            videoProjectId,
            fps,
            aspectRatio,
          })
        }
        size="sm"
        variant="secondary"
        disabled={isSaving || isAutoSaving}
        className="mr-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save
          </>
        )}
      </Button>

      {/* Render Button - Now opens dialog instead of rendering directly */}
      <Button
        onClick={() => setRenderDialogOpen(true)}
        size="sm"
        variant="white"
        disabled={
          renderMediaState.status === "rendering" ||
          renderMediaState.status === "invoking"
        }
        className="bg-primary"
      >
        {renderMediaState.status === "rendering" ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Rendering... {(renderMediaState.progress * 100).toFixed(0)}%
          </>
        ) : renderMediaState.status === "invoking" ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Preparing...
          </>
        ) : (
          "Render Video"
        )}
      </Button>

      {/* Render Settings Dialog */}
      <Dialog open={renderDialogOpen} onOpenChange={setRenderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Render Settings</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="resolution" className="text-right">
                Resolution
              </Label>
              <Select
                value={renderResolution}
                onValueChange={setRenderResolution}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p (HD)</SelectItem>
                  <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                  <SelectItem value="2160p">4K (Ultra HD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="speed" className="text-right">
                Render Speed
              </Label>
              <Select value={renderSpeed} onValueChange={setRenderSpeed}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select render speed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast (Lower Quality)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="slow">Slow (High Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenderDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="white" onClick={handleRenderWithSettings}>
              Render
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RenderControls;
