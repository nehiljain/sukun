import React from "react";
import { Item } from "../types";
import { getAnimationById } from "@/remotion-src/components/animations/registry";
import { PropertyControlsGenerator } from "@/components/PropertyControlsGenerator";
import { cn } from "@/lib/utils";
import { Delete, PanelRightIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZoomConfigEditor } from "@/components/ZoomConfigEditor";

export const PropertiesPanel: React.FC<{
  selectedItem: Item | null;
  onUpdateItem: (updatedItem: Item) => void;
  onClose: () => void;
  onDeleteItem?: (itemId: string) => void;
  fps?: number;
}> = ({ selectedItem, onUpdateItem, onClose, onDeleteItem, fps = 30 }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const [isHover, setIsHover] = React.useState(false);

  const toggleOpen = () => setIsOpen((prev) => !prev);
  const getOpenState = () => isOpen || isHover;

  const handlePropertyChange = (key: string, value: any) => {
    onUpdateItem({
      ...selectedItem,
      [key]: value,
    });
  };

  const handleDelete = () => {
    if (onDeleteItem && selectedItem) {
      onDeleteItem(selectedItem.id);
      onClose();
    }
  };

  const renderPanelContent = () => {
    if (!selectedItem) return null;

    // Calculate wall time from frames
    const durationInSeconds = selectedItem.durationInFrames / (fps || 30);
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    const frames = selectedItem.durationInFrames % (fps || 30);
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, "0")}.${frames.toString().padStart(2, "0")}`;

    // Common duration controls to add to all item types
    const durationControls = (
      <div className="mb-4">
        <label className="block text-muted-foreground text-xs mb-2">
          Duration
        </label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Frames:</span>
            <input
              type="number"
              min="1"
              value={selectedItem.durationInFrames}
              onChange={(e) =>
                onUpdateItem({
                  ...selectedItem,
                  durationInFrames: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              className="w-20 bg-input text-foreground px-2 py-1 rounded-md text-sm"
            />
          </div>
        </div>
      </div>
    );

    // For basic types like solid and video, render static controls

    if (selectedItem.type === "solid") {
      return (
        <div className="p-4">
          {durationControls}

          <div className="mb-4">
            <label className="block text-muted-foreground text-xs mb-2">
              Color
            </label>
            <input
              type="color"
              value={selectedItem.color}
              onChange={(e) =>
                onUpdateItem({ ...selectedItem, color: e.target.value })
              }
              className="block w-16 h-8 rounded-md"
            />
          </div>

          <Button
            onClick={handleDelete}
            variant="destructive"
            className="mt-4 w-full"
            aria-label="Delete item"
          >
            <Trash2Icon className="w-4 h-4 mr-2" />
            Delete Item
          </Button>
        </div>
      );
    }

    if (selectedItem.type === "video") {
      return (
        <div className="p-4">
          {durationControls}

          <div className="mb-4">
            <label className="block text-muted-foreground text-xs mb-2">
              Video Source
            </label>
            <input
              type="text"
              value={selectedItem.src}
              onChange={(e) =>
                onUpdateItem({ ...selectedItem, src: e.target.value })
              }
              className="w-full bg-input text-foreground px-2 py-1 rounded-md"
            />
          </div>

          <Button
            onClick={handleDelete}
            variant="destructive"
            className="mt-4 w-full"
            aria-label="Delete item"
          >
            <Trash2Icon className="w-4 h-4 mr-2" />
            Delete Item
          </Button>
        </div>
      );
    }

    if (selectedItem.type === "voice") {
      return (
        <div className="p-4">
          {durationControls}

          <div className="mb-4">
            <label className="block text-muted-foreground text-xs mb-2">
              Volume
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedItem.volume || 1}
                onChange={(e) =>
                  onUpdateItem({
                    ...selectedItem,
                    volume: parseFloat(e.target.value),
                  })
                }
                className="flex-1"
              />
              <span className="text-xs w-8 text-right">
                {Math.round((selectedItem.volume || 1) * 100)}%
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-muted-foreground text-xs mb-2">
              Audio Preview
            </label>
            <audio src={selectedItem.src} controls className="w-full" />
          </div>

          <Button
            onClick={handleDelete}
            variant="destructive"
            className="mt-4 w-full"
            aria-label="Delete item"
          >
            <Trash2Icon className="w-4 h-4 mr-2" />
            Delete Item
          </Button>
        </div>
      );
    }

    // Add support for text type
    if (selectedItem.type === "text") {
      return (
        <div className="p-4">
          {durationControls}

          <div className="mb-4">
            <label className="block text-muted-foreground text-xs mb-2">
              Content
            </label>
            <textarea
              value={selectedItem.text || ""}
              onChange={(e) =>
                onUpdateItem({ ...selectedItem, text: e.target.value })
              }
              className="w-full bg-input text-foreground px-2 py-1 rounded-md min-h-[80px]"
              placeholder="Enter text..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-muted-foreground text-xs mb-2">
              Font Size
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="12"
                max="72"
                value={selectedItem.fontSize || 24}
                onChange={(e) =>
                  onUpdateItem({
                    ...selectedItem,
                    fontSize: parseInt(e.target.value),
                  })
                }
                className="flex-1"
              />
              <span className="text-xs w-10 text-right">
                {selectedItem.fontSize || 24}px
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-muted-foreground text-xs mb-2">
              Font Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedItem.color || "#ffffff"}
                onChange={(e) =>
                  onUpdateItem({ ...selectedItem, color: e.target.value })
                }
                className="block w-16 h-8 rounded-md"
              />
              <span className="text-xs">{selectedItem.color || "#ffffff"}</span>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-muted-foreground text-xs mb-2">
                Weight
              </label>
              <select
                value={selectedItem.fontWeight || "normal"}
                onChange={(e) =>
                  onUpdateItem({
                    ...selectedItem,
                    fontWeight: e.target.value,
                  })
                }
                className="w-full bg-input text-foreground px-2 py-1 rounded-md"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="lighter">Light</option>
              </select>
            </div>
            <div>
              <label className="block text-muted-foreground text-xs mb-2">
                Alignment
              </label>
              <select
                value={selectedItem.textAlign || "center"}
                onChange={(e) =>
                  onUpdateItem({
                    ...selectedItem,
                    textAlign: e.target.value,
                  })
                }
                className="w-full bg-input text-foreground px-2 py-1 rounded-md"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleDelete}
            variant="destructive"
            className="mt-4 w-full"
            aria-label="Delete item"
          >
            <Trash2Icon className="w-4 h-4 mr-2" />
            Delete Item
          </Button>
        </div>
      );
    }

    // For animation types, use the dynamic property controls
    const animationEntry = getAnimationById(selectedItem.type);
    if (animationEntry) {
      // Special case for VideoZoomReveal animation to include ZoomConfigEditor
      if (selectedItem.type === "VideoZoomReveal") {
        return (
          <div className="p-4">
            {durationControls}

            <PropertyControlsGenerator
              schema={animationEntry.schema}
              values={selectedItem}
              onChange={handlePropertyChange}
            />

            <div className="mt-6 pt-4 border-t">
              <ZoomConfigEditor
                value={selectedItem.zoomConfigs || []}
                onChange={(newZoomConfigs) =>
                  handlePropertyChange("zoomConfigs", newZoomConfigs)
                }
                containerWidth={selectedItem.containerWidth || 800}
                containerHeight={selectedItem.containerHeight || 450}
              />
            </div>

            <Button
              onClick={handleDelete}
              variant="destructive"
              className="mt-6 w-full"
              aria-label="Delete item"
            >
              <Trash2Icon className="w-4 h-4 mr-2" />
              Delete Item
            </Button>
          </div>
        );
      }

      return (
        <div className="p-4">
          {durationControls}

          <PropertyControlsGenerator
            schema={animationEntry.schema}
            values={selectedItem}
            onChange={handlePropertyChange}
          />

          <Button
            onClick={handleDelete}
            variant="destructive"
            className="mt-4 w-full"
            aria-label="Delete item"
          >
            <Trash2Icon className="w-4 h-4 mr-2" />
            Delete Item
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Button
        onClick={toggleOpen}
        variant="outline"
        className={cn(
          "fixed text-primary lg:hidden z-30 bottom-4 px-2 right-4 h-10 w-10 justify-center",
          getOpenState() ? "hidden" : "block",
        )}
        aria-label="Mobile Properties Panel"
      >
        <PanelRightIcon size={24} />
      </Button>
      <aside
        className={cn(
          "fixed top-0 right-0 z-20 h-screen transition-[width] ease-in-out duration-300",
          "bg-background",
          !getOpenState() ? "w-[90px]" : "w-72",
          !selectedItem && "hidden",
          !getOpenState() && "lg:w-[90px] translate-x-full lg:translate-x-0",
          getOpenState() && "lg:w-72 translate-x-0",
        )}
      >
        <div className="flex justify-between items-center p-3 border-b">
          <div
            className={cn(
              "transition-opacity duration-300 overflow-hidden whitespace-nowrap",
              !getOpenState() ? "opacity-0 w-0" : "opacity-100",
            )}
          >
            <h3 className="font-medium">
              {selectedItem?.type === "solid" || selectedItem?.type === "video"
                ? `Edit ${selectedItem?.type}`
                : `Edit ${getAnimationById(selectedItem?.type || "")?.name || ""}`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedItem ? `ID: ${selectedItem.id}` : ""}
            </p>
          </div>
          <Button
            onClick={toggleOpen}
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Toggle panel"
          >
            <PanelRightIcon
              size={16}
              className={cn(
                "transition-transform",
                getOpenState() ? "rotate-180" : "",
              )}
            />
          </Button>
        </div>
        <div
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          className="relative h-[calc(100%-48px)] flex flex-col shadow-md dark:shadow-zinc-800 overflow-y-auto"
        >
          {renderPanelContent()}
        </div>
      </aside>
    </>
  );
};
