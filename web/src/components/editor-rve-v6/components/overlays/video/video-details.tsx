/**
 * VideoDetails Component
 *
 * A component that provides a user interface for configuring video overlay settings and styles.
 * It displays a video preview along with two tabbed panels for adjusting settings and visual styles.
 *
 * Features:
 * - Video preview display
 * - Settings panel for basic video configuration
 * - Style panel for visual customization
 * - Zoom panel for configuring zoom reveal effects
 *
 * @component
 */

import React from "react";
import { ClipOverlay, OverlayType } from "../../../types";
import { PaintBucket, Settings, ZoomIn, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoStylePanel } from "./video-style-panel";
import { VideoSettingsPanel } from "./video-settings-panel";
import { VideoZoomPanel } from "./video-zoom-panel";
import { useEditorConfig } from "../../../contexts/editor-config-context";
import { VideoSettingPanel } from "../../../config/editor-config";

interface VideoDetailsProps {
  /** The current state of the video overlay */
  localOverlay: ClipOverlay;
  /** Callback function to update the video overlay state */
  setLocalOverlay: (overlay: ClipOverlay) => void;
}

/**
 * VideoDetails component for managing video overlay configuration
 *
 * @param {VideoDetailsProps} props - Component props
 * @param {ClipOverlay} props.localOverlay - Current video overlay state
 * @param {Function} props.setLocalOverlay - Function to update overlay state
 */
export const VideoDetails: React.FC<VideoDetailsProps> = ({
  localOverlay,
  setLocalOverlay,
}) => {
  const { isSettingEnabled, isSettingPremium } = useEditorConfig();

  /**
   * Updates the style properties of the video overlay
   *
   * @param {Partial<ClipOverlay["styles"]>} updates - Style properties to update
   */
  const handleStyleChange = (updates: Partial<ClipOverlay["styles"]>) => {
    const updatedOverlay = {
      ...localOverlay,
      styles: {
        ...localOverlay.styles,
        ...updates,
      },
    };
    setLocalOverlay(updatedOverlay);
  };

  // Check which tabs are available
  const settingsTabEnabled = isSettingEnabled(
    OverlayType.VIDEO,
    VideoSettingPanel.SETTINGS,
  );
  const styleTabEnabled = isSettingEnabled(
    OverlayType.VIDEO,
    VideoSettingPanel.STYLE,
  );
  const zoomTabEnabled = isSettingEnabled(
    OverlayType.VIDEO,
    VideoSettingPanel.ZOOM,
  );

  // Check which tabs are premium
  const isSettingsPremium = isSettingPremium(
    OverlayType.VIDEO,
    VideoSettingPanel.SETTINGS,
  );
  const isStylePremium = isSettingPremium(
    OverlayType.VIDEO,
    VideoSettingPanel.STYLE,
  );
  const isZoomPremium = isSettingPremium(
    OverlayType.VIDEO,
    VideoSettingPanel.ZOOM,
  );

  // Determine default tab
  let defaultTab = VideoSettingPanel.SETTINGS;
  if (!settingsTabEnabled) {
    if (styleTabEnabled) defaultTab = VideoSettingPanel.STYLE;
    else if (zoomTabEnabled) defaultTab = VideoSettingPanel.ZOOM;
  }

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="relative aspect-[16/7] w-full overflow-hidden rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-100/40 dark:bg-black/40">
        <img
          src={localOverlay.content}
          alt="Video preview"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-sm border border-gray-200 dark:border-gray-700 gap-1">
          {settingsTabEnabled && (
            <TabsTrigger
              value={VideoSettingPanel.SETTINGS}
              className={`data-[state=active]:bg-blue-500/20 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white
                rounded-sm transition-all duration-200 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50
                ${isSettingsPremium ? "opacity-60" : ""}`}
              disabled={isSettingsPremium}
            >
              <span className="flex items-center gap-2 text-xs">
                <Settings className="w-3 h-3" />
                Settings
                {isSettingsPremium && (
                  <Zap className="w-3 h-3 text-yellow-500" />
                )}
              </span>
            </TabsTrigger>
          )}

          {styleTabEnabled && (
            <TabsTrigger
              value={VideoSettingPanel.STYLE}
              className={`data-[state=active]:bg-blue-500/20 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white
                rounded-sm transition-all duration-200 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50
                ${isStylePremium ? "opacity-60" : ""}`}
              disabled={isStylePremium}
            >
              <span className="flex items-center gap-2 text-xs">
                <PaintBucket className="w-3 h-3" />
                Style
                {isStylePremium && <Zap className="w-3 h-3 text-yellow-500" />}
              </span>
            </TabsTrigger>
          )}

          {zoomTabEnabled && (
            <TabsTrigger
              value={VideoSettingPanel.ZOOM}
              className={`data-[state=active]:bg-blue-500/20 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white
                rounded-sm transition-all duration-200 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50
                ${isZoomPremium ? "opacity-60" : ""}`}
              disabled={isZoomPremium}
            >
              <span className="flex items-center gap-2 text-xs">
                <ZoomIn className="w-3 h-3" />
                Zoom
                {isZoomPremium && <Zap className="w-3 h-3 text-yellow-500" />}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        {styleTabEnabled && (
          <TabsContent
            value={VideoSettingPanel.STYLE}
            className="space-y-4 mt-4 h-auto"
          >
            {isStylePremium ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                <Zap className="w-8 h-8 text-yellow-500 mb-2" />
                <h3 className="text-base font-medium">Premium Feature</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Upgrade to access advanced styling options for your videos
                </p>
              </div>
            ) : (
              <VideoStylePanel
                localOverlay={localOverlay}
                handleStyleChange={handleStyleChange}
              />
            )}
          </TabsContent>
        )}

        {settingsTabEnabled && (
          <TabsContent
            value={VideoSettingPanel.SETTINGS}
            className="space-y-4 mt-4"
          >
            {isSettingsPremium ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                <Zap className="w-8 h-8 text-yellow-500 mb-2" />
                <h3 className="text-base font-medium">Premium Feature</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Upgrade to access video settings options
                </p>
              </div>
            ) : (
              <VideoSettingsPanel
                localOverlay={localOverlay}
                handleStyleChange={handleStyleChange}
              />
            )}
          </TabsContent>
        )}

        {zoomTabEnabled && (
          <TabsContent
            value={VideoSettingPanel.ZOOM}
            className="space-y-4 mt-4"
          >
            {isZoomPremium ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                <Zap className="w-8 h-8 text-yellow-500 mb-2" />
                <h3 className="text-base font-medium">Premium Feature</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Upgrade to access advanced zoom effects for your videos
                </p>
              </div>
            ) : (
              <VideoZoomPanel
                localOverlay={localOverlay}
                setLocalOverlay={setLocalOverlay}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
