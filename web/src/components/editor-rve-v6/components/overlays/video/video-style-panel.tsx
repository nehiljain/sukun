import React, { useState } from "react";
import { ClipOverlay } from "../../../types";
import { IconPencilCog, IconCirclePlus } from "@tabler/icons-react";

/**
 * Props for the VideoStylePanel component
 * @interface VideoStylePanelProps
 * @property {ClipOverlay} localOverlay - The current overlay object containing video styles
 * @property {Function} handleStyleChange - Callback function to update overlay styles
 */
interface VideoStylePanelProps {
  localOverlay: ClipOverlay;
  handleStyleChange: (updates: Partial<ClipOverlay["styles"]>) => void;
}

/**
 * VideoStylePanel Component
 *
 * A panel that provides controls for styling video overlays. It allows users to adjust:
 * - Object fit (cover, contain, fill)
 * - Border radius
 * - Brightness
 * - Border (in sub-panel)
 *
 * The component uses a local overlay state and propagates changes through the handleStyleChange callback.
 * All style controls maintain both light and dark theme compatibility.
 *
 * @component
 * @param {VideoStylePanelProps} props - Component props
 * @returns {JSX.Element} A styled form containing video appearance controls
 */
export const VideoStylePanel: React.FC<VideoStylePanelProps> = ({
  localOverlay,
  handleStyleChange,
}) => {
  // State to track which panel is currently active
  const [activePanel, setActivePanel] = useState<"main" | "border">("main");

  // Border state
  const [borderWidth, setBorderWidth] = useState<number>(() => {
    // Try to get width from either border or borderWidth
    const borderMatch = localOverlay?.styles?.border?.match(/(\d+)px/);
    const widthMatch = localOverlay?.styles?.borderWidth?.match(/(\d+)px/);
    return borderMatch
      ? parseInt(borderMatch[1])
      : widthMatch
        ? parseInt(widthMatch[1])
        : 0;
  });

  const [borderColor, setBorderColor] = useState<string>(() => {
    const colorMatch = localOverlay?.styles?.border?.match(
      /#[0-9a-f]{3,8}|rgba?\([^)]+\)/i,
    );
    return colorMatch ? colorMatch[0] : "#000000";
  });

  // Gradient border state
  const [isGradient, setIsGradient] = useState<boolean>(
    !!localOverlay?.styles?.gradientBorder,
  );
  const [gradientColor1, setGradientColor1] = useState<string>(() => {
    // Try to extract first color from gradient or use default
    const match = localOverlay?.styles?.gradientBorder?.match(
      /(#[0-9a-f]{3,8}|rgba?\([^)]+\))/i,
    );
    return match ? match[0] : "#FF0000";
  });
  const [gradientColor2, setGradientColor2] = useState<string>(() => {
    // Try to extract second color from gradient or use default
    const matches = localOverlay?.styles?.gradientBorder?.match(
      /(#[0-9a-f]{3,8}|rgba?\([^)]+\))/gi,
    );
    return matches && matches.length > 1 ? matches[1] : "#FFD700";
  });
  const [gradientAngle, setGradientAngle] = useState<number>(() => {
    const angleMatch = localOverlay?.styles?.gradientBorder?.match(/(\d+)deg/);
    return angleMatch ? parseInt(angleMatch[1]) : 45;
  });
  const [gradientType, setGradientType] = useState<string>(() => {
    return localOverlay?.styles?.gradientBorder?.includes("radial")
      ? "radial"
      : "linear";
  });

  // Update border style based on current settings
  const updateBorder = () => {
    if (isGradient) {
      // Apply gradient border
      const gradientString =
        gradientType === "radial"
          ? `radial-gradient(circle at center, ${gradientColor1}, ${gradientColor2})`
          : `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})`;

      handleStyleChange({
        gradientBorder: gradientString,
        borderWidth: `${borderWidth}px`,
        border: "none",
      });
    } else {
      // Apply solid border
      handleStyleChange({
        border:
          borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none",
        gradientBorder: undefined,
        borderWidth: undefined,
      });
    }
  };

  // Render the main panel with basic controls
  const renderMainPanel = () => (
    <div className="space-y-4 rounded-md bg-gray-900 p-4 border border-gray-800">
      <h3 className="text-lg font-medium text-gray-100">Appearance</h3>

      {/* Border Radius */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Rounded Corners</label>
          <span className="text-sm text-gray-300 min-w-[40px] text-right">
            {localOverlay?.styles?.borderRadius ?? "0px"}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="50"
          value={parseInt(localOverlay?.styles?.borderRadius ?? "0")}
          onChange={(e) =>
            handleStyleChange({ borderRadius: `${e.target.value}px` })
          }
          className="w-full accent-blue-500 h-1.5 rounded-md bg-gray-700"
        />
      </div>

      {/* Border Button */}
      <div className="py-2">
        <button
          onClick={() => setActivePanel("border")}
          className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-md border border-gray-700 text-gray-200 hover:bg-gray-700 transition-colors ${
            (localOverlay?.styles?.border &&
              localOverlay.styles.border !== "none") ||
            localOverlay?.styles?.gradientBorder
              ? "bg-blue-900/30"
              : "bg-gray-800"
          }`}
        >
          {(localOverlay?.styles?.border &&
            localOverlay.styles.border !== "none") ||
          localOverlay?.styles?.gradientBorder ? (
            <IconPencilCog size={20} stroke={1.5} className="flex-shrink-0" />
          ) : (
            <IconCirclePlus size={20} stroke={1.5} className="flex-shrink-0" />
          )}
          <span className="text-sm font-medium">Border</span>
          {((localOverlay?.styles?.border &&
            localOverlay.styles.border !== "none") ||
            localOverlay?.styles?.gradientBorder) && (
            <span className="ml-1 w-2 h-2 rounded-full bg-blue-400"></span>
          )}
        </button>
      </div>

      {/* Fit */}
      <div className="space-y-2">
        <label className="text-sm text-gray-300">Fit</label>
        <select
          value={localOverlay?.styles?.objectFit ?? "cover"}
          onChange={(e) =>
            handleStyleChange({ objectFit: e.target.value as any })
          }
          className="w-full bg-gray-800 border border-gray-700 rounded-md text-sm p-2 hover:border-gray-600 transition-colors text-gray-200"
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </div>

      {/* Brightness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Brightness</label>
          <span className="text-sm text-gray-300 min-w-[40px] text-right">
            {parseInt(
              localOverlay?.styles?.filter?.match(
                /brightness\((\d+)%\)/,
              )?.[1] ?? "100",
            )}
            %
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="200"
          step="10"
          value={parseInt(
            localOverlay?.styles?.filter?.match(/brightness\((\d+)%\)/)?.[1] ??
              "100",
          )}
          onChange={(e) => {
            const currentFilter = localOverlay?.styles?.filter || "";
            const newFilter =
              currentFilter.replace(/brightness\(\d+%\)/, "") +
              ` brightness(${e.target.value}%)`;
            handleStyleChange({ filter: newFilter.trim() });
          }}
          className="w-full accent-blue-500 h-1.5 rounded-md bg-gray-700"
        />
      </div>
    </div>
  );

  // Render the simplified border settings panel
  const renderBorderPanel = () => (
    <div className="space-y-4 rounded-md bg-gray-900 p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setActivePanel("main")}
          className="flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
          aria-label="Back to main settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <h3 className="text-lg font-medium text-gray-100">Border Settings</h3>
      </div>

      {/* Border Width - Common for both solid and gradient */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Width</label>
          <span className="text-sm text-gray-300 min-w-[40px] text-right">
            {borderWidth}px
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="20"
          step="1"
          value={borderWidth}
          onChange={(e) => {
            setBorderWidth(parseInt(e.target.value));
            // Update border with new width
            setTimeout(updateBorder, 0);
          }}
          className="w-full accent-blue-500 h-1.5 rounded-md bg-gray-700"
        />
      </div>

      {/* Border Type Selector */}
      <div className="mt-4 mb-2">
        <div className="flex bg-gray-800 rounded-md p-1">
          <button
            onClick={() => {
              setIsGradient(false);
              setTimeout(updateBorder, 0);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              !isGradient
                ? "bg-blue-900/50 text-blue-100"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Solid
          </button>
          <button
            onClick={() => {
              setIsGradient(true);
              setTimeout(updateBorder, 0);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              isGradient
                ? "bg-blue-900/50 text-blue-100"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Gradient
          </button>
        </div>
      </div>

      {/* Conditional Border Settings */}
      {!isGradient ? (
        // Solid Border Settings
        <div className="space-y-3">
          <label className="text-sm text-gray-300">Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={borderColor}
              onChange={(e) => {
                setBorderColor(e.target.value);
                setTimeout(() => {
                  updateBorder();
                }, 0);
              }}
              className="w-10 h-10 rounded-md border border-gray-700 cursor-pointer"
            />
            <div
              className="flex-1 h-10 rounded-md border border-gray-700"
              style={{ backgroundColor: borderColor }}
            />
          </div>
        </div>
      ) : (
        // Gradient Border Settings
        <div className="space-y-3">
          {/* Gradient Type */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300 w-20">Type</label>
            <select
              value={gradientType}
              onChange={(e) => {
                setGradientType(e.target.value);
                setTimeout(updateBorder, 0);
              }}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-md text-sm p-2 hover:border-gray-600 transition-colors text-gray-200"
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
          </div>

          {/* Gradient Colors */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Colors</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={gradientColor1}
                onChange={(e) => {
                  setGradientColor1(e.target.value);
                  setTimeout(updateBorder, 0);
                }}
                className="w-10 h-10 rounded-md border border-gray-700 cursor-pointer"
                title="Start color"
              />
              <div className="text-gray-400 text-sm">to</div>
              <input
                type="color"
                value={gradientColor2}
                onChange={(e) => {
                  setGradientColor2(e.target.value);
                  setTimeout(updateBorder, 0);
                }}
                className="w-10 h-10 rounded-md border border-gray-700 cursor-pointer"
                title="End color"
              />
              <div
                className="flex-1 h-10 rounded-md border border-gray-700"
                style={{
                  background:
                    gradientType === "linear"
                      ? `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})`
                      : `radial-gradient(circle at center, ${gradientColor1}, ${gradientColor2})`,
                }}
              />
            </div>
          </div>

          {/* Gradient Angle - Only show for linear gradient */}
          {gradientType === "linear" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Angle</label>
                <span className="text-sm text-gray-300">{gradientAngle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={gradientAngle}
                onChange={(e) => {
                  setGradientAngle(parseInt(e.target.value));
                  setTimeout(updateBorder, 0);
                }}
                className="w-full accent-blue-500 h-1.5 rounded-md bg-gray-700"
              />
            </div>
          )}

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Presets</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setGradientColor1("#FF0000");
                  setGradientColor2("#FFD700");
                  setGradientAngle(45);
                  setGradientType("linear");
                  setTimeout(updateBorder, 0);
                }}
                className="p-2 bg-gradient-to-tr from-red-500 to-yellow-400 rounded-md"
                title="Red to Gold"
              />
              <button
                onClick={() => {
                  setGradientColor1("#FF00FF");
                  setGradientColor2("#00FFFF");
                  setGradientAngle(135);
                  setGradientType("linear");
                  setTimeout(updateBorder, 0);
                }}
                className="p-2 bg-gradient-to-bl from-fuchsia-500 to-cyan-400 rounded-md"
                title="Neon"
              />
              <button
                onClick={() => {
                  setGradientColor1("#4B0082");
                  setGradientColor2("#FF1493");
                  setGradientAngle(90);
                  setGradientType("linear");
                  setTimeout(updateBorder, 0);
                }}
                className="p-2 bg-gradient-to-b from-indigo-900 to-pink-500 rounded-md"
                title="Deep Purple to Pink"
              />
              <button
                onClick={() => {
                  setGradientColor1("#000000");
                  setGradientColor2("#FF4500");
                  setGradientType("radial");
                  setTimeout(updateBorder, 0);
                }}
                className="p-2 bg-radial from-black to-orange-600 rounded-md"
                title="Dark Radial"
              />
            </div>
          </div>
        </div>
      )}

      {/* Remove Border Button */}
      <div className="pt-4">
        <button
          onClick={() => {
            setBorderWidth(0);
            handleStyleChange({
              border: "none",
              gradientBorder: undefined,
              borderWidth: undefined,
            });
          }}
          className="w-full py-2 text-sm bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
        >
          Remove Border
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {activePanel === "main" && renderMainPanel()}
      {activePanel === "border" && renderBorderPanel()}
    </div>
  );
};

// Helper function to convert hex to rgb
const hexToRgb = (hex: string): string => {
  // Remove the hash
  hex = hex.replace(/^#/, "");

  // Parse the hex values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `${r},${g},${b}`;
};
