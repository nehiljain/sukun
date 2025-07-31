// Base type for all timeline items
export type BaseItem = {
  from: number;
  durationInFrames: number;
  id: string;
};

export type SolidItem = BaseItem & {
  type: "solid";
  color: string;
};

export type TextItem = BaseItem & {
  type: "text";
  text: string;
  color: string;
};

export type VideoItem = BaseItem & {
  type: "video";
  src: string;
  volume: number;
  mediaId: string;
};

export type FadeRevealItem = BaseItem & {
  type: "FadeReveal";
  text: string;
};

export type VoiceItem = BaseItem & {
  type: "voice";
  src: string;
  volume: number;
  mediaId: string;
};

export type TypewriterRevealItem = BaseItem & {
  type: "TypewriterReveal";
  text: string;
  fontSize: number;
  primaryColor: string;
  backgroundColor: string;
  containerWidth: number;
  lineHeight: number;
  fontFamily?: string;
  typingSpeed?: number;
  showCursor?: boolean;
  cursorColor?: string;
};

export type Item =
  | SolidItem
  | TextItem
  | VideoItem
  | FadeRevealItem
  | TypewriterRevealItem
  | VoiceItem;

export type Track = {
  name: string;
  items: Item[];
};

// export type Item = {
//   id: string;
//   from: number;
//   durationInFrames: number;
//   type: string;
// } & (
//     | {
//       type: "solid";
//       color: string;
//     }
//     | {
//       type: "text";
//       text: string;
//       color: string;
//       fontSize?: number;
//       fontWeight?: string;
//       textAlign?: "left" | "center" | "right";
//     }
//     | {
//       type: "video";
//       src: string;
//     }
//     | {
//       type: "voice";
//       src: string;
//       volume?: number;
//     }
//     | {
//       type: "audio";
//       src: string;
//       volume?: number;
//     }
//   );
// // Other animation types can be handled generically

export type CommentActions = {
  color?: boolean;
  trim?: boolean;
  voice?: boolean;
  script?: boolean;
};

export type Comment = {
  id: string;
  timestamp: number;
  text: string;
  color?: string;
  createdAt: string;
  actions: CommentActions;
};

export type RemotionState = {
  tracks: Track[];
  durationInFrames: number;
  fps: number;
};

export type VideoAsset = {
  id: string;
  name: string;
  video_url: string;
  thumbnail_url: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  status?: string;
  state?: RemotionState;
};
