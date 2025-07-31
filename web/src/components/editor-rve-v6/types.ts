// Define overlay types enum
export enum OverlayType {
  TEXT = "text",
  VIDEO = "video",
  SOUND = "sound",
  CAPTION = "caption",
  IMAGE = "image",
  RECTANGLE = "rectangle",
  WEBCAM = "webcam",
  BUTTON_CLICK = "button_click",
}

// Define video effect types enum
export enum VideoEffectType {
  NONE = "none",
  ZOOM_REVEAL = "zoom_reveal",
}

// Base overlay properties
type BaseOverlay = {
  id: number;
  durationInFrames: number;
  from: number;
  height: number;
  row: number;
  left: number;
  top: number;
  width: number;
  isDragging: boolean;
  rotation: number;
  type: OverlayType;
};

// Base style properties
type BaseStyles = {
  opacity?: number;
  zIndex?: number;
  transform?: string;
};

// Base animation type
export interface AnimationConfig {
  enter?: string;
  exit?: string;
  enterDuration?: number;
  exitDuration?: number;
  enterEasing?: EasingPreset;
  exitEasing?: EasingPreset;
}

export type EasingPreset = "linear" | "easeIn" | "easeOut" | "easeInOut";

// Text overlay specific
export type TextOverlay = BaseOverlay & {
  type: OverlayType.TEXT;
  content: string;
  styles: BaseStyles & {
    fontSize: string;
    fontWeight: string;
    color: string;
    backgroundColor: string;
    fontFamily: string;
    fontStyle: string;
    textDecoration: string;
    lineHeight?: string;
    letterSpacing?: string;
    textAlign?: "left" | "center" | "right";
    textShadow?: string;
    padding?: string;
    borderRadius?: string;
    boxShadow?: string;
    background?: string;
    WebkitBackgroundClip?: string;
    WebkitTextFillColor?: string;
    backdropFilter?: string;
    border?: string;
    animation?: AnimationConfig;
  };
};

// Shape overlay specific
export type ShapeOverlay = BaseOverlay & {
  type: OverlayType.RECTANGLE;
  content: string;
  styles: BaseStyles & {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    borderRadius?: string;
    boxShadow?: string;
    gradient?: string;
    animation?: AnimationConfig;
  };
};

// Clip overlay specific
export type ClipOverlay = BaseOverlay & {
  type: OverlayType.VIDEO;
  content: string;
  src: string;
  mediaId?: string;
  videoStartTime?: number;
  videoEffect?: {
    type: VideoEffectType;
    config: ZoomRevealConfig | null;
  };
  styles: BaseStyles & {
    objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
    objectPosition?: string;
    volume?: number;
    borderRadius?: string;
    filter?: string;
    boxShadow?: string;
    border?: string;
    gradientBorder?: string;
    borderWidth?: string;
    animation?: AnimationConfig; // Using shared type
  };
};

// Sound overlay specific
export type SoundOverlay = BaseOverlay & {
  type: OverlayType.SOUND;
  content: string;
  src: string;
  mediaId?: string;
  startFromSound?: number;
  styles: BaseStyles & {
    volume?: number;
  };
};

export type CaptionWord = {
  word: string;
  startMs: number;
  endMs: number;
  confidence: number;
};

export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
  words: CaptionWord[];
};

// Update CaptionOverlay to include styling for highlighted words
export interface CaptionStyles {
  fontFamily: string;
  fontSize: string;
  lineHeight: number;
  textAlign: "left" | "center" | "right";
  color: string;
  backgroundColor?: string;
  background?: string;
  backdropFilter?: string;
  padding?: string;
  fontWeight?: number | string;
  letterSpacing?: string;
  textShadow?: string;
  borderRadius?: string;
  transition?: string;
  highlightStyle?: {
    backgroundColor?: string;
    color?: string;
    scale?: number;
    fontWeight?: number;
    textShadow?: string;
    padding?: string;
    borderRadius?: string;
    transition?: string;
    background?: string;
    border?: string;
    backdropFilter?: string;
  };
}

export interface CaptionOverlay extends BaseOverlay {
  type: OverlayType.CAPTION;
  captions: Caption[];
  styles?: CaptionStyles;
  template?: string;
}

