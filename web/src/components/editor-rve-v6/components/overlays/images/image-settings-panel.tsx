import React from "react";
import { ImageOverlay } from "../../../types";
import { AnimationPreview } from "../../shared/animation-preview";
import { animationTemplates } from "../../../templates/animation-templates";
import { AnimationSettingsTab } from "../../panel/animation-settings-tab";

/**
 * Props for the ImageSettingsPanel component
 */
interface ImageSettingsPanelProps {
  /** The current state of the image overlay being edited */
  localOverlay: ImageOverlay;
  /** Callback to update the overlay's style properties */
  handleStyleChange: (updates: Partial<ImageOverlay["styles"]>) => void;
}

/**
 * ImageSettingsPanel Component
 *
 * A panel that allows users to configure animation settings for an image overlay.
 * Provides options to set both enter and exit animations from a predefined set
 * of animation templates.
 *
 * Features:
 * - Enter animation selection
 * - Exit animation selection
 * - Option to remove animations ("None" selection)
 */
export const ImageSettingsPanel: React.FC<ImageSettingsPanelProps> = ({
  localOverlay,
  handleStyleChange,
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-md bg-muted/50 p-4 border border-border">
        <h3 className="text-sm font-medium text-foreground">Animations</h3>

        {/* Enter Animation */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
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
              isSelected={!localOverlay.styles.animation?.enter}
              onClick={() =>
                handleStyleChange({
                  animation: {
                    ...localOverlay.styles.animation,
                    enter: undefined,
                  },
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
                  handleStyleChange({
                    animation: {
                      ...localOverlay.styles.animation,
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
          <label className="text-xs text-muted-foreground">
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
              isSelected={!localOverlay.styles.animation?.exit}
              onClick={() =>
                handleStyleChange({
                  animation: {
                    ...localOverlay.styles.animation,
                    exit: undefined,
                  },
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
                  handleStyleChange({
                    animation: {
                      ...localOverlay.styles.animation,
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
