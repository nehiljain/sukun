import React from "react";
import { Label } from "@/components/ui/label";
import { TextOverlay } from "../../../types";
import { AnimationPreview } from "../../shared/animation-preview";
import { animationTemplates } from "../../../templates/animation-templates";
import { AnimationSettingsTab } from "../../panel/animation-settings-tab";

/**
 * Props for the TextSettingsPanel component
 * @interface TextSettingsPanelProps
 * @property {TextOverlay} localOverlay - The current text overlay object containing styles and animation settings
 * @property {Function} handleStyleChange - Callback function to handle style changes for the text overlay
 */
interface TextSettingsPanelProps {
  localOverlay: TextOverlay;
  handleStyleChange: (field: keyof TextOverlay["styles"], value: any) => void;
}

/**
 * Panel component for managing text overlay animation settings
 * Allows users to select enter and exit animations for text overlays
 *
 * @component
 * @param {TextSettingsPanelProps} props - Component props
 * @returns {JSX.Element} A panel with animation selection options
 */
export const TextSettingsPanel: React.FC<TextSettingsPanelProps> = ({
  localOverlay,
  handleStyleChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Text Styling Options */}
      <div className="space-y-4 rounded-md bg-gray-50/50 dark:bg-gray-800/50 p-3 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Animations
        </h3>

        {/* Enter Animation */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-500 dark:text-gray-400">
            Enter Animation
          </Label>
          <div className="grid grid-cols-4 gap-2">
            <AnimationPreview
              animationKey="none"
              animation={{
                name: "None",
                preview: "No animation",
                enter: () => ({}),
                exit: () => ({}),
              }}
              isSelected={localOverlay.styles.animation?.enter === "none"}
              onClick={() =>
                handleStyleChange("animation", {
                  ...localOverlay.styles.animation,
                  enter: "none",
                })
              }
            />
            {Object.entries(animationTemplates).map(([key, animation]) => (
              <AnimationPreview
                key={key}
                animationKey={key}
                animation={animation}
                isSelected={localOverlay.styles.animation?.enter === key}
                onClick={() =>
                  handleStyleChange("animation", {
                    ...localOverlay.styles.animation,
                    enter: key,
                  })
                }
              />
            ))}
          </div>
        </div>

        {/* Exit Animation */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-500 dark:text-gray-400">
            Exit Animation
          </Label>
          <div className="grid grid-cols-4 gap-2">
            <AnimationPreview
              animationKey="none"
              animation={{
                name: "None",
                preview: "No animation",
                enter: () => ({}),
                exit: () => ({}),
              }}
              isSelected={localOverlay.styles.animation?.exit === "none"}
              onClick={() =>
                handleStyleChange("animation", {
                  ...localOverlay.styles.animation,
                  exit: "none",
                })
              }
            />
            {Object.entries(animationTemplates).map(([key, animation]) => (
              <AnimationPreview
                key={key}
                animationKey={key}
                animation={animation}
                isSelected={localOverlay.styles.animation?.exit === key}
                onClick={() =>
                  handleStyleChange("animation", {
                    ...localOverlay.styles.animation,
                    exit: key,
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Animation Settings Tab */}
      <AnimationSettingsTab
        overlay={localOverlay}
        onStyleChange={handleStyleChange}
      />
    </div>
  );
};