// Add ZoomRevealConfig type
export type ZoomRevealConfig = {
  zoomConfigs: ZoomConfig[];
  showZoomIndicator?: boolean;
};

export type ZoomConfig = {
  startFrame: number;
  endFrame: number;
  // Starting position and dimensions
  startX: number;
  startY: number;
  startScale: number;
  // Hold position (where the zoom pauses)
  holdX: number;
  holdY: number;
  holdScale: number;
  // Ending position and dimensions
  endX: number;
  endY: number;
  endScale: number;
  // Easing configuration
  easingConfig: {
    p1x: number;
    p1y: number;
    p2x: number;
    p2y: number;
  };
};

// Rectangle overlay specific
export type RectangleOverlay = BaseOverlay & {
  type: OverlayType.RECTANGLE;
  styles: BaseStyles & {
    // Basic rectangle properties
    fill: string;
    fillOpacity: number;
    stroke: string;
    strokeWidth: number;
    strokeOpacity: number;
    borderRadius: number;

    // Animation properties
    animation?: {
      enter: string;
      exit: string;
      draw?: {
        enabled: boolean;
        duration: number; // in frames
        direction: "clockwise" | "counterclockwise";
      };
    };
  };
};

// Button click overlay specific
export type ButtonClickOverlay = BaseOverlay & {
  type: OverlayType.BUTTON_CLICK;
  // Button text configuration
  buttonText: {
    before: string;
    after: string;
  };
  // Animation timing (in frames, assuming 30fps)
  timing: {
    buttonEntryDuration: number; // Default: 45 frames (1.5s)
    cursorMovementDuration: number; // Default: 30 frames (1s)
    clickDuration: number; // Default: 15 frames (0.5s)
    stateChangeDuration: number; // Default: 15 frames (0.5s)
  };
  // Cursor positioning
  cursor: {
    startPosition: { x: number; y: number }; // Default: bottom right
    endPosition: { x: number; y: number }; // Calculated based on button position
    pathCurvature: number; // Controls the arc of the cursor path (0-1)
  };
  // Use a preset theme or custom styling
  usePresetTheme: boolean;
  presetThemeName: "productHunt" | "github" | "twitter" | "custom";
  styles: {
    // Button styles before click
    beforeStyles: {
      backgroundColor: string;
      textColor: string;
      borderRadius: number;
      padding: string;
      fontSize: string;
      fontFamily: string;
      fontWeight: string;
      borderWidth: string;
      borderColor: string;
      borderStyle: string;
      boxShadow: string;
      minWidth: string;
      display: string;
      justifyContent: string;
      alignItems: string;
      textTransform: string;
      letterSpacing: string;
      transition: string;
      hoverEffect: {
        backgroundColor: string;
        textColor: string;
        borderColor: string;
        boxShadow: string;
        transform: string;
      };
    };
    // Button styles after click
    afterStyles: {
      backgroundColor: string;
      textColor: string;
      borderColor: string;
      boxShadow: string;
      // Any properties not specified here will default to the beforeStyles values
    };
    // Icon options (optional)
    icon: {
      show: boolean;
      position: "left" | "right" | "none";
      type: string; // Tabler icon name (e.g., 'arrow-up', 'heart', 'star', etc.)
      size: string;
      color: string;
      afterColor: string;
      marginRight: string;
    };
    // Optional effects
    showShadow: boolean;
    shadowColor: string;
    showClickEffect: boolean;
    clickEffectColor: string;
    addDarkenOnPress: boolean;
  };
};

export type Overlay =
  | TextOverlay
  | ImageOverlay
  | ShapeOverlay
  | ClipOverlay
  | SoundOverlay
  | CaptionOverlay
  | FloatingTextOverlay
  | RectangleOverlay
  | ButtonClickOverlay;

export type MainProps = {
  readonly overlays: Overlay[];
  readonly setSelectedOverlay: React.Dispatch<
    React.SetStateAction<number | null>
  >;
  readonly selectedOverlay: number | null;
  readonly changeOverlay: (
    overlayId: number,
    updater: (overlay: Overlay) => Overlay,
  ) => void;
};

