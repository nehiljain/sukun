import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useTimeline } from "../../../contexts/timeline-context";
import { OverlayType, ButtonClickOverlay, Overlay } from "../../../types";
import { ButtonClickDetails } from "./button-click-details";
import { MousePointer } from "lucide-react";
import {
  IconArrowUp,
  IconHeart,
  IconStar,
  IconCheck,
  IconThumbUp,
  IconPlus,
  IconShoppingCart,
} from "@tabler/icons-react";
import {
  BUTTON_CLICK_TIMING,
  calculateButtonClickDuration,
} from "../../../constants";
import { useFonts } from "../../../hooks/use-fonts";

/**
 * ButtonClickOverlayPanel component for adding and configuring button click overlays
 */
export const ButtonClickOverlayPanel: React.FC = () => {
  const {
    addOverlay,
    selectedOverlayId,
    overlays,
    durationInFrames,
    changeOverlay,
  } = useEditorContext();
  const { findNextAvailablePosition } = useTimelinePositioning();
  const { visibleRows } = useTimeline();
  const [localOverlay, setLocalOverlay] = useState<ButtonClickOverlay | null>(
    null,
  );
  const { getFontFamily } = useFonts();

  // Update local overlay when selected overlay changes or when overlays change
  React.useEffect(() => {
    if (selectedOverlayId === null) {
      return;
    }

    const selectedOverlay = overlays.find(
      (overlay) => overlay.id === selectedOverlayId,
    );

    if (selectedOverlay?.type === OverlayType.BUTTON_CLICK) {
      setLocalOverlay(selectedOverlay as ButtonClickOverlay);
    }
  }, [selectedOverlayId, overlays]);

  const handleAddButtonClick = (
    preset: "productHunt" | "github" | "twitter" | "custom" = "productHunt",
  ) => {
    // Find the next available position in the timeline
    const position = findNextAvailablePosition(
      overlays,
      visibleRows,
      durationInFrames,
    );

    // Define preset styles
    const presets = {
      productHunt: {
        usePresetTheme: true,
        presetThemeName: "productHunt" as const,
        buttonText: {
          before: "SUPPORT",
          after: "SUPPORTED",
        },
        styles: {
          beforeStyles: {
            fontFamily: getFontFamily("font-sans"),
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
        usePresetTheme: true,
        presetThemeName: "github" as const,
        buttonText: {
          before: "Star",
          after: "Starred",
        },
        styles: {
          beforeStyles: {
            fontFamily: getFontFamily("font-sans"),
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
        usePresetTheme: true,
        presetThemeName: "twitter" as const,
        buttonText: {
          before: "Follow",
          after: "Following",
        },
        styles: {
          beforeStyles: {
            fontFamily: getFontFamily("font-sans"),
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
        usePresetTheme: false,
        presetThemeName: "custom" as const,
        buttonText: {
          before: "CLICK ME",
          after: "CLICKED!",
        },
        styles: {
          beforeStyles: {
            fontFamily: getFontFamily("font-sans"),
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

    // Create a new button click overlay with a temporary ID
    const newButtonClickOverlay: Overlay = {
      id: -1, // Temporary ID, will be replaced by addOverlay
      type: OverlayType.BUTTON_CLICK,
      from: position.from,
      durationInFrames: calculateButtonClickDuration(BUTTON_CLICK_TIMING),
      width: 200,
      height: 100,
      left: 100,
      top: 100,
      row: position.row,
      rotation: 0,
      isDragging: false,
      buttonText: presets[preset].buttonText,
      timing: {
        buttonEntryDuration: BUTTON_CLICK_TIMING.ENTRY,
        cursorMovementDuration: BUTTON_CLICK_TIMING.MOVEMENT,
        clickDuration: BUTTON_CLICK_TIMING.CLICK,
        stateChangeDuration: BUTTON_CLICK_TIMING.STATE,
      },
      cursor: {
        startPosition: { x: 90, y: 90 }, // Bottom right (percentage of container)
        endPosition: { x: 50, y: 50 }, // Center (will be calculated based on button position)
        pathCurvature: 0.5, // Default curvature value
      },
      usePresetTheme: presets[preset].usePresetTheme,
      presetThemeName: presets[preset].presetThemeName,
      styles: presets[preset].styles,
    };

    // Add the overlay to the editor
    addOverlay(newButtonClickOverlay);
  };

  // Function to render Tabler icons based on icon type
  const renderTablerIcon = (
    iconType: string,
    size: number = 24,
    color: string = "currentColor",
  ) => {
    const iconProps = { size, color };
    switch (iconType) {
      case "arrow-up":
        return <IconArrowUp {...iconProps} />;
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

  return (
    <div className="p-4 h-full bg-background">
      {!localOverlay ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Add Button Click Animation</h3>
            <p className="text-sm text-muted-foreground">
              Add a button click animation with cursor movement to demonstrate
              user interactions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              className="border rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors"
              onClick={() => handleAddButtonClick("productHunt")}
            >
              <div className="w-16 h-16 rounded-md bg-red-500/50 border-2 border-red-600 mb-2 flex items-center justify-center">
                <MousePointer className="h-8 w-8 text-red-700" />
              </div>
              <span className="text-sm font-medium">Product Hunt</span>
            </div>

            <div
              className="border rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors"
              onClick={() => handleAddButtonClick("github")}
            >
              <div className="w-16 h-16 rounded-md bg-gray-200 border-2 border-gray-400 mb-2 flex items-center justify-center">
                <MousePointer className="h-8 w-8 text-gray-700" />
              </div>
              <span className="text-sm font-medium">GitHub</span>
            </div>

            <div
              className="border rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors"
              onClick={() => handleAddButtonClick("twitter")}
            >
              <div className="w-16 h-16 rounded-md bg-blue-500/50 border-2 border-blue-600 mb-2 flex items-center justify-center">
                <MousePointer className="h-8 w-8 text-blue-700" />
              </div>
              <span className="text-sm font-medium">Twitter</span>
            </div>

            <div
              className="border rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors"
              onClick={() => handleAddButtonClick("custom")}
            >
              <div className="w-16 h-16 rounded-md bg-indigo-500/50 border-2 border-indigo-600 mb-2 flex items-center justify-center">
                <MousePointer className="h-8 w-8 text-indigo-700" />
              </div>
              <span className="text-sm font-medium">Custom</span>
            </div>
          </div>

          <Button
            onClick={() => handleAddButtonClick("custom")}
            className="w-full"
          >
            Add Custom Button Click
          </Button>
        </div>
      ) : (
        <ButtonClickDetails
          overlay={localOverlay}
          setLocalOverlay={setLocalOverlay}
          changeOverlay={changeOverlay}
        />
      )}
    </div>
  );
};
