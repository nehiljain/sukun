import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RectangleOverlay } from "../../../types";
import { useEditorContext } from "../../../contexts/editor-context";
import { ColorPicker } from "@/components/ui/color-picker";

/**
 * Props for the RectangleDetails component
 */
interface RectangleDetailsProps {
  /** The overlay configuration object */
  overlay: RectangleOverlay;
}

/**
 * RectangleDetails component provides a UI for configuring rectangle overlays
 *
 * This component allows users to:
 * - Customize rectangle appearance (fill, stroke, border radius)
 * - Configure animations (enter, exit, drawing animation)
 * - Adjust opacity and other style properties
 *
 * @param props.overlay - The rectangle overlay configuration object
 */
export const RectangleDetails: React.FC<RectangleDetailsProps> = ({
  overlay,
}) => {
  const { handleOverlayChange } = useEditorContext();
  const [activeTab, setActiveTab] = useState("style");

  // Helper function to update overlay styles
  const updateStyles = (key: string, value: unknown) => {
    const updatedStyles = {
      ...overlay.styles,
      [key]: value,
    };

    handleOverlayChange({
      ...overlay,
      styles: updatedStyles,
    });
  };

  // Helper function to update animation properties
  const updateAnimation = (key: string, value: string) => {
    const updatedAnimation = {
      ...overlay.styles.animation,
      [key]: value,
    };

    handleOverlayChange({
      ...overlay,
      styles: {
        ...overlay.styles,
        animation: updatedAnimation,
      },
    });
  };

  // Helper function to update drawing animation properties
  const updateDrawAnimation = (key: string, value: unknown) => {
    const updatedDraw = {
      ...overlay.styles.animation?.draw,
      [key]: value,
    };

    handleOverlayChange({
      ...overlay,
      styles: {
        ...overlay.styles,
        animation: {
          ...overlay.styles.animation,
          draw: updatedDraw,
        },
      },
    });
  };

  return (
    <div className="p-4 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="style">Style</TabsTrigger>
          <TabsTrigger value="animation">Animation</TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="space-y-4">
          {/* Rectangle Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                type="number"
                value={overlay.width}
                onChange={(e) => {
                  handleOverlayChange({
                    ...overlay,
                    width: Number(e.target.value),
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                type="number"
                value={overlay.height}
                onChange={(e) => {
                  handleOverlayChange({
                    ...overlay,
                    height: Number(e.target.value),
                  });
                }}
              />
            </div>
          </div>

          {/* Fill Color */}
          <div className="space-y-2">
            <Label>Fill Color</Label>
            <div className="flex items-center gap-4">
              <ColorPicker
                color={overlay.styles.fill || "#000000"}
                onChange={(color) => updateStyles("fill", color)}
              />
              <div className="space-y-2 flex-1">
                <Label htmlFor="fillOpacity">Fill Opacity</Label>
                <Slider
                  id="fillOpacity"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[overlay.styles.fillOpacity || 1]}
                  onValueChange={(value) =>
                    updateStyles("fillOpacity", value[0])
                  }
                />
              </div>
            </div>
          </div>

          {/* Stroke Settings */}
          <div className="space-y-2">
            <Label>Stroke Color</Label>
            <div className="flex items-center gap-4">
              <ColorPicker
                color={overlay.styles.stroke || "#000000"}
                onChange={(color) => updateStyles("stroke", color)}
              />
              <div className="space-y-2 flex-1">
                <Label htmlFor="strokeOpacity">Stroke Opacity</Label>
                <Slider
                  id="strokeOpacity"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[overlay.styles.strokeOpacity || 1]}
                  onValueChange={(value) =>
                    updateStyles("strokeOpacity", value[0])
                  }
                />
              </div>
            </div>
          </div>

          {/* Stroke Width */}
          <div className="space-y-2">
            <Label htmlFor="strokeWidth">Stroke Width</Label>
            <Slider
              id="strokeWidth"
              min={0}
              max={20}
              step={1}
              value={[overlay.styles.strokeWidth || 0]}
              onValueChange={(value) => updateStyles("strokeWidth", value[0])}
            />
          </div>

          {/* Border Radius */}
          <div className="space-y-2">
            <Label htmlFor="borderRadius">Border Radius</Label>
            <Slider
              id="borderRadius"
              min={0}
              max={100}
              step={1}
              value={[overlay.styles.borderRadius || 0]}
              onValueChange={(value) => updateStyles("borderRadius", value[0])}
            />
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <Label htmlFor="opacity">Opacity</Label>
            <Slider
              id="opacity"
              min={0}
              max={1}
              step={0.01}
              value={[overlay.styles.opacity || 1]}
              onValueChange={(value) => updateStyles("opacity", value[0])}
            />
          </div>
        </TabsContent>

        <TabsContent value="animation" className="space-y-4">
          {/* Enter/Exit Animations */}
          <div className="space-y-2">
            <Label>Enter Animation</Label>
            <Select
              value={overlay.styles.animation?.enter || "none"}
              onValueChange={(value) => updateAnimation("enter", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select animation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fadeIn">Fade In</SelectItem>
                <SelectItem value="slideIn">Slide In</SelectItem>
                <SelectItem value="zoomIn">Zoom In</SelectItem>
                <SelectItem value="bounceIn">Bounce In</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Exit Animation</Label>
            <Select
              value={overlay.styles.animation?.exit || "none"}
              onValueChange={(value) => updateAnimation("exit", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select animation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fadeOut">Fade Out</SelectItem>
                <SelectItem value="slideOut">Slide Out</SelectItem>
                <SelectItem value="zoomOut">Zoom Out</SelectItem>
                <SelectItem value="bounceOut">Bounce Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Drawing Animation */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="drawEnabled">Drawing Animation</Label>
              <Switch
                id="drawEnabled"
                checked={overlay.styles.animation?.draw?.enabled || false}
                onCheckedChange={(checked) =>
                  updateDrawAnimation("enabled", checked)
                }
              />
            </div>

            {overlay.styles.animation?.draw?.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="drawDuration">Duration (frames)</Label>
                  <Input
                    id="drawDuration"
                    type="number"
                    value={overlay.styles.animation?.draw?.duration || 30}
                    onChange={(e) =>
                      updateDrawAnimation("duration", Number(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="drawDirection">Direction</Label>
                  <Select
                    value={
                      overlay.styles.animation?.draw?.direction || "clockwise"
                    }
                    onValueChange={(value) =>
                      updateDrawAnimation("direction", value)
                    }
                  >
                    <SelectTrigger id="drawDirection">
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clockwise">Clockwise</SelectItem>
                      <SelectItem value="counterclockwise">
                        Counterclockwise
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
