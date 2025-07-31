import React from "react";
import { ClipOverlay } from "../../../types";
import { AnimationPreview } from "../../shared/animation-preview";
import { animationTemplates } from "../../../templates/animation-templates";
import { AnimationSettingsTab } from "../../panel/animation-settings-tab";

/**
 * Props for the VideoSettingsPanel component
 * @interface VideoSettingsPanelProps
 * @property {ClipOverlay} localOverlay - The current overlay object containing video settings and styles
 * @property {Function} handleStyleChange - Callback function to update overlay styles
 */
interface VideoSettingsPanelProps {
  localOverlay: ClipOverlay;
  handleStyleChange: (updates: Partial<ClipOverlay["styles"]>) => void;
}

/**
 * VideoSettingsPanel Component
 *
 * A panel that provides controls for configuring video overlay settings including:
 * - Volume control with mute/unmute functionality
 * - Enter/Exit animation selection
 *
 * The component uses a local overlay state and provides a UI for users to modify
 * video-specific settings. Changes are propagated through the handleStyleChange callback.
 *
 * @component
 * @param {VideoSettingsPanelProps} props - Component props
 * @returns {JSX.Element} The rendered settings panel
 */
export const VideoSettingsPanel: React.FC<VideoSettingsPanelProps> = ({
  localOverlay,
  handleStyleChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Volume Settings */}
      <div className="space-y-4 rounded-md bg-gray-100/50 dark:bg-gray-800/50 p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Volume
          </h3>
          <button
            onClick={() =>
              handleStyleChange({
                volume: localOverlay?.styles?.volume === 0 ? 1 : 0,
              })
            }
            className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${
              (localOverlay?.styles?.volume ?? 1) === 0
                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30"
                : "bg-gray-200/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {(localOverlay?.styles?.volume ?? 1) === 0 ? "Unmute" : "Mute"}
          </button>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={localOverlay?.styles?.volume ?? 1}
            onChange={(e) =>
              handleStyleChange({ volume: parseFloat(e.target.value) })
            }
            className="flex-1 accent-blue-500 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px] text-right">
            {Math.round((localOverlay?.styles?.volume ?? 1) * 100)}%
          </span>
        </div>
      </div>

      <div className="space-y-4 rounded-md bg-gray-100/50 dark:bg-gray-800/50 p-3 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Animations
        </h3>

        {/* Enter Animation */}
        <div className="space-y-2">
          <label className="text-xs text-gray-600 dark:text-gray-400">
            Enter Animation
          </label>
          <div className="grid grid-cols-4 gap-2">
            <AnimationPreview
              animationKey="none"
              animation={{
                name: "None",
                preview: "No animation",
                enter: () => ({}),
                exit: () => ({}),
              }}
              isSelected={localOverlay?.styles?.animation?.enter === "none"}
              onClick={() =>
                handleStyleChange({
                  animation: {
                    ...localOverlay?.styles?.animation,
                    enter: "none",
                  },
                })
              }
            />
            {Object.entries(animationTemplates).map(([key, animation]) => (
              <AnimationPreview
                key={key}
                animationKey={key}
                animation={animation}
                isSelected={localOverlay?.styles?.animation?.enter === key}
                onClick={() =>
                  handleStyleChange({
                    animation: {
                      ...localOverlay?.styles?.animation,
                      enter: key,
                    },
                  })
                }
              />
            ))}
          </div>
        </div>

        {/* Exit Animation */}
        <div className="space-y-2">
          <label className="text-xs text-gray-600 dark:text-gray-400">
            Exit Animation
          </label>
          <div className="grid grid-cols-4 gap-2">
            <AnimationPreview
              animationKey="none"
              animation={{
                name: "None",
                preview: "No animation",
                enter: () => ({}),
                exit: () => ({}),
              }}
              isSelected={localOverlay?.styles?.animation?.exit === "none"}
              onClick={() =>
                handleStyleChange({
                  animation: {
                    ...localOverlay?.styles?.animation,
                    exit: "none",
                  },
                })
              }
            />
            {Object.entries(animationTemplates).map(([key, animation]) => (
              <AnimationPreview
                key={key}
                animationKey={key}
                animation={animation}
                isSelected={localOverlay?.styles?.animation?.exit === key}
                onClick={() =>
                  handleStyleChange({
                    animation: {
                      ...localOverlay?.styles?.animation,
                      exit: key,
                    },
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
        onStyleChange={(property, value) => {
          handleStyleChange({
            [property]: value,
          });
        }}
      />
    </div>
  );
};
