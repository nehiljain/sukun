import React from "react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AnimationTemplate,
  animationTemplates,
} from "../../templates/animation-templates";
import { EasingPreset } from "../../types";

interface AnimationSettingsPanelProps {
  animation: {
    enter?: string;
    exit?: string;
    enterDuration: number;
    exitDuration: number;
    enterEasing?: EasingPreset;
    exitEasing?: EasingPreset;
  };
  onChange: (newSettings: any) => void;
}

const easingOptions: { value: EasingPreset; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "easeIn", label: "Ease In" },
  { value: "easeOut", label: "Ease Out" },
  { value: "easeInOut", label: "Ease In-Out" },
];

export const AnimationSettingsPanel: React.FC<AnimationSettingsPanelProps> = ({
  animation,
  onChange,
}) => {
  const enterTemplate = animation.enter
    ? animationTemplates[animation.enter]
    : null;
  const exitTemplate = animation.exit
    ? animationTemplates[animation.exit]
    : null;

  // Get recommended min/max or use defaults
  const enterMinDuration = enterTemplate?.recommendedMinDuration || 5;
  const enterMaxDuration = enterTemplate?.recommendedMaxDuration || 60;
  const exitMinDuration = exitTemplate?.recommendedMinDuration || 5;
  const exitMaxDuration = exitTemplate?.recommendedMaxDuration || 60;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Enter Duration</label>
          <span className="text-xs text-gray-500">
            {animation.enterDuration} frames
          </span>
        </div>
        <Slider
          value={[animation.enterDuration]}
          min={enterMinDuration}
          max={enterMaxDuration}
          step={1}
          onValueChange={(values) =>
            onChange({ ...animation, enterDuration: values[0] })
          }
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Enter Easing</label>
        <Select
          value={animation.enterEasing || "easeOut"}
          onValueChange={(value: EasingPreset) =>
            onChange({ ...animation, enterEasing: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select easing" />
          </SelectTrigger>
          <SelectContent>
            {easingOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Exit Duration</label>
          <span className="text-xs text-gray-500">
            {animation.exitDuration} frames
          </span>
        </div>
        <Slider
          value={[animation.exitDuration]}
          min={exitMinDuration}
          max={exitMaxDuration}
          step={1}
          onValueChange={(values) =>
            onChange({ ...animation, exitDuration: values[0] })
          }
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Exit Easing</label>
        <Select
          value={animation.exitEasing || "easeIn"}
          onValueChange={(value: EasingPreset) =>
            onChange({ ...animation, exitEasing: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select easing" />
          </SelectTrigger>
          <SelectContent>
            {easingOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