import { z } from "zod";

// Base interface for all timeline items
interface TimelineItem {
  id: string;
  start: number;
  duration: number;
  row: number;
}

// Clip specific properties
export interface Video extends TimelineItem {
  type: OverlayType.VIDEO;
  src: string;
  videoStartTime?: number;
}

// Sound specific properties
export interface Sound extends TimelineItem {
  type: OverlayType.SOUND;
  file: string;
  content: string;
  startFromSound: number;
}

// Base interface for layers
interface Layer extends TimelineItem {
  position: { x: number; y: number };
}

// Text layer specific properties
export interface TextLayer extends Layer {
  type: OverlayType.TEXT;
  text: string;
  fontSize: number;
  fontColor: string;
  fontFamily: string;
  backgroundColor: string;
}

// Shape layer specific properties
export interface ShapeLayer extends Layer {
  type: OverlayType.RECTANGLE;
  shapeType: "rectangle" | "circle" | "triangle";
  color: string;
  size: { width: number; height: number };
}

// Image layer specific properties
export interface ImageLayer extends Layer {
  type: OverlayType.IMAGE;
  src: string;
  size: { width: number; height: number };
}

// Union type for all possible layers
export type LayerItem = TextLayer | ShapeLayer | ImageLayer;

// Union type for all timeline items
export type TimelineItemUnion = Video | Sound | LayerItem;

// Type for the selected item in the editor
export type SelectedItem = TimelineItemUnion | null;

// Zod schema for composition props

export const CompositionProps = z.object({
  overlays: z.array(z.any()), // Replace with your actual Overlay type
  durationInFrames: z.number(),
  width: z.number(),
  height: z.number(),
  fps: z.number(),
  src: z.string(),
});

// Other types remain the same
export const RenderRequest = z.object({
  id: z.string(),
  inputProps: CompositionProps,
});

export const ProgressRequest = z.object({
  bucketName: z.string(),
  id: z.string(),
});

export type ProgressResponse =
  | { type: "error"; message: string }
  | { type: "progress"; progress: number }
  | { type: "done"; url: string; size: number };

// Additional types
export interface PexelsMedia {
  id: string;
  duration?: number;
  image?: string;
  video_files?: { link: string }[];
}

export interface PexelsAudio {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  duration: number;
}

export interface LocalSound {
  id: string;
  title: string;
  artist: string;
  file: string;
  duration: number;
}

export type LocalClip = {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  videoUrl: string;
};

export type AspectRatio = "16:9" | "1:1" | "4:5" | "9:16";

export interface TimelineRow {
  id: number;
  index: number;
}

export interface WaveformData {
  peaks: number[];
  length: number;
}

// Update EditorContextType
export interface EditorContextType {
  // ... existing context properties ...
  rows: TimelineRow[];
  addRow: () => void;
}

// Update ImageStyles interface to match ClipOverlay style pattern
export interface ImageStyles extends BaseStyles {
  filter?: string;
  borderRadius?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  objectPosition?: string;
  boxShadow?: string;
  border?: string;
  animation?: AnimationConfig;
}

// Update ImageOverlay to match ClipOverlay pattern
export interface ImageOverlay extends BaseOverlay {
  type: OverlayType.IMAGE;
  src: string;
  mediaId?: string;
  content?: string; // Optional thumbnail/preview
  styles: ImageStyles;
}

// Floating Text overlay specific
export type FloatingTextOverlay = BaseOverlay & {
  type: OverlayType.TEXT;
  content: string;
  styles: BaseStyles & {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    fontFamily?: string;
    fontStyle?: string;
    textDecoration?: string;
    lineHeight?: string;
    letterSpacing?: string;
    textAlign?: "left" | "center" | "right";
    textShadow?: string;
    padding?: string;
    borderRadius?: string;
    boxShadow?: string;
    background?: string;
    border?: string;
    borderGradient?: string | false;
    WebkitBackgroundClip?: string;
    WebkitTextFillColor?: string;
  };
};

// Update your OverlayStyles interface
export interface OverlayStyles {
  // ... existing styles
  animation?: AnimationConfig;
  // ... other styles
}
