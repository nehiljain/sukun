import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ButtonClickOverlay } from "../../../types";
import { ColorPicker } from "@/components/ui/color-picker";
import { Settings, Wand2, Clock, Image } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconCaretUpFilled,
  IconHeart,
  IconStar,
  IconCheck,
  IconThumbUp,
  IconPlus,
  IconShoppingCart,
} from "@tabler/icons-react";
import { useFonts } from "../../../hooks/use-fonts";

interface ButtonClickDetailsProps {
  overlay: ButtonClickOverlay;
  setLocalOverlay: (overlay: ButtonClickOverlay) => void;
  changeOverlay: (id: number, overlay: ButtonClickOverlay) => void;
}

export const ButtonClickDetails: React.FC<ButtonClickDetailsProps> = ({
  overlay,
  setLocalOverlay,
  changeOverlay,
}) => {
  // Add useFonts hook
  const { getFontFamily, getFontFamilies } = useFonts();

  // Update the entire overlay
  const updateOverlay = (updates: Partial<ButtonClickOverlay>) => {
    const updatedOverlay = {
      ...overlay,
      ...updates,
    } as ButtonClickOverlay;
    setLocalOverlay(updatedOverlay);
    changeOverlay(overlay.id, updatedOverlay);
  };

  // Update button text
  const updateButtonText = (
    field: keyof ButtonClickOverlay["buttonText"],
    value: string,
  ) => {
    updateOverlay({
      buttonText: {
        ...overlay.buttonText,
        [field]: value,
      },
    });
  };

  // Update timing
  const updateTiming = (
    field: keyof ButtonClickOverlay["timing"],
    value: number,
  ) => {
    updateOverlay({
      timing: {
        ...overlay.timing,
        [field]: value,
      },
    });
  };

  // Update styles
  const updateStyles = (field: string, value: unknown) => {
    // Handle nested styles
    if (field.includes(".")) {
      const [parent, child] = field.split(".");

      if (
        parent === "beforeStyles" ||
        parent === "afterStyles" ||
        parent === "icon"
      ) {
        // Special handling for icon position to ensure type safety
        if (parent === "icon" && child === "position") {
          const position = value as "left" | "right" | "none";
          const updatedOverlay = {
            ...overlay,
            styles: {
              ...overlay.styles,
              icon: {
                ...overlay.styles.icon,
                position,
              },
            },
          };
          setLocalOverlay(updatedOverlay);
          changeOverlay(overlay.id, updatedOverlay);
          return;
        }

        const updatedOverlay = {
          ...overlay,
          styles: {
            ...overlay.styles,
            [parent]: {
              ...overlay.styles[
                parent as "beforeStyles" | "afterStyles" | "icon"
              ],
              [child]: value,
            },
          },
        };
        setLocalOverlay(updatedOverlay);
        changeOverlay(overlay.id, updatedOverlay);
      }
    } else {
      const updatedOverlay = {
        ...overlay,
        styles: {
          ...overlay.styles,
          [field]: value,
        },
      };
      setLocalOverlay(updatedOverlay);
      changeOverlay(overlay.id, updatedOverlay);
    }
  };

  // Function to render Tabler icons based on icon type
  const renderTablerIcon = (iconType: string, size: number, color: string) => {
    const iconProps = {
      size,
      color,
      stroke: 2.5,
      fill: color,
      fillOpacity: 0.2,
    };
    switch (iconType) {
      case "arrow-up":
        return <IconCaretUpFilled size={size * 1.5} color={color} />;
      case "heart":
        return <IconHeart {...iconProps} />;
      case "star":
        return <IconStar {...iconProps} />;
      case "check":
        return <IconCheck {...iconProps} />;
      case "thumb-up":
        return <IconThumbUp {...iconProps} />;
      case "plus":
        return <IconPlus {...iconProps} />;
      case "shopping-cart":
        return <IconShoppingCart {...iconProps} />;
      default:
        return null;
    }
  };

  // Calculate preview scaling based on overlay dimensions
  // Base size for reference (assuming a 500x300 overlay as reference)
  const baseOverlayWidth = 500;
  const baseOverlayHeight = 300;

  // Calculate scale factors based on current dimensions
  const widthScale =
    overlay.width && overlay.width > 0 ? overlay.width / baseOverlayWidth : 1;
  const heightScale =
    overlay.height && overlay.height > 0
      ? overlay.height / baseOverlayHeight
      : 1;
  const overallScale = Math.min(widthScale, heightScale); // Use the smaller scale to maintain aspect ratio

  // Calculate dynamic font size based on text length
  const calculateDynamicFontSize = (text: string, baseSize: number) => {
    const textLength = text.length;
    if (textLength > 20) {
      return Math.max(
        12,
        Math.round(baseSize * (20 / textLength) * overallScale),
      );
    }
    return Math.max(12, Math.round(baseSize * overallScale));
  };

  // Scale button dimensions for preview
  const baseFontSize = parseInt(overlay.styles.beforeStyles.fontSize) || 16;
  const previewText = `${overlay.buttonText.before} → ${overlay.buttonText.after}`;
  const scaledFontSize = calculateDynamicFontSize(previewText, baseFontSize);

  const baseBorderRadius = overlay.styles.beforeStyles.borderRadius;
  const scaledBorderRadius = Math.round(baseBorderRadius * overallScale);

  // Parse padding to apply scaling
  const parsePadding = (paddingStr: string) => {
    // Handle different padding formats like "10px", "10px 20px", "10px 20px 10px 20px"
    const parts = paddingStr.split(" ").map((part) => {
      const value = parseInt(part);
      return isNaN(value) ? 8 : Math.round(value * overallScale) + "px";
    });
    return parts.join(" ");
  };

  const scaledPadding = parsePadding(overlay.styles.beforeStyles.padding);

  // Calculate icon size for preview
  const baseIconSize = parseInt(overlay.styles.icon.size) || 16;
  const scaledIconSize = Math.max(10, Math.round(baseIconSize * overallScale)); // Minimum icon size of 10px

  // Calculate icon margin
  const baseIconMargin = parseInt(overlay.styles.icon.marginRight) || 8;
  const scaledIconMargin = Math.round(baseIconMargin * overallScale) + "px";

  return (
    <div className="flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Preview */}
      <div className="relative h-[160px] w-full overflow-hidden rounded-lg border border-border bg-muted/40">
        <div className="flex items-center justify-center w-full h-full">
          <div
            style={{
              backgroundColor: overlay.styles.beforeStyles.backgroundColor,
              color: overlay.styles.beforeStyles.textColor,
              padding: scaledPadding,
              borderRadius: `${scaledBorderRadius}px`,
              fontSize: `${scaledFontSize}px`,
              fontWeight: overlay.styles.beforeStyles.fontWeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: `${Math.round(8 * overallScale)}px`,
              minWidth:
                Math.round(
                  (parseInt(overlay.styles.beforeStyles.minWidth) || 120) *
                    overallScale,
                ) + "px",
              maxWidth: "80%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {overlay.styles.icon.show &&
              overlay.styles.icon.position === "left" && (
                <div style={{ marginRight: scaledIconMargin, flexShrink: 0 }}>
                  {renderTablerIcon(
                    overlay.styles.icon.type,
                    scaledIconSize,
                    overlay.styles.beforeStyles.textColor,
                  )}
                </div>
              )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {overlay.buttonText.before} → {overlay.buttonText.after}
            </span>
            {overlay.styles.icon.show &&
              overlay.styles.icon.position === "right" && (
                <div style={{ marginLeft: scaledIconMargin, flexShrink: 0 }}>
                  {renderTablerIcon(
                    overlay.styles.icon.type,
                    scaledIconSize,
                    overlay.styles.beforeStyles.textColor,
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex-1 mt-4 w-full max-w-full">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-muted/50 backdrop-blur-sm rounded-lg border">
            <TabsTrigger
              value="general"
              className="data-[state=active]:bg-background"
            >
              <span className="flex items-center gap-2 text-xs">
                <Settings className="w-3 h-3" />
                General
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="data-[state=active]:bg-background"
            >
              <span className="flex items-center gap-2 text-xs">
                <Wand2 className="w-3 h-3" />
                Style
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="timing"
              className="data-[state=active]:bg-background"
            >
              <span className="flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3" />
                Timing
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="icon"
              className="data-[state=active]:bg-background"
            >
              <span className="flex items-center gap-2 text-xs">
                <Image className="w-3 h-3" />
                Icon
              </span>
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="mt-4">
            <div className="flex flex-col gap-4">
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Button Text (Before)</Label>
                  <Input
                    value={overlay.buttonText.before}
                    onChange={(e) => updateButtonText("before", e.target.value)}
                    placeholder="Support"
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Button Text (After)</Label>
                  <Input
                    value={overlay.buttonText.after}
                    onChange={(e) => updateButtonText("after", e.target.value)}
                    placeholder="Supported"
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Theme</Label>
                  <Select
                    value={overlay.presetThemeName}
                    onValueChange={(
                      value: "productHunt" | "github" | "twitter" | "custom",
                    ) => {
                      // Define preset styles
                      const presets = {
                        productHunt: {
                          buttonText: {
                            before: "SUPPORT",
                            after: "SUPPORTED",
                          },
                          styles: {
                            beforeStyles: {
                              backgroundColor: "#f85149",
                              textColor: "#ffffff",
                              borderRadius: 8,
                              padding: "8px 16px",
                              fontSize: "18px",
                              fontWeight: "600",
                              borderWidth: "0px",
                              borderColor: "transparent",
                              borderStyle: "solid",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                              minWidth: "120px",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              transition: "all 0.2s ease",
                              hoverEffect: {
                                backgroundColor: "#e73f37",
                                textColor: "#ffffff",
                                borderColor: "transparent",
                                boxShadow: "0 4px 6px rgba(0,0,0,0.12)",
                                transform: "translateY(-2px)",
                              },
                            },
                            afterStyles: {
                              backgroundColor: "#ffffff",
                              textColor: "#f85149",
                              borderColor: "#f85149",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                            },
                            icon: {
                              show: true,
                              position: "left" as const,
                              type: "arrow-up",
                              size: "16px",
                              color: "#ffffff",
                              afterColor: "#f85149",
                              marginRight: "8px",
                            },
                            showShadow: true,
                            shadowColor: "rgba(0,0,0,0.2)",
                            showClickEffect: true,
                            clickEffectColor: "rgba(255,255,255,0.4)",
                            addDarkenOnPress: true,
                          },
                        },
                        github: {
                          buttonText: {
                            before: "Star",
                            after: "Starred",
                          },
                          styles: {
                            beforeStyles: {
                              backgroundColor: "#fafbfc",
                              textColor: "#24292e",
                              borderRadius: 6,
                              padding: "5px 16px",
                              fontSize: "14px",
                              fontWeight: "500",
                              borderWidth: "1px",
                              borderColor: "rgba(27,31,35,0.15)",
                              borderStyle: "solid",
                              boxShadow: "0 1px 0 rgba(27,31,35,0.04)",
                              minWidth: "100px",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              textTransform: "none",
                              letterSpacing: "normal",
                              transition: "all 0.2s ease",
                              hoverEffect: {
                                backgroundColor: "#f3f4f6",
                                textColor: "#24292e",
                                borderColor: "rgba(27,31,35,0.15)",
                                boxShadow: "0 1px 0 rgba(27,31,35,0.1)",
                                transform: "none",
                              },
                            },
                            afterStyles: {
                              backgroundColor: "#f3f4f6",
                              textColor: "#24292e",
                              borderColor: "rgba(27,31,35,0.15)",
                              boxShadow: "inset 0 1px 0 rgba(225,228,232,0.2)",
                            },
                            icon: {
                              show: true,
                              position: "left" as const,
                              type: "star",
                              size: "16px",
                              color: "#24292e",
                              afterColor: "#e3b341",
                              marginRight: "4px",
                            },
                            showShadow: false,
                            shadowColor: "rgba(0,0,0,0)",
                            showClickEffect: true,
                            clickEffectColor: "rgba(0,0,0,0.06)",
                            addDarkenOnPress: true,
                          },
                        },
                        twitter: {
                          buttonText: {
                            before: "Follow",
                            after: "Following",
                          },
                          styles: {
                            beforeStyles: {
                              backgroundColor: "#1d9bf0",
                              textColor: "#ffffff",
                              borderRadius: 9999,
                              padding: "6px 16px",
                              fontSize: "15px",
                              fontWeight: "600",
                              borderWidth: "1px",
                              borderColor: "#1d9bf0",
                              borderStyle: "solid",
                              boxShadow: "none",
                              minWidth: "100px",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              textTransform: "none",
                              letterSpacing: "normal",
                              transition: "background-color 0.2s ease",
                              hoverEffect: {
                                backgroundColor: "#0c7abf",
                                textColor: "#ffffff",
                                borderColor: "#0c7abf",
                                boxShadow: "none",
                                transform: "none",
                              },
                            },
                            afterStyles: {
                              backgroundColor: "#ffffff",
                              textColor: "#0f1419",
                              borderColor: "#cfd9de",
                              boxShadow: "none",
                            },
                            icon: {
                              show: false,
                              position: "none" as const,
                              type: "plus",
                              size: "14px",
                              color: "#ffffff",
                              afterColor: "#0f1419",
                              marginRight: "6px",
                            },
                            showShadow: false,
                            shadowColor: "rgba(0,0,0,0)",
                            showClickEffect: true,
                            clickEffectColor: "rgba(255,255,255,0.2)",
                            addDarkenOnPress: true,
                          },
                        },
                        custom: {
                          buttonText: {
                            before: "CLICK ME",
                            after: "CLICKED!",
                          },
                          styles: {
                            beforeStyles: {
                              backgroundColor: "#4f46e5",
                              textColor: "#ffffff",
                              borderRadius: 6,
                              padding: "10px 20px",
                              fontSize: "16px",
                              fontWeight: "600",
                              borderWidth: "0px",
                              borderColor: "transparent",
                              borderStyle: "solid",
                              boxShadow: "0 4px 6px rgba(79, 70, 229, 0.25)",
                              minWidth: "120px",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              textTransform: "none",
                              letterSpacing: "0.025em",
                              transition: "all 0.3s ease",
                              hoverEffect: {
                                backgroundColor: "#4338ca",
                                textColor: "#ffffff",
                                borderColor: "transparent",
                                boxShadow: "0 6px 10px rgba(79, 70, 229, 0.3)",
                                transform: "translateY(-2px)",
                              },
                            },
                            afterStyles: {
                              backgroundColor: "#ffffff",
                              textColor: "#4f46e5",
                              borderColor: "#4f46e5",
                              boxShadow: "0 2px 4px rgba(79, 70, 229, 0.15)",
                            },
                            icon: {
                              show: true,
                              position: "right" as const,
                              type: "check",
                              size: "16px",
                              color: "#ffffff",
                              afterColor: "#4f46e5",
                              marginRight: "0",
                            },
                            showShadow: true,
                            shadowColor: "rgba(79, 70, 229, 0.25)",
                            showClickEffect: true,
                            clickEffectColor: "rgba(255,255,255,0.4)",
                            addDarkenOnPress: true,
                          },
                        },
                      };

                      // Update overlay with the selected theme's styles and text
                      const selectedPreset = presets[value];
                      updateOverlay({
                        presetThemeName: value,
                        usePresetTheme: value !== "custom",
                        buttonText: selectedPreset.buttonText,
                        styles: selectedPreset.styles,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="productHunt">Product Hunt</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="mt-4">
            <div className="flex flex-col gap-6">
              {/* Add this new section near the top of the appearance tab */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={overlay.styles.beforeStyles.fontFamily || "font-sans"}
                  onValueChange={(value) =>
                    updateStyles(
                      "beforeStyles.fontFamily",
                      getFontFamily(value),
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFontFamilies().map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Before styles */}
              <div className="flex flex-col gap-4 pb-4 border-b">
                <h3 className="text-sm font-medium">Initial Button Style</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">Background Color</Label>
                    <ColorPicker
                      color={overlay.styles.beforeStyles.backgroundColor}
                      onChange={(color) =>
                        updateStyles("beforeStyles.backgroundColor", color)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">Text Color</Label>
                    <ColorPicker
                      color={overlay.styles.beforeStyles.textColor}
                      onChange={(color) =>
                        updateStyles("beforeStyles.textColor", color)
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Border Radius</Label>
                    <span className="text-xs text-muted-foreground">
                      {overlay.styles.beforeStyles.borderRadius}px
                    </span>
                  </div>
                  <Slider
                    value={[overlay.styles.beforeStyles.borderRadius]}
                    min={0}
                    max={50}
                    step={1}
                    onValueChange={(value) =>
                      updateStyles("beforeStyles.borderRadius", value[0])
                    }
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Font Size</Label>
                  <Input
                    value={overlay.styles.beforeStyles.fontSize}
                    onChange={(e) =>
                      updateStyles("beforeStyles.fontSize", e.target.value)
                    }
                    placeholder="16px"
                    className="w-full"
                  />
                </div>

                {/* Button Size Section */}
                <div className="flex flex-col gap-4 mt-4">
                  <h4 className="text-xs font-medium">Button Size</h4>

                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">Min Width</Label>
                    <div className="flex gap-2">
                      <Input
                        value={overlay.styles.beforeStyles.minWidth}
                        onChange={(e) =>
                          updateStyles("beforeStyles.minWidth", e.target.value)
                        }
                        placeholder="120px"
                        className="w-full"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() =>
                          updateStyles("beforeStyles.minWidth", "auto")
                        }
                      >
                        Auto
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set to "auto" for content-based width
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">Padding</Label>
                    <Input
                      value={overlay.styles.beforeStyles.padding}
                      onChange={(e) =>
                        updateStyles("beforeStyles.padding", e.target.value)
                      }
                      placeholder="8px 16px"
                      className="w-full"
                    />
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStyles("beforeStyles.padding", "4px 8px")
                        }
                      >
                        Small
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStyles("beforeStyles.padding", "8px 16px")
                        }
                      >
                        Medium
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStyles("beforeStyles.padding", "12px 24px")
                        }
                      >
                        Large
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* After styles */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-medium">
                  After-Click Button Style
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">Background Color</Label>
                    <ColorPicker
                      color={overlay.styles.afterStyles.backgroundColor}
                      onChange={(color) =>
                        updateStyles("afterStyles.backgroundColor", color)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">Text Color</Label>
                    <ColorPicker
                      color={overlay.styles.afterStyles.textColor}
                      onChange={(color) =>
                        updateStyles("afterStyles.textColor", color)
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between space-y-0 pt-2">
                  <Label htmlFor="button-invert" className="text-xs">
                    Auto-Invert Colors
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Invert the before colors and apply to after
                      updateStyles(
                        "afterStyles.backgroundColor",
                        overlay.styles.beforeStyles.textColor,
                      );
                      updateStyles(
                        "afterStyles.textColor",
                        overlay.styles.beforeStyles.backgroundColor,
                      );
                    }}
                  >
                    Invert
                  </Button>
                </div>
              </div>

              {/* Effects */}
              <div className="flex items-center justify-between space-y-0 pt-2 border-t">
                <h3 className="text-sm font-medium">Effects</h3>

                <div className="flex items-center justify-between space-y-0">
                  <Label htmlFor="show-shadow" className="text-xs">
                    Show Button Shadow
                  </Label>
                  <Switch
                    id="show-shadow"
                    checked={overlay.styles.showShadow}
                    onCheckedChange={(checked) =>
                      updateStyles("showShadow", checked)
                    }
                  />
                </div>

                {overlay.styles.showShadow && (
                  <div className="space-y-2">
                    <Label className="text-xs">Shadow Color</Label>
                    <ColorPicker
                      color={overlay.styles.shadowColor}
                      onChange={(color) => updateStyles("shadowColor", color)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between space-y-0 pt-2">
                  <Label htmlFor="show-click-effect" className="text-xs">
                    Show Click Effect
                  </Label>
                  <Switch
                    id="show-click-effect"
                    checked={overlay.styles.showClickEffect}
                    onCheckedChange={(checked) =>
                      updateStyles("showClickEffect", checked)
                    }
                  />
                </div>

                {overlay.styles.showClickEffect && (
                  <div className="space-y-2">
                    <Label className="text-xs">Click Effect Color</Label>
                    <ColorPicker
                      color={overlay.styles.clickEffectColor}
                      onChange={(color) =>
                        updateStyles("clickEffectColor", color)
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Timing Tab */}
          <TabsContent value="timing" className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Button Entry Duration</Label>
                  <span className="text-xs">
                    {(overlay.timing.buttonEntryDuration / 30).toFixed(1)}s
                  </span>
                </div>
                <Slider
                  value={[overlay.timing.buttonEntryDuration]}
                  min={15}
                  max={90}
                  step={3}
                  onValueChange={(value) =>
                    updateTiming("buttonEntryDuration", value[0])
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Cursor Movement Duration</Label>
                  <span className="text-xs">
                    {(overlay.timing.cursorMovementDuration / 30).toFixed(1)}s
                  </span>
                </div>
                <Slider
                  value={[overlay.timing.cursorMovementDuration]}
                  min={15}
                  max={90}
                  step={3}
                  onValueChange={(value) =>
                    updateTiming("cursorMovementDuration", value[0])
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Click Duration</Label>
                  <span className="text-xs">
                    {(overlay.timing.clickDuration / 30).toFixed(1)}s
                  </span>
                </div>
                <Slider
                  value={[overlay.timing.clickDuration]}
                  min={3}
                  max={30}
                  step={3}
                  onValueChange={(value) =>
                    updateTiming("clickDuration", value[0])
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">State Change Duration</Label>
                  <span className="text-xs">
                    {(overlay.timing.stateChangeDuration / 30).toFixed(1)}s
                  </span>
                </div>
                <Slider
                  value={[overlay.timing.stateChangeDuration]}
                  min={3}
                  max={45}
                  step={3}
                  onValueChange={(value) =>
                    updateTiming("stateChangeDuration", value[0])
                  }
                />
              </div>

              <div className="pt-4">
                <div className="relative w-full h-6 bg-gray-100 dark:bg-gray-800 rounded-sm overflow-hidden">
                  {/* Visual timeline representation */}
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-500/30"
                    style={{
                      width: `${(overlay.timing.buttonEntryDuration / (overlay.timing.buttonEntryDuration + overlay.timing.cursorMovementDuration + overlay.timing.clickDuration + overlay.timing.stateChangeDuration)) * 100}%`,
                    }}
                  ></div>
                  <div
                    className="absolute top-0 h-full bg-green-500/30"
                    style={{
                      left: `${(overlay.timing.buttonEntryDuration / (overlay.timing.buttonEntryDuration + overlay.timing.cursorMovementDuration + overlay.timing.clickDuration + overlay.timing.stateChangeDuration)) * 100}%`,
                      width: `${(overlay.timing.cursorMovementDuration / (overlay.timing.buttonEntryDuration + overlay.timing.cursorMovementDuration + overlay.timing.clickDuration + overlay.timing.stateChangeDuration)) * 100}%`,
                    }}
                  ></div>
                  <div
                    className="absolute top-0 h-full bg-orange-500/30"
                    style={{
                      left: `${((overlay.timing.buttonEntryDuration + overlay.timing.cursorMovementDuration) / (overlay.timing.buttonEntryDuration + overlay.timing.cursorMovementDuration + overlay.timing.clickDuration + overlay.timing.stateChangeDuration)) * 100}%`,
                      width: `${(overlay.timing.clickDuration / (overlay.timing.buttonEntryDuration + overlay.timing.cursorMovementDuration + overlay.timing.clickDuration + overlay.timing.stateChangeDuration)) * 100}%`,
                    }}
                  ></div>
                  <div
                    className="absolute top-0 h-full bg-purple-500/30"
                    style={{
                      left: `${((overlay.timing.buttonEntryDuration + overlay.timing.cursorMovementDuration + overlay.timing.clickDuration) / (overlay.timing.buttonEntryDuration + overlay.timing.cursorMovementDuration + overlay.timing.clickDuration + overlay.timing.stateChangeDuration)) * 100}%`,
                      width: `${(overlay.timing.stateChangeDuration / (overlay.timing.buttonEntryDuration + overlay.timing.cursorMovementDuration + overlay.timing.clickDuration + overlay.timing.stateChangeDuration)) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                  <span>Entry</span>
                  <span>Movement</span>
                  <span>Click</span>
                  <span>Change</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Icon Tab */}
          <TabsContent value="icon" className="mt-4">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-icon" className="text-sm">
                  Show Icon
                </Label>
                <Switch
                  id="show-icon"
                  checked={overlay.styles.icon.show}
                  onCheckedChange={(checked) =>
                    updateStyles("icon.show", checked)
                  }
                />
              </div>

              {overlay.styles.icon.show && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <Label className="text-xs">Icon Position</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={
                          overlay.styles.icon.position === "left"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => updateStyles("icon.position", "left")}
                        className="w-full"
                      >
                        Left
                      </Button>
                      <Button
                        variant={
                          overlay.styles.icon.position === "right"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => updateStyles("icon.position", "right")}
                        className="w-full"
                      >
                        Right
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Label className="text-xs">Icon Type</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        variant={
                          overlay.styles.icon.type === "arrow-up"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => updateStyles("icon.type", "arrow-up")}
                        className="flex flex-col items-center justify-center p-2 h-[64px] gap-1"
                      >
                        <IconCaretUpFilled size={24} />
                        <span className="text-[10px]">Arrow</span>
                      </Button>
                      <Button
                        variant={
                          overlay.styles.icon.type === "star"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => updateStyles("icon.type", "star")}
                        className="flex flex-col items-center justify-center p-2 h-[64px] gap-1"
                      >
                        <IconStar size={16} />
                        <span className="text-[10px]">Star</span>
                      </Button>
                      <Button
                        variant={
                          overlay.styles.icon.type === "heart"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => updateStyles("icon.type", "heart")}
                        className="flex flex-col items-center justify-center p-2 h-[64px] gap-1"
                      >
                        <IconHeart size={16} />
                        <span className="text-[10px]">Heart</span>
                      </Button>
                      <Button
                        variant={
                          overlay.styles.icon.type === "check"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => updateStyles("icon.type", "check")}
                        className="flex flex-col items-center justify-center p-2 h-[64px] gap-1"
                      >
                        <IconCheck size={16} />
                        <span className="text-[10px]">Check</span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">Before Color</Label>
                      <ColorPicker
                        color={overlay.styles.icon.color}
                        onChange={(color) => updateStyles("icon.color", color)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">After Color</Label>
                      <ColorPicker
                        color={overlay.styles.icon.afterColor}
                        onChange={(color) =>
                          updateStyles("icon.afterColor", color)
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
