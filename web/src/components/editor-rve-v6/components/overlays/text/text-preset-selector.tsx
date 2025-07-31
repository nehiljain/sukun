import React from "react";
import { TextOverlay } from "../../../types";
import { textOverlayTemplates } from "../../../templates/text-overlay-templates";
import { cn } from "@/lib/utils";
import { TimerResetIcon } from "lucide-react";

interface TextPresetSelectorProps {
  currentStyles: TextOverlay["styles"];
  onSelectPreset: (presetStyles: Partial<TextOverlay["styles"]>) => void;
  onResetStyles: () => void;
}

/**
 * Helper function to determine if current styles match a preset
 */
const matchesPresetStyle = (
  currentStyles: TextOverlay["styles"],
  presetStyles: Partial<TextOverlay["styles"]>,
): boolean => {
  // Check key properties that define the visual identity of the preset
  const keyProperties: (keyof TextOverlay["styles"])[] = [
    "fontFamily",
    "fontWeight",
    "color",
    "WebkitBackgroundClip",
    "background",
    "WebkitTextStroke",
    "textShadow",
  ];

  // Count how many properties match
  let matchCount = 0;
  let totalProperties = 0;

  keyProperties.forEach((prop) => {
    if (presetStyles[prop] !== undefined) {
      totalProperties++;
      if (currentStyles[prop] === presetStyles[prop]) {
        matchCount++;
      }
    }
  });

  // Consider it a match if at least 70% of properties match
  return totalProperties > 0 && matchCount / totalProperties >= 0.7;
};

export const TextPresetSelector: React.FC<TextPresetSelectorProps> = ({
  currentStyles,
  onSelectPreset,
  onResetStyles,
}) => {
  // Find if any preset is currently active
  const activePreset = Object.entries(textOverlayTemplates).find(
    ([_, preset]) => matchesPresetStyle(currentStyles, preset.styles),
  );

  return (
    <div className="space-y-3">
      <label className="text-xs text-muted-foreground">Preset style</label>
      <div className="flex space-x-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {/* Reset styles button */}
        <button
          type="button"
          className={cn(
            "flex-shrink-0 w-12 h-12 rounded-md border flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-colors",
            !activePreset && "bg-accent/50 ring-2 ring-primary",
          )}
          onClick={onResetStyles}
          aria-label="Reset text styles"
        >
          <TimerResetIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">Reset</span>
        </button>

        {/* Preset styles */}
        {Object.entries(textOverlayTemplates).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            className={cn(
              "flex-shrink-0 min-w-12 h-12 rounded-md border border-border overflow-hidden relative",
              activePreset?.[0] === key && "ring-2 ring-primary bg-accent/30",
            )}
            onClick={() => onSelectPreset(preset.styles)}
            aria-label={`${preset.name} text style`}
          >
            {/* Mini preview of the style */}
            <div className="h-full w-full flex items-center justify-center px-2">
              <div
                className="text-sm truncate max-w-full"
                style={{
                  background: preset.styles.WebkitBackgroundClip
                    ? preset.styles.background
                    : preset.styles.backgroundColor || "transparent",
                  color: preset.styles.WebkitBackgroundClip
                    ? "transparent"
                    : preset.styles.color || "#FFFFFF",
                  fontFamily: preset.styles.fontFamily,
                  fontWeight: preset.styles.fontWeight || 400,
                  WebkitBackgroundClip: preset.styles.WebkitBackgroundClip,
                  WebkitTextFillColor: preset.styles.WebkitTextFillColor,
                  textShadow: preset.styles.textShadow,
                  WebkitTextStroke: preset.styles.WebkitTextStroke,
                  letterSpacing: preset.styles.letterSpacing,
                  textTransform: preset.styles.textTransform,
                }}
              >
                {preset.preview || "Aa"}
              </div>
            </div>

            {/* Premium badge for pro features */}
            {preset.isPro && (
              <div className="absolute top-0 right-0 bg-gradient-to-bl from-amber-400 to-amber-600 text-[7px] px-1 text-black font-bold rounded-bl-md">
                PRO
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
