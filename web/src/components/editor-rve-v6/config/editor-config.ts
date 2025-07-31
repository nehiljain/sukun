import { OverlayType } from "../types";

/**
 * Configuration for editor features
 */

// Define all possible settings panels for each overlay type
export enum VideoSettingPanel {
  SETTINGS = "settings",
  STYLE = "style",
  ZOOM = "zoom",
}

export enum TextSettingPanel {
  CONTENT = "content",
  STYLE = "style",
  ANIMATION = "animation",
}

export enum AudioSettingPanel {
  SETTINGS = "settings",
  WAVEFORM = "waveform",
  EFFECTS = "effects",
}

export enum CaptionSettingPanel {
  CONTENT = "content",
  STYLE = "style",
  TIMING = "timing",
}

export enum ImageSettingPanel {
  SETTINGS = "settings",
  STYLE = "style",
  FILTERS = "filters",
}

export enum RectangleSettingPanel {
  SHAPE = "shape",
  STYLE = "style",
  ANIMATION = "animation",
}

export enum WebcamSettingPanel {
  SETTINGS = "settings",
  STYLE = "style",
  EFFECTS = "effects",
}

// Map overlay types to their setting panels
export const OverlayPanelMap = {
  [OverlayType.VIDEO]: VideoSettingPanel,
  [OverlayType.TEXT]: TextSettingPanel,
  [OverlayType.SOUND]: AudioSettingPanel,
  [OverlayType.CAPTION]: CaptionSettingPanel,
  [OverlayType.IMAGE]: ImageSettingPanel,
  [OverlayType.RECTANGLE]: RectangleSettingPanel,
  [OverlayType.WEBCAM]: WebcamSettingPanel,
};

// Interface for the editor configuration
export interface EditorFeatureConfig {
  // Which overlay types should be available in the sidebar
  enabledOverlays: OverlayType[];

  // Which settings panels should be available for each overlay type
  enabledSettings: {
    [key in OverlayType]?: string[];
  };

  // Which settings panels should be shown as premium features
  premiumSettings: {
    [key in OverlayType]?: string[];
  };
}

// Default configuration with all features enabled
export const defaultEditorConfig: EditorFeatureConfig = {
  enabledOverlays: Object.values(OverlayType),
  enabledSettings: {
    [OverlayType.VIDEO]: Object.values(VideoSettingPanel),
    [OverlayType.TEXT]: Object.values(TextSettingPanel),
    [OverlayType.SOUND]: Object.values(AudioSettingPanel),
    [OverlayType.CAPTION]: Object.values(CaptionSettingPanel),
    [OverlayType.IMAGE]: Object.values(ImageSettingPanel),
    [OverlayType.RECTANGLE]: Object.values(RectangleSettingPanel),
    [OverlayType.WEBCAM]: Object.values(WebcamSettingPanel),
  },
  premiumSettings: {},
};

// Example restricted configuration
export const basicEditorConfig: EditorFeatureConfig = {
  enabledOverlays: [
    OverlayType.VIDEO,
    OverlayType.TEXT,
    OverlayType.SOUND,
    OverlayType.IMAGE,
  ],
  enabledSettings: {
    [OverlayType.VIDEO]: [VideoSettingPanel.SETTINGS, VideoSettingPanel.STYLE],
    [OverlayType.TEXT]: [TextSettingPanel.CONTENT, TextSettingPanel.STYLE],
    [OverlayType.SOUND]: [AudioSettingPanel.SETTINGS],
    [OverlayType.IMAGE]: [ImageSettingPanel.SETTINGS, ImageSettingPanel.STYLE],
  },
  premiumSettings: {
    [OverlayType.VIDEO]: [VideoSettingPanel.ZOOM],
    [OverlayType.TEXT]: [TextSettingPanel.ANIMATION],
    [OverlayType.SOUND]: [
      AudioSettingPanel.EFFECTS,
      AudioSettingPanel.WAVEFORM,
    ],
    [OverlayType.IMAGE]: [ImageSettingPanel.FILTERS],
  },
};
