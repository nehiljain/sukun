import React from "react";
import { AnimationSettingsPanel } from "./animation-settings-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { animationTemplates } from "../../templates/animation-templates";

interface AnimationSettingsTabProps {
  overlay: any; // The overlay object
  onStyleChange: (property: string, value: any) => void; // Function to update overlay styles
}

export const AnimationSettingsTab: React.FC<AnimationSettingsTabProps> = ({
  overlay,
  onStyleChange,
}) => {
  // Initialize default animation settings if none exist
  const currentAnimation = overlay.styles.animation || {
    enter: "none",
    exit: "none",
    enterDuration: 15,
    exitDuration: 15,
    enterEasing: "easeOut",
    exitEasing: "easeIn",
  };

  const handleAnimationChange = (newSettings) => {
    onStyleChange("animation", {
      ...currentAnimation,
      ...newSettings,
    });
  };

  return (
    <div className="space-y-4 rounded-md bg-gray-50/50 dark:bg-gray-800/50 p-3 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Animations
      </h3>

      <Tabs defaultValue="settings">
        <TabsList className="grid grid-cols-2 mb-4">
          {/* <TabsTrigger value="selection">Animation Selection</TabsTrigger> */}
          <TabsTrigger value="settings">Timing & Easing</TabsTrigger>
        </TabsList>

        <TabsContent value="selection" className="space-y-4">
          {/* Enter Animation Selection */}
          {/* <div className="space-y-2">
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
                isSelected={currentAnimation.enter === "none"}
                onClick={() => handleAnimationChange({ enter: "none" })}
              />
              {Object.entries(animationTemplates).map(([key, animation]) => (
                <AnimationPreview
                  key={key}
                  animationKey={key}
                  animation={animation}
                  isSelected={currentAnimation.enter === key}
                  onClick={() => handleAnimationChange({ enter: key })}
                />
              ))}
            </div>
          </div> */}

          {/* Exit Animation Selection */}
          {/* <div className="space-y-2">
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
                isSelected={currentAnimation.exit === "none"}
                onClick={() => handleAnimationChange({ exit: "none" })}
              />
              {Object.entries(animationTemplates).map(([key, animation]) => (
                <AnimationPreview
                  key={key}
                  animationKey={key}
                  animation={animation}
                  isSelected={currentAnimation.exit === key}
                  onClick={() => handleAnimationChange({ exit: key })}
                />
              ))}
            </div>
          </div> */}
        </TabsContent>

        <TabsContent value="settings">
          <AnimationSettingsPanel
            animation={currentAnimation}
            onChange={handleAnimationChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
