import React, { useState, useCallback, useEffect } from "react";
import { TextOverlay } from "../../../types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlignLeft, AlignCenter, AlignRight, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/ui/color-picker";
import { useFonts } from "@/components/editor-rve-v6/hooks/use-fonts";
import { TextPresetSelector } from "./text-preset-selector";

/**
 * Props for the TextStylePanel component
 * @interface TextStylePanelProps
 * @property {TextOverlay} localOverlay - The current text overlay object containing styles and content
 * @property {Function} handleInputChange - Callback function to handle changes to overlay text content
 * @property {Function} handleStyleChange - Callback function to handle style changes for the text overlay
 */
interface TextStylePanelProps {
  localOverlay: TextOverlay;
  handleInputChange: (field: keyof TextOverlay, value: string) => void;
  handleStyleChange: (field: keyof TextOverlay["styles"], value: any) => void;
}

// Helper to parse gradient string into components
const parseGradient = (gradientStr: string) => {
  try {
    // Default values if parsing fails
    const defaultResult = {
      angle: 135,
      stops: [
        { color: "#6366F1", position: 0 },
        { color: "#EC4899", position: 50 },
        { color: "#F59E0B", position: 100 },
      ],
    };

    if (!gradientStr || !gradientStr.includes("linear-gradient")) {
      return defaultResult;
    }

    // Extract the content inside the parentheses
    const match = gradientStr.match(/linear-gradient\((.*)\)/);
    if (!match) return defaultResult;

    const content = match[1];

    // Extract angle
    const angleMatch = content.match(/(\d+)deg/);
    const angle = angleMatch ? parseInt(angleMatch[1]) : 135;

    // Extract color stops
    const stopsStr = content.replace(/^\d+deg,\s*/, "");
    const stopMatches = stopsStr.match(
      /(#[0-9A-Fa-f]{6}|rgba?\([^)]+\))\s+(\d+)%/g,
    );

    if (!stopMatches) return defaultResult;

    const stops = stopMatches.map((stop) => {
      const [color, position] = stop.trim().split(/\s+/);
      return {
        color,
        position: parseInt(position),
      };
    });

    return { angle, stops };
  } catch (error) {
    console.error("Error parsing gradient:", error);
    return {
      angle: 135,
      stops: [
        { color: "#6366F1", position: 0 },
        { color: "#EC4899", position: 50 },
        { color: "#F59E0B", position: 100 },
      ],
    };
  }
};

// Helper to generate gradient string from components
const buildGradientString = (
  angle: number,
  stops: Array<{ color: string; position: number }>,
) => {
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const stopsStr = sortedStops
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(", ");
  return `linear-gradient(${angle}deg, ${stopsStr})`;
};

/**
 * Gradient Editor component for customizing text gradients
 */
const GradientEditor = ({
  gradient,
  onChange,
}: {
  gradient: string;
  onChange: (newGradient: string) => void;
}) => {
  const [parsed, setParsed] = useState(() => parseGradient(gradient));
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  useEffect(() => {
    setParsed(parseGradient(gradient));
  }, [gradient]);

  const handleUpdate = useCallback(() => {
    const newGradient = buildGradientString(parsed.angle, parsed.stops);
    onChange(newGradient);
  }, [parsed, onChange]);

  const handleAngleChange = (newValue: number[]) => {
    setParsed((prev) => ({ ...prev, angle: newValue[0] }));
    handleUpdate();
  };

  const handleColorChange = (color: string) => {
    const newStops = [...parsed.stops];
    newStops[activeStopIndex].color = color;
    setParsed((prev) => ({ ...prev, stops: newStops }));
    handleUpdate();
  };

  const handlePositionChange = (index: number, newPos: number[]) => {
    const newStops = [...parsed.stops];
    newStops[index].position = newPos[0];
    setParsed((prev) => ({ ...prev, stops: newStops }));
    handleUpdate();
  };

  const addColorStop = () => {
    if (parsed.stops.length >= 5) return; // Limit to 5 stops for simplicity

    // Find a position between two existing stops
    const positions = parsed.stops.map((s) => s.position).sort((a, b) => a - b);
    let newPos = 50;
    for (let i = 0; i < positions.length - 1; i++) {
      if (positions[i + 1] - positions[i] > 10) {
        newPos = Math.floor((positions[i] + positions[i + 1]) / 2);
        break;
      }
    }

    const newStops = [...parsed.stops, { color: "#FFFFFF", position: newPos }];
    setParsed((prev) => ({ ...prev, stops: newStops }));
    setActiveStopIndex(newStops.length - 1);
    handleUpdate();
  };

  const removeColorStop = (index: number) => {
    if (parsed.stops.length <= 2) return; // Keep at least 2 stops

    const newStops = parsed.stops.filter((_, i) => i !== index);
    setParsed((prev) => ({ ...prev, stops: newStops }));
    if (activeStopIndex >= newStops.length) {
      setActiveStopIndex(newStops.length - 1);
    }
    handleUpdate();
  };

  return (
    <div className="space-y-4">
      {/* Gradient Preview */}
      <div
        className="h-10 w-full rounded-md border cursor-pointer"
        style={{ background: gradient }}
        onClick={() => setColorPickerOpen(true)}
      />

      {/* Angle Control */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs text-muted-foreground">
            Gradient Angle
          </label>
          <span className="text-xs">{parsed.angle}°</span>
        </div>
        <Slider
          value={[parsed.angle]}
          min={0}
          max={360}
          step={1}
          onValueChange={handleAngleChange}
        />
      </div>

      {/* Color Stops */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs text-muted-foreground">Color Stops</label>
          <button
            type="button"
            className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted"
            onClick={addColorStop}
            aria-label="Add color stop"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Gradient Stop Track */}
        <div className="relative h-10 mb-8 rounded-md border">
          <div
            className="absolute inset-0 rounded-md"
            style={{ background: gradient }}
          />

          {parsed.stops.map((stop, index) => (
            <div
              key={index}
              className={`absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 ${
                activeStopIndex === index
                  ? "border-2 border-white ring-2 ring-offset-2 ring-primary"
                  : ""
              }`}
              style={{
                left: `${stop.position}%`,
                top: "50%",
                backgroundColor: stop.color,
                borderRadius: "50%",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
              onClick={() => setActiveStopIndex(index)}
            />
          ))}
        </div>

        {/* Active Stop Controls */}
        {parsed.stops.length > 0 && (
          <div className="grid grid-cols-2 gap-4 p-3 border rounded-md bg-background/50">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Color</label>
              <ColorPicker
                color={parsed.stops[activeStopIndex]?.color}
                onChange={handleColorChange}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-muted-foreground">
                  Position
                </label>
                <button
                  type="button"
                  className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted text-destructive"
                  onClick={() => removeColorStop(activeStopIndex)}
                  aria-label="Remove color stop"
                  disabled={parsed.stops.length <= 2}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <Slider
                value={[parsed.stops[activeStopIndex]?.position || 0]}
                min={0}
                max={100}
                step={1}
                onValueChange={(val) =>
                  handlePositionChange(activeStopIndex, val)
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Panel component for managing text overlay styling options
 * Provides controls for typography settings (font family, alignment) and colors (text color, highlight)
 *
 * @component
 * @param {TextStylePanelProps} props - Component props
 * @returns {JSX.Element} A panel with text styling controls
 */
export const TextStylePanel: React.FC<TextStylePanelProps> = ({
  localOverlay,
  handleStyleChange,
}) => {
  const handleGradientChange = (newGradient: string) => {
    handleStyleChange("background", newGradient);
  };

  const { getFontFamilies } = useFonts();

  // Add this new function to handle applying a preset
  const handleApplyPreset = (presetStyles: Partial<TextOverlay["styles"]>) => {
    // Apply each style property individually
    Object.entries(presetStyles).forEach(([key, value]) => {
      // Skip undefined values
      if (value !== undefined) {
        handleStyleChange(key as keyof TextOverlay["styles"], value);
      }
    });
  };

  // Add this new function to handle resetting styles to default
  const handleResetStyles = () => {
    // Define default text styles
    const defaultStyles = {
      fontSize: "2rem",
      fontWeight: "400",
      color: "#FFFFFF",
      backgroundColor: "transparent",
      fontFamily: "font-sans",
      fontStyle: "normal",
      textDecoration: "none",
      lineHeight: "1.2",
      textAlign: "center",
      // Clear any special effects
      WebkitBackgroundClip: undefined,
      WebkitTextFillColor: undefined,
      background: undefined,
      textShadow: undefined,
      WebkitTextStroke: undefined,
      letterSpacing: undefined,
      textTransform: undefined,
      padding: undefined,
      borderRadius: undefined,
      boxShadow: undefined,
      backdropFilter: undefined,
      border: undefined,
    };

    // Apply each default style
    Object.entries(defaultStyles).forEach(([key, value]) => {
      handleStyleChange(key as keyof TextOverlay["styles"], value);
    });
  };

  // Add function to toggle between gradient and solid text
  const toggleTextMode = () => {
    if (localOverlay.styles.WebkitBackgroundClip) {
      // Switch from gradient to solid
      handleStyleChange("WebkitBackgroundClip", undefined);
      handleStyleChange("WebkitTextFillColor", undefined);
      handleStyleChange("background", undefined);
      handleStyleChange("color", "#FFFFFF"); // Default color
    } else {
      // Switch from solid to gradient
      handleStyleChange("WebkitBackgroundClip", "text");
      handleStyleChange("WebkitTextFillColor", "transparent");
      handleStyleChange(
        "background",
        "linear-gradient(135deg, #6366F1 0%, #EC4899 50%, #F59E0B 100%)",
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Text Style Presets */}
      <div className="space-y-4 rounded-md bg-background/50 p-4 border">
        <h3 className="text-sm font-medium">Text Style</h3>
        <TextPresetSelector
          currentStyles={localOverlay.styles}
          onSelectPreset={handleApplyPreset}
          onResetStyles={handleResetStyles}
        />
      </div>

      {/* Typography Settings */}
      <div className="space-y-4 rounded-md bg-background/50 p-4 border">
        <h3 className="text-sm font-medium">Typography</h3>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Font Family</label>
          <Select
            value={localOverlay.styles.fontFamily}
            onValueChange={(value) => handleStyleChange("fontFamily", value)}
          >
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder="Select a font" />
            </SelectTrigger>
            <SelectContent>
              {getFontFamilies().map((font) => (
                <SelectItem
                  key={font.value}
                  value={font.value}
                  className={`${font.value} text-ms`}
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Alignment</label>
            <ToggleGroup
              type="single"
              className="justify-start gap-1"
              value={localOverlay.styles.textAlign}
              onValueChange={(value) => {
                if (value) handleStyleChange("textAlign", value);
              }}
            >
              <ToggleGroupItem
                value="left"
                aria-label="Align left"
                className="h-10 w-10"
              >
                <AlignLeft className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="center"
                aria-label="Align center"
                className="h-10 w-10"
              >
                <AlignCenter className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="right"
                aria-label="Align right"
                className="h-10 w-10"
              >
                <AlignRight className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-4 rounded-md bg-background/50 p-4 border">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Colors</h3>
          <button
            type="button"
            onClick={toggleTextMode}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {localOverlay.styles.WebkitBackgroundClip
              ? "Switch to Solid"
              : "Switch to Gradient"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {!localOverlay.styles.WebkitBackgroundClip ? (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Text Color
                </label>
                <ColorPicker
                  color={localOverlay.styles.color}
                  onChange={(color) => handleStyleChange("color", color)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Highlight
                </label>
                <ColorPicker
                  color={localOverlay.styles.backgroundColor}
                  onChange={(color) =>
                    handleStyleChange("backgroundColor", color)
                  }
                />
              </div>
            </>
          ) : (
            <div className="col-span-3 space-y-2">
              <label className="text-xs text-muted-foreground">
                Gradient Colors
              </label>
              <GradientEditor
                gradient={localOverlay.styles.background || ""}
                onChange={handleGradientChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
