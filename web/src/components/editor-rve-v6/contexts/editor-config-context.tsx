import React, { createContext, useContext, ReactNode } from "react";
import {
  EditorFeatureConfig,
  defaultEditorConfig,
  OverlayPanelMap,
} from "../config/editor-config";
import { OverlayType } from "../types";

// Context for the editor configuration
interface EditorConfigContextType {
  config: EditorFeatureConfig;
  isOverlayEnabled: (overlayType: OverlayType) => boolean;
  isSettingEnabled: (overlayType: OverlayType, settingPanel: string) => boolean;
  isSettingPremium: (overlayType: OverlayType, settingPanel: string) => boolean;
  getPanelEnum: (overlayType: OverlayType) => any;
}

const EditorConfigContext = createContext<EditorConfigContextType | undefined>(
  undefined,
);

interface EditorConfigProviderProps {
  children: ReactNode;
  config?: EditorFeatureConfig;
}

export const EditorConfigProvider: React.FC<EditorConfigProviderProps> = ({
  children,
  config = defaultEditorConfig,
}) => {
  // Check if an overlay type is enabled
  const isOverlayEnabled = (overlayType: OverlayType): boolean => {
    return config.enabledOverlays.includes(overlayType);
  };

  // Check if a setting panel is enabled for an overlay type
  const isSettingEnabled = (
    overlayType: OverlayType,
    settingPanel: string,
  ): boolean => {
    const enabledSettings = config.enabledSettings[overlayType] || [];
    return enabledSettings.includes(settingPanel);
  };

  // Check if a setting panel is premium for an overlay type
  const isSettingPremium = (
    overlayType: OverlayType,
    settingPanel: string,
  ): boolean => {
    const premiumSettings = config.premiumSettings[overlayType] || [];
    return premiumSettings.includes(settingPanel);
  };

  // Get the panel enum for an overlay type
  const getPanelEnum = (overlayType: OverlayType): any => {
    return OverlayPanelMap[overlayType] || {};
  };

  return (
    <EditorConfigContext.Provider
      value={{
        config,
        isOverlayEnabled,
        isSettingEnabled,
        isSettingPremium,
        getPanelEnum,
      }}
    >
      {children}
    </EditorConfigContext.Provider>
  );
};

// Custom hook to use the editor configuration
export const useEditorConfig = (): EditorConfigContextType => {
  const context = useContext(EditorConfigContext);
  if (!context) {
    throw new Error(
      "useEditorConfig must be used within an EditorConfigProvider",
    );
  }
  return context;
};
